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
  generatePostWithAI
} from './services/gemini.js';
import { testCloudinaryConnection } from './services/cloudinary.js';
import { testTelegramConnection } from './services/telegram.js';
import { executePostPipeline, initScheduler } from './services/scheduler.js';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const env = loadEnv();
const PORT = env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

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
      geminiModel: config.ai?.geminiModel || 'gemini-2.5-pro',
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

  if (profile) currentConfig.profile = { ...currentConfig.profile, ...profile };
  if (ai) currentConfig.ai = { ...currentConfig.ai, ...ai };
  if (automation) currentConfig.automation = { ...currentConfig.automation, ...automation };
  if (style) currentConfig.style = { ...currentConfig.style, ...style };

  saveConfig(currentConfig);

  if (envUpdates && typeof envUpdates === 'object') {
    const cleanUpdates = {};
    for (const [k, v] of Object.entries(envUpdates)) {
      if (v && !v.includes('••••')) {
        cleanUpdates[k] = v;
      }
    }
    if (Object.keys(cleanUpdates).length > 0) {
      updateEnv(cleanUpdates);
    }
  }

  // Restart scheduler with new config
  initScheduler();

  res.json({ success: true, message: 'Settings updated successfully!', config: currentConfig });
});

// 3. Ideas Management
app.get('/api/ideas', (req, res) => {
  res.json(loadIdeas());
});

app.post('/api/ideas', (req, res) => {
  const { topic, category, level, language } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

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
  saveIdeas(ideas);
  res.json({ success: true, idea: newIdea });
});

app.delete('/api/ideas/:id', (req, res) => {
  const ideas = loadIdeas();
  const filtered = ideas.filter(i => i.id !== req.params.id);
  saveIdeas(filtered);
  res.json({ success: true, message: 'Idea removed' });
});

// AI Generate 5 ideas
app.post('/api/ideas/ai-generate', async (req, res) => {
  const currentEnv = loadEnv();
  const config = loadConfig();
  const profile = config.profile || {};

  if (!currentEnv.GEMINI_API_KEY && !currentEnv.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'Please set your Gemini or OpenAI API Key in Settings first.' });
  }

  try {
    const prompt = `
Generate 5 viral, highly technical post topic ideas for a ${profile.currentRole || 'Backend/Fullstack'} engineer with stack: ${profile.primaryTechStack || 'Node, PostgreSQL, Docker'}.
Include a mix of:
- 2 topics in Arabic (العربية التقنية المتخصصة)
- 3 topics in English
Each topic must be specific, counter-intuitive or architecture/performance focused (no generic beginner fluff).

Return strictly JSON array:
[
  {
    "topic": "...",
    "category": "Backend / Database / System Design",
    "level": "Junior/Mid" or "Mid/Senior",
    "language": "EN" or "AR"
  }
]
`;

    let generated = [];
    if (config.ai?.provider === 'openai' && currentEnv.OPENAI_API_KEY) {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: currentEnv.OPENAI_API_KEY });
      const comp = await openai.chat.completions.create({
        model: config.ai?.openaiModel || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });
      const parsed = JSON.parse(comp.choices[0].message.content.trim());
      generated = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.ideas || []);
    } else {
      const ai = new GoogleGenAI({ apiKey: currentEnv.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: config.ai?.geminiModel || 'gemini-2.5-pro',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text.trim());
      generated = Array.isArray(parsed) ? parsed : (parsed.topics || parsed.ideas || []);
    }

    const ideas = loadIdeas();
    const formatted = generated.map((item, idx) => ({
      id: `idea-ai-${Date.now()}-${idx}`,
      topic: item.topic,
      category: item.category || 'Architecture',
      level: item.level || 'Mid',
      language: item.language || 'EN',
      status: 'pending',
      createdAt: new Date().toISOString()
    }));

    const updated = [...formatted, ...ideas];
    saveIdeas(updated);

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

  post.metrics = {
    impressions: Number(impressions) || 0,
    reactions: Number(reactions) || 0,
    comments: Number(comments) || 0,
    updatedAt: new Date().toISOString()
  };

  savePosts(posts);
  res.json({ success: true, post });
});

// 5. CSV Historical Posts Importer
app.post('/api/posts/import-csv', (req, res) => {
  const { csvContent } = req.body;
  if (!csvContent) return res.status(400).json({ error: 'CSV content is required' });

  try {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return res.status(400).json({ error: 'Invalid CSV data' });

    // Simple robust CSV line parser
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const importedPosts = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Match comma separated or quoted values
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const row = matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

      const postText = row[0] || '';
      if (postText.length > 80) {
        importedPosts.push({
          text: postText,
          likes: Number(row[1]) || 0,
          comments: Number(row[2]) || 0
        });
      }
    }

    if (importedPosts.length === 0) {
      return res.status(400).json({ error: 'No valid post texts found in CSV' });
    }

    // Sort by engagement or pick top 5
    const topPosts = importedPosts.slice(0, 5);
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

// 7. Manual Pipeline Trigger
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

// 8. Preview Generator (Draft only)
app.post('/api/generate-preview', async (req, res) => {
  const { topic, language } = req.body;
  try {
    const config = loadConfig();
    const draft = await generatePostWithAI({
      topic: topic || 'Database Connection Pooling vs Horizontal Scaling',
      language: language || 'EN',
      level: config.profile?.yearsOfExperience || 'Mid'
    });
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

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?auth_error=No+authorization+code+received');
  }

  try {
    const authResult = await exchangeOAuthCode(code);
    res.redirect(`/?auth_success=true&member=${encodeURIComponent(authResult.memberName || 'User')}`);
  } catch (err) {
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// Initialize scheduler on server boot
initScheduler();

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LinkedIn Automation Server running at http://localhost:${PORT}`);
  console.log(`📊 Open your browser at http://localhost:${PORT} to access the Dashboard`);
  console.log(`======================================================\n`);
});
