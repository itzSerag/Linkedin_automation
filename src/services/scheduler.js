import { loadConfig, saveConfig, loadIdeas, saveIdeas, loadPosts, savePosts } from '../config.js';
import { generatePostWithGemini } from './gemini.js';
import { generateVisualCard } from './visualCard.js';
import { uploadImageToCloudinary } from './cloudinary.js';
import { publishLinkedInPost, getLinkedInStatus } from './linkedin.js';
import { notifyPostPublished, sendTelegramMessage } from './telegram.js';

let isPipelineRunning = false;

export async function executePostPipeline({
  isManual = false,
  topicOverride = null,
  languageOverride = null,
  forcePublish = false
} = {}) {
  if (isPipelineRunning) {
    console.warn('[Pipeline] Attempted to run pipeline while another run is active. Rejected duplicate process.');
    return {
      success: false,
      isDuplicate: true,
      message: 'A post generation or publishing pipeline is already active. Please wait for it to finish.'
    };
  }

  const config = loadConfig();
  const profile = config.profile || {};
  const automation = config.automation || {};

  if (!isManual && !forcePublish && !automation.enabled) {
    return {
      success: true,
      skipped: true,
      message: 'Scheduled publishing is disabled in Settings.'
    };
  }

  if (!isManual && !getLinkedInStatus().isConnected) {
    return {
      success: true,
      skipped: true,
      message: 'Scheduled publishing is paused because LinkedIn is not connected.'
    };
  }

  // Check if already published today (idempotency guard against duplicate daily jobs)
  if (!forcePublish) {
    const pastPosts = loadPosts();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: automation.timezone || 'Africa/Cairo' }).format(new Date());
    const alreadyPublishedToday = pastPosts.some(p => {
      if (!p.publishedToLinkedIn || !p.createdAt) return false;
      const postDate = new Intl.DateTimeFormat('en-CA', { timeZone: automation.timezone || 'Africa/Cairo' }).format(new Date(p.createdAt));
      return postDate === todayStr;
    });

    if (alreadyPublishedToday) {
      console.log(`[Pipeline] A post has already been published today (${todayStr}). Skipping execution to prevent duplicate posts.`);
      return {
        success: true,
        skipped: true,
        message: `A post was already published today (${todayStr}). Skipping duplicate run.`
      };
    }
  }

  isPipelineRunning = true;
  try {
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
      selectedIdea = ideas.find(i => i.status === 'pending' && i.language === targetLang) ||
                     (automation.languageMode === 'alternate' ? ideas.find(i => i.status === 'pending') : null);

      if (selectedIdea) {
        topic = selectedIdea.topic;
        if (automation.languageMode === 'alternate') {
          targetLang = selectedIdea.language || targetLang;
        }
      } else {
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

    if (!draft || typeof draft.postText !== 'string' || !draft.postText.trim()) {
      throw new Error('The AI provider returned an empty post. Nothing was published.');
    }

    if (draft.isMock) {
      throw new Error(draft.warning || 'The AI provider returned a fallback preview. Nothing was published.');
    }

    // 4. Generate Visual Card
    console.log('[Pipeline] Generating technical visual card...');
    const cardData = draft.visualCard || {};
    const cardBuffer = await generateVisualCard({
      style: config.style?.visualStyle && config.style.visualStyle !== 'auto'
        ? config.style.visualStyle
        : cardData.style || null,
      type: cardData.type || 'takeaways',
      theme: config.style?.visualTheme && config.style.visualTheme !== 'auto'
        ? config.style.visualTheme
        : cardData.theme || null,
      title: cardData.title || topic,
      subtitle: cardData.subtitle || '',
      codeSnippet: cardData.codeSnippet || '',
      language: cardData.language || 'typescript',
      takeaways: cardData.takeaways || [],
      comparison: cardData.comparison || null,
      authorName: profile.name || 'Serag',
      authorRole: profile.currentRole || 'Backend & Fullstack Software Engineer',
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
    if (!savePosts(pastPosts)) {
      throw new Error('LinkedIn publishing finished, but the post history could not be saved. Check data/posts.json before running the pipeline again.');
    }

    // 8. Update Idea Status
    if (selectedIdea) {
      selectedIdea.status = 'used';
      selectedIdea.usedAt = new Date().toISOString();
      if (!saveIdeas(ideas)) {
        console.error('[Pipeline] Published post was saved, but the idea status could not be updated.');
      }
    }

    // 9. Alternate next language in config
    if (automation.languageMode === 'alternate') {
      config.automation.nextLanguage = targetLang === 'AR' ? 'EN' : 'AR';
      if (!saveConfig(config)) {
        console.error('[Pipeline] Published post was saved, but the next-language setting could not be updated.');
      }
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
  } finally {
    isPipelineRunning = false;
  }
}

/**
 * Directly publishes an existing reviewed preview draft without running duplicate generation.
 */
export async function publishExistingDraft(draft) {
  if (!draft || typeof draft.postText !== 'string' || !draft.postText.trim()) {
    throw new Error('A non-empty post is required before publishing.');
  }
  if (draft.isMock) {
    throw new Error(draft.warning || 'This is a fallback preview and cannot be published.');
  }

  if (isPipelineRunning) {
    console.warn('[Pipeline] Attempted to publish draft while another run is active. Rejected duplicate process.');
    return {
      success: false,
      isDuplicate: true,
      message: 'A post pipeline is currently executing. Please wait.'
    };
  }

  isPipelineRunning = true;
  try {
    const config = loadConfig();
    const automation = config.automation || {};
    const linkedinStatus = getLinkedInStatus();

    console.log(`[Pipeline] Publishing existing preview draft: "${draft.topic}"...`);

    let publishResult = null;
    if (linkedinStatus.isConnected) {
      publishResult = await publishLinkedInPost({
        text: draft.postText,
        imageUrl: draft.mediaUrl,
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

    const newPostRecord = {
      id: `post_${Date.now()}`,
      topic: draft.topic,
      language: draft.language || 'EN',
      hook: draft.hook || draft.postText.slice(0, 80),
      postText: draft.postText,
      firstCommentText: draft.firstCommentText || '',
      mediaUrl: draft.mediaUrl || null,
      isLocalMedia: false,
      cardType: draft.cardType || 'benchmark',
      publishedToLinkedIn: publishResult.success || false,
      postUrn: publishResult.postUrn || null,
      postUrl: publishResult.postUrl || null,
      firstCommentStatus: publishResult.firstCommentStatus || null,
      metrics: { impressions: 0, reactions: 0, comments: 0 },
      createdAt: new Date().toISOString()
    };

    const pastPosts = loadPosts();
    pastPosts.unshift(newPostRecord);
    if (!savePosts(pastPosts)) {
      throw new Error('LinkedIn publishing finished, but the post history could not be saved. Check data/posts.json before running the pipeline again.');
    }

    // Mark matching idea as used
    const ideas = loadIdeas();
    const matchingIdea = ideas.find(i => i.topic.trim().toLowerCase() === draft.topic.trim().toLowerCase() && i.status === 'pending');
    if (matchingIdea) {
      matchingIdea.status = 'used';
      matchingIdea.usedAt = new Date().toISOString();
      if (!saveIdeas(ideas)) {
        console.error('[Pipeline] Published draft was saved, but the matching idea status could not be updated.');
      }
    }

    // Send Telegram alert
    if (automation.notifyTelegram && publishResult.success) {
      await notifyPostPublished({
        post: newPostRecord,
        postUrl: publishResult.postUrl,
        imageUrl: draft.mediaUrl,
        firstCommentText: draft.firstCommentText
      });
    }

    return {
      success: true,
      post: newPostRecord,
      publishResult
    };
  } finally {
    isPipelineRunning = false;
  }
}
