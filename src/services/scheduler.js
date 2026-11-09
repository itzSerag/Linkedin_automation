import cron from 'node-cron';
import { loadConfig, saveConfig, loadIdeas, saveIdeas, loadPosts, savePosts } from '../config.js';
import { generatePostWithGemini } from './gemini.js';
import { generateVisualCard } from './visualCard.js';
import { uploadImageToCloudinary } from './cloudinary.js';
import { publishLinkedInPost, getLinkedInStatus } from './linkedin.js';
import { notifyPostPublished, sendTelegramMessage } from './telegram.js';

let cronTask = null;

export async function executePostPipeline({
  isManual = false,
  topicOverride = null,
  languageOverride = null,
  forcePublish = false
} = {}) {
  const config = loadConfig();
  const profile = config.profile || {};
  const automation = config.automation || {};
  const ideas = loadIdeas();

  // 1. Determine Language
  let targetLang = 'EN';
  if (automation.languageMode === 'EN') {
    targetLang = 'EN';
  } else if (automation.languageMode === 'AR') {
    targetLang = 'AR';
  } else {
    // Alternate mode
    targetLang = languageOverride || automation.nextLanguage || 'EN';
  }

  // 2. Pick Topic
  let selectedIdea = null;
  let topic = topicOverride;

  if (!topic) {
    // Find next pending idea matching target language
    selectedIdea = ideas.find(i => i.status === 'pending' && i.language === targetLang) ||
                   (automation.languageMode === 'alternate' ? ideas.find(i => i.status === 'pending') : null);

    if (selectedIdea) {
      topic = selectedIdea.topic;
      if (automation.languageMode === 'alternate') {
        targetLang = selectedIdea.language || targetLang;
      }
    } else {
      // Fallback topic if ideas are empty
      topic = targetLang === 'AR'
        ? 'أهمية معالجة Concurrency و Race Conditions في قواعد البيانات وأنظمة الـ Backend'
        : 'Designing High-Throughput REST APIs: Lessons from Database Connection Pooling and Caching';
    }
  }

  // Notify Telegram that publishing is starting
  if (automation.notifyTelegram) {
    await sendTelegramMessage(`⚙️ <b>LinkedIn Automation Active</b>\nGenerating daily technical post on:\n<i>"${topic}"</i> (${targetLang === 'AR' ? '🇸🇦 Arabic' : '🇬🇧 English'})`);
  }

  // 3. Generate Post Content with Gemini
  console.log(`[Pipeline] Generating post for topic: "${topic}" (${targetLang})`);
  const draft = await generatePostWithGemini({
    topic,
    language: targetLang,
    level: profile.yearsOfExperience || 'Mid'
  });

  // 4. Generate Visual Card
  console.log('[Pipeline] Generating technical visual card...');
  const cardData = draft.visualCard || {};
  const cardBuffer = await generateVisualCard({
    type: cardData.type || 'takeaways',
    title: cardData.title || topic,
    codeSnippet: cardData.codeSnippet || '',
    language: cardData.language || 'typescript',
    takeaways: cardData.takeaways || [],
    authorName: profile.name || 'Software Engineer',
    authorRole: profile.currentRole || 'Backend & Fullstack',
    isArabic: targetLang === 'AR'
  });

  // 5. Upload to Cloudinary
  console.log('[Pipeline] Uploading card to Cloudinary...');
  const uploadResult = await uploadImageToCloudinary(cardBuffer, `post_${Date.now()}`);
  const mediaUrl = uploadResult.secure_url || uploadResult.url;

  // 6. Publish to LinkedIn
  const linkedinStatus = getLinkedInStatus();
  let publishResult = null;

  if (linkedinStatus.isConnected && (forcePublish || automation.enabled || isManual)) {
    console.log('[Pipeline] Publishing to LinkedIn...');
    publishResult = await publishLinkedInPost({
      text: draft.postText,
      imageBuffer: cardBuffer,
      firstCommentText: automation.autoPostFirstComment ? draft.firstCommentText : null
    });
  } else {
    publishResult = {
      success: false,
      isMock: true,
      postUrl: 'https://www.linkedin.com (Saved as Draft - Connect LinkedIn in Dashboard to publish live)',
      message: 'LinkedIn account not connected yet'
    };
  }

  // 7. Save Post Record
  const newPostRecord = {
    id: `post_${Date.now()}`,
    topic,
    language: targetLang,
    hook: draft.hook,
    postText: draft.postText,
    firstCommentText: draft.firstCommentText,
    mediaUrl,
    isLocalMedia: uploadResult.isLocal || false,
    cardType: cardData.type || 'takeaways',
    publishedToLinkedIn: publishResult.success || false,
    postUrn: publishResult.postUrn || null,
    postUrl: publishResult.postUrl || null,
    firstCommentStatus: publishResult.firstCommentStatus || null,
    metrics: { impressions: 0, reactions: 0, comments: 0 },
    createdAt: new Date().toISOString()
  };

  const pastPosts = loadPosts();
  pastPosts.unshift(newPostRecord);
  savePosts(pastPosts);

  // 8. Update Idea Status
  if (selectedIdea) {
    selectedIdea.status = 'used';
    selectedIdea.usedAt = new Date().toISOString();
    saveIdeas(ideas);
  }

  // 9. Alternate next language in config
  if (automation.languageMode === 'alternate') {
    config.automation.nextLanguage = targetLang === 'AR' ? 'EN' : 'AR';
    saveConfig(config);
  }

  // 10. Send Telegram Alert with Live Link and Image
  if (automation.notifyTelegram && publishResult.success) {
    await notifyPostPublished({
      post: newPostRecord,
      postUrl: publishResult.postUrl,
      imageUrl: mediaUrl,
      firstCommentText: draft.firstCommentText
    });
  }

  console.log('[Pipeline] Completed successfully!');
  return {
    success: true,
    post: newPostRecord,
    publishResult
  };
}

export function initScheduler() {
  const config = loadConfig();
  const automation = config.automation || {};

  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }

  if (!automation.enabled) {
    console.log('[Scheduler] Automation is currently disabled in config.json');
    return { active: false, schedule: automation.cronSchedule };
  }

  const schedule = automation.cronSchedule || '0 10 * * *';
  console.log(`[Scheduler] Initializing cron job: "${schedule}" (${automation.timezone || 'Africa/Cairo'})`);

  cronTask = cron.schedule(
    schedule,
    async () => {
      console.log('[Scheduler] Triggering scheduled daily LinkedIn post...');
      try {
        await executePostPipeline({ isManual: false, forcePublish: true });
      } catch (err) {
        console.error('[Scheduler] Error during scheduled execution:', err);
      }
    },
    {
      timezone: automation.timezone || 'Africa/Cairo'
    }
  );

  return { active: true, schedule };
}
