import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  loadConfig,
  saveConfig,
  loadEnv,
  updateEnv,
  loadIdeas,
  saveIdeas,
  loadPosts,
  savePosts,
  loadInspiration,
  rootDir
} from './config.js';
import {
  getLinkedInAuthUrl,
  exchangeOAuthCode,
  getLinkedInStatus
} from './services/linkedin.js';
import {
  testGeminiConnection,
  testOpenAIConnection,
  generatePostWithAI,
  generateIdeasWithAI
} from './services/gemini.js';
import { testCloudinaryConnection, uploadImageToCloudinary } from './services/cloudinary.js';
import { generateVisualCard } from './services/visualCard.js';
import { testTelegramConnection } from './services/telegram.js';
import { executePostPipeline, publishExistingDraft } from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const env = loadEnv();
const PORT = env.PORT || 3000;

function parseCsvRows(csvContent) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i += 1) {
    const char = csvContent[i];

    if (inQuotes) {
      if (char === '"' && csvContent[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
      if (char === '\r' && csvContent[i + 1] === '\n') i += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new Error('CSV contains an unclosed quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(value => value.trim())) rows.push(row);
  }

  return rows;
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Always serve uploaded and generated media statically
app.use('/media', express.static(path.join(__dirname, 'public', 'media')));

// Serve the built React app when present. The older public UI is intentionally not a fallback.
const distPath = path.join(rootDir, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.get('/', (req, res) => {
    res.status(503).send('React frontend is not built. Run `npm run dev` for local development or `npm run build` before starting the server.');
  });
}

// 1. System Status
app.get('/api/status', (req, res) => {
  const currentEnv = loadEnv();
  const config = loadConfig();
  const linkedinStatus = getLinkedInStatus();
  const ideas = loadIdeas();
  const posts = loadPosts();

  res.json({
    linkedin: linkedinStatus,
    ai: {
      provider: config.ai?.provider || 'gemini',
      geminiModel: config.ai?.geminiModel || 'gemini-3.8-flash',
      openaiModel: config.ai?.openaiModel || 'gpt-4o',
      isGeminiConfigured: Boolean(currentEnv.GEMINI_API_KEY),
      isOpenAIConfigured: Boolean(currentEnv.OPENAI_API_KEY)
    },
    cloudinary: {
      isConfigured: Boolean(currentEnv.CLOUDINARY_CLOUD_NAME && currentEnv.CLOUDINARY_API_KEY && currentEnv.CLOUDINARY_API_SECRET),
      cloudName: currentEnv.CLOUDINARY_CLOUD_NAME || null
    },
    telegram: {
      isConfigured: Boolean(currentEnv.TELEGRAM_BOT_TOKEN && currentEnv.TELEGRAM_CHAT_ID),
      hasChatId: Boolean(currentEnv.TELEGRAM_CHAT_ID)
    },
    automation: config.automation || {},
    stats: {
      pendingIdeas: ideas.filter(i => i.status === 'pending').length,
      totalIdeas: ideas.length,
      publishedPosts: posts.filter(p => p.publishedToLinkedIn).length,
      totalDrafts: posts.length
    }
  });
});

// 2. Config & Profile
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  const currentEnv = loadEnv();

  res.json({
    config,
    env: {
      LINKEDIN_CLIENT_ID: currentEnv.LINKEDIN_CLIENT_ID,
      LINKEDIN_REDIRECT_URI: currentEnv.LINKEDIN_REDIRECT_URI,
      GEMINI_API_KEY: currentEnv.GEMINI_API_KEY ? '••••••••' + currentEnv.GEMINI_API_KEY.slice(-4) : '',
      OPENAI_API_KEY: currentEnv.OPENAI_API_KEY ? '••••••••' + currentEnv.OPENAI_API_KEY.slice(-4) : '',
      CLOUDINARY_CLOUD_NAME: currentEnv.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: currentEnv.CLOUDINARY_API_KEY ? '••••••••' + currentEnv.CLOUDINARY_API_KEY.slice(-4) : '',
      TELEGRAM_BOT_TOKEN: currentEnv.TELEGRAM_BOT_TOKEN ? '••••••••' + currentEnv.TELEGRAM_BOT_TOKEN.slice(-4) : '',
      TELEGRAM_CHAT_ID: currentEnv.TELEGRAM_CHAT_ID
    }
  });
});

app.post('/api/config', (req, res) => {
  const { profile, ai, automation, style, envUpdates } = req.body;
  const currentConfig = loadConfig();

  if (style?.customSystemPrompt !== undefined && (typeof style.customSystemPrompt !== 'string' || style.customSystemPrompt.length > 12000)) {
    return res.status(400).json({ error: 'Custom post prompt must be text no longer than 12,000 characters.' });
  }
  if (style?.visualStyle !== undefined && !['auto', 'paper', 'painted', 'blueprint', 'brutalist', 'terminal'].includes(style.visualStyle)) {
    return res.status(400).json({ error: 'Unsupported visual card style.' });
  }
  if (style?.visualTheme !== undefined && !['auto', 'indigo', 'emerald', 'violet', 'amber', 'cyan'].includes(style.visualTheme)) {
    return res.status(400).json({ error: 'Unsupported visual card accent.' });
  }

  if (profile) currentConfig.profile = { ...currentConfig.profile, ...profile };
  if (ai) currentConfig.ai = { ...currentConfig.ai, ...ai };
  if (automation) {
    currentConfig.automation = { ...currentConfig.automation, ...automation };
    if (automation.languageMode === 'EN') {
      currentConfig.automation.nextLanguage = 'EN';
    } else if (automation.languageMode === 'AR') {
      currentConfig.automation.nextLanguage = 'AR';
    }
  }
  if (style) currentConfig.style = { ...currentConfig.style, ...style };

  if (!saveConfig(currentConfig)) {
    return res.status(500).json({ error: 'Could not save config.json. Your settings were not applied.' });
  }

  if (envUpdates && typeof envUpdates === 'object') {
    const cleanUpdates = {};
    for (const [k, v] of Object.entries(envUpdates)) {
      if (typeof v === 'string' && v && !v.includes('••••')) {
        cleanUpdates[k] = v;
      }
    }
    if (Object.keys(cleanUpdates).length > 0) {
      if (!updateEnv(cleanUpdates)) {
        return res.status(500).json({ error: 'Settings were saved, but environment values could not be written to .env.' });
      }
    }
  }

  res.json({ success: true, message: 'Settings updated successfully!', config: currentConfig });
});

// 3. Ideas Management
app.get('/api/ideas', (req, res) => {
  res.json(loadIdeas());
});

app.post('/api/ideas', (req, res) => {
  const { topic, category, level, language } = req.body;
  if (typeof topic !== 'string' || !topic.trim()) return res.status(400).json({ error: 'Topic is required' });

  const ideas = loadIdeas();
  const newIdea = {
    id: `idea-${Date.now()}`,
    topic: topic.trim(),
    category: category || 'Engineering',
    level: level || 'Mid',
    language: language || 'EN',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  ideas.unshift(newIdea);
  if (!saveIdeas(ideas)) return res.status(500).json({ error: 'Could not save the idea bank.' });
  res.json({ success: true, idea: newIdea });
});

app.delete('/api/ideas/:id', (req, res) => {
  const ideas = loadIdeas();
  const filtered = ideas.filter(i => i.id !== req.params.id);
  if (filtered.length === ideas.length) return res.status(404).json({ error: 'Idea not found' });
  if (!saveIdeas(filtered)) return res.status(500).json({ error: 'Could not save the idea bank.' });
  res.json({ success: true, message: 'Idea removed' });
});

// AI Generate 5 ideas
app.post('/api/ideas/ai-generate', async (req, res) => {
  const currentEnv = loadEnv();

  if (!currentEnv.GEMINI_API_KEY && !currentEnv.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'Please set your Gemini or OpenAI API Key in Settings first.' });
  }

  try {
    const generated = await generateIdeasWithAI({ count: 5 });

    const ideas = loadIdeas();
    const formatted = (Array.isArray(generated) ? generated : []).filter(item => item && typeof item.topic === 'string' && item.topic.trim()).map((item, idx) => ({
      id: `idea-ai-${Date.now()}-${idx}`,
      topic: item.topic,
      category: item.category || 'Architecture',
      level: item.level || 'Mid',
      language: item.language || 'EN',
      status: 'pending',
      createdAt: new Date().toISOString()
    }));

    if (formatted.length === 0) {
      return res.status(502).json({ error: 'The AI provider returned no usable ideas. Please try again.' });
    }

    const updated = [...formatted, ...ideas];
    if (!saveIdeas(updated)) return res.status(500).json({ error: 'Generated ideas could not be saved.' });

    res.json({ success: true, added: formatted });
  } catch (error) {
    console.error('AI Ideas generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ideas' });
  }
});

// 4. Posts & Metrics Loop
app.get('/api/posts', (req, res) => {
  res.json(loadPosts());
});

app.post('/api/posts/:id/metrics', (req, res) => {
  const { impressions, reactions, comments } = req.body;
  const posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  const metrics = { impressions, reactions, comments };
  for (const [key, value] of Object.entries(metrics)) {
    if (value === undefined) {
      delete metrics[key];
      continue;
    }
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return res.status(400).json({ error: `${key} must be a non-negative whole number.` });
    }
    metrics[key] = numericValue;
  }

  post.metrics = {
    impressions: post.metrics?.impressions ?? 0,
    reactions: post.metrics?.reactions ?? 0,
    comments: post.metrics?.comments ?? 0,
    ...metrics,
    updatedAt: new Date().toISOString()
  };

  if (!savePosts(posts)) return res.status(500).json({ error: 'Could not save post metrics.' });
  res.json({ success: true, post });
});

// 5. CSV Historical Posts Importer
app.post('/api/posts/import-csv', (req, res) => {
  const { csvContent } = req.body;
  if (typeof csvContent !== 'string' || !csvContent.trim()) return res.status(400).json({ error: 'CSV content is required' });

  try {
    const rows = parseCsvRows(csvContent);
    if (rows.length < 2) return res.status(400).json({ error: 'Invalid CSV data. Include a header row and at least one post.' });

    const headers = rows[0].map(value => value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const textIndex = headers.findIndex(value => ['posttext', 'sharecommentary', 'commentary', 'post', 'content', 'text', 'sharetext', 'share'].includes(value));
    const likesIndex = headers.findIndex(value => /like|reaction/.test(value));
    const commentsIndex = headers.findIndex(value => /^(comments?|commentcount|numberofcomments)$/.test(value) || (value.includes('comment') && !value.includes('commentary') && !value.includes('text')));
    const importedPosts = [];

    if (textIndex < 0) {
      return res.status(400).json({ error: 'Could not identify a post text column. Include a Post, Share, Commentary, Content, or Text header.' });
    }

    for (const row of rows.slice(1)) {
      const postText = String(row[textIndex] || '').trim();
      if (postText.length > 80) {
        importedPosts.push({
          text: postText,
          likes: Number(String(row[likesIndex] || '').replace(/[,_\s]/g, '')) || 0,
          comments: Number(String(row[commentsIndex] || '').replace(/[,_\s]/g, '')) || 0
        });
      }
    }

    if (importedPosts.length === 0) {
      return res.status(400).json({ error: 'No valid post texts found in CSV' });
    }

    const topPosts = importedPosts
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 5);
    const inspirationPath = path.join(rootDir, 'data', 'inspiration.md');
    let currentInspiration = loadInspiration();

    currentInspiration += `\n\n## Imported High-Performing Posts (${new Date().toLocaleDateString()})\n`;
    topPosts.forEach((tp, idx) => {
      currentInspiration += `\n### Reference Post #${idx + 1}\n${tp.text}\n---\n`;
    });

    fs.writeFileSync(inspirationPath, currentInspiration, 'utf-8');

    res.json({
      success: true,
      message: `Imported and trained on top ${topPosts.length} posts!`,
      count: topPosts.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse CSV: ' + err.message });
  }
});

// 6. Test Connections
app.post('/api/test/gemini', async (req, res) => {
  const result = await testGeminiConnection();
  res.json(result);
});

app.post('/api/test/openai', async (req, res) => {
  const result = await testOpenAIConnection();
  res.json(result);
});

app.post('/api/test/cloudinary', async (req, res) => {
  const result = await testCloudinaryConnection();
  res.json(result);
});

app.post('/api/test/telegram', async (req, res) => {
  const result = await testTelegramConnection();
  res.json(result);
});

// Auto-detect Telegram Chat ID from latest message
app.get('/api/telegram/auto-detect', async (req, res) => {
  const currentEnv = loadEnv();
  const token = currentEnv.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(400).json({ error: 'Bot token not set' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    if (!data.ok || !data.result || data.result.length === 0) {
      return res.json({
        found: false,
        message: 'No messages received yet. Please open your bot in Telegram (t.me/Linkedin_Antigravity_bot) and tap Start!'
      });
    }

    const lastUpdate = data.result[data.result.length - 1];
    const chatId = lastUpdate.message?.chat?.id || lastUpdate.callback_query?.message?.chat?.id;
    const senderName = lastUpdate.message?.from?.first_name || 'User';

    if (chatId) {
      updateEnv({ TELEGRAM_CHAT_ID: String(chatId) });
      return res.json({
        found: true,
        chatId: String(chatId),
        senderName,
        message: `Found chat ID for ${senderName}! Saved to .env.`
      });
    }

    res.json({ found: false, message: 'Could not extract chat ID from update.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Manual Pipeline Trigger (Full Generate + Publish)
app.post('/api/run-now', async (req, res) => {
  const { topic, language, forcePublish } = req.body;
  try {
    const result = await executePostPipeline({
      isManual: true,
      topicOverride: topic || null,
      languageOverride: language || null,
      forcePublish: forcePublish === true
    });
    res.json(result);
  } catch (error) {
    console.error('Pipeline manual execution failed:', error);
    res.status(500).json({ error: error.message || 'Pipeline execution failed' });
  }
});

// 7.1 Publish Existing Previewed Draft (Direct Publish - Zero Duplicate Generation)
app.post('/api/publish-draft', async (req, res) => {
  const { draft } = req.body;
  if (!draft || typeof draft.postText !== 'string' || !draft.postText.trim()) {
    return res.status(400).json({ error: 'Valid draft with postText is required' });
  }
  if (draft.isMock) {
    return res.status(422).json({ error: draft.warning || 'Fallback previews cannot be published.' });
  }
  try {
    const result = await publishExistingDraft(draft);
    res.json(result);
  } catch (error) {
    console.error('Direct draft publishing failed:', error);
    res.status(500).json({ error: error.message || 'Failed to publish draft' });
  }
});

// 8. Preview Generator (Draft + Visual Card)
app.post('/api/generate-preview', async (req, res) => {
  const { topic, language } = req.body;
  try {
    const config = loadConfig();
    const profile = config.profile || {};
    const automation = config.automation || {};
    const ideas = loadIdeas();

    // 1. Strictly respect languageMode
    let targetLang = 'EN';
    if (automation.languageMode === 'AR') {
      targetLang = 'AR';
    } else if (automation.languageMode === 'EN') {
      targetLang = 'EN';
    } else {
      targetLang = language || automation.nextLanguage || 'EN';
    }

    // 2. Select topic from idea bank if not specified
    let chosenTopic = topic;
    if (!chosenTopic) {
      const pendingIdea = ideas.find(i => i.status === 'pending' && i.language === targetLang) ||
                          (automation.languageMode === 'alternate' ? ideas.find(i => i.status === 'pending') : null);
      if (pendingIdea) {
        chosenTopic = pendingIdea.topic;
        if (automation.languageMode === 'alternate') {
          targetLang = pendingIdea.language || targetLang;
        }
      } else {
        chosenTopic = targetLang === 'AR'
          ? 'أهمية معالجة Concurrency و Race Conditions في الـ Database'
          : 'Database Connection Pooling vs Horizontal Scaling in Node.js';
      }
    }

    const draft = await generatePostWithAI({
      topic: chosenTopic,
      language: targetLang,
      level: profile.yearsOfExperience || 'Mid'
    });

    if (draft?.isMock && !draft.warning) {
      draft.warning = 'AI generation is unavailable. This fallback preview cannot be published.';
    }

    // Generate real visual card for preview
    const cardData = draft.visualCard || {};
    const cardBuffer = await generateVisualCard({
      style: config.style?.visualStyle && config.style.visualStyle !== 'auto'
        ? config.style.visualStyle
        : cardData.style || null,
      type: cardData.type || 'takeaways',
      theme: config.style?.visualTheme && config.style.visualTheme !== 'auto'
        ? config.style.visualTheme
        : cardData.theme || null,
      title: cardData.title || draft.topic,
      subtitle: cardData.subtitle || '',
      codeSnippet: cardData.codeSnippet || '',
      language: cardData.language || 'typescript',
      takeaways: cardData.takeaways || [],
      comparison: cardData.comparison || null,
      authorName: profile.name || 'Serag',
      authorRole: profile.currentRole || 'Backend & Fullstack Software Engineer',
      isArabic: targetLang === 'AR'
    });

    const uploadRes = await uploadImageToCloudinary(cardBuffer, `preview_${Date.now()}`);
    draft.mediaUrl = uploadRes.secure_url || uploadRes.url;
    draft.cardType = cardData.type || 'takeaways';

    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. LinkedIn OAuth Endpoints
app.get('/api/auth/linkedin/url', (req, res) => {
  const url = getLinkedInAuthUrl();
  res.json({ url });
});

app.get('/api/auth/linkedin/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  const currentEnv = loadEnv();
  const appUrl = currentEnv.APP_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${appUrl}/?auth_error=No+authorization+code+received`);
  }

  try {
    const authResult = await exchangeOAuthCode(code);
    res.redirect(`${appUrl}/?auth_success=true&member=${encodeURIComponent(authResult.memberName || 'User')}`);
  } catch (err) {
    res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LinkedIn Automation Server running at http://localhost:${PORT}`);
  console.log(`📊 For local dashboard development, run npm run dev (frontend on :3000)`);
  console.log(`======================================================\n`);
});
