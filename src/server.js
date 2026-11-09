import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadConfig,
  saveConfig,
  loadEnv,
  updateEnv,
  loadIdeas,
  saveIdeas,
  loadPosts,
  savePosts
} from './config.js';
import {
  getLinkedInAuthUrl,
  exchangeOAuthCode,
  getLinkedInStatus
} from './services/linkedin.js';
import { testGeminiConnection, generatePostWithGemini } from './services/gemini.js';
import { testCloudinaryConnection } from './services/cloudinary.js';
import { testTelegramConnection } from './services/telegram.js';
import { executePostPipeline, initScheduler } from './services/scheduler.js';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const env = loadEnv();
const PORT = env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    gemini: {
      isConfigured: Boolean(currentEnv.GEMINI_API_KEY)
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
      CLOUDINARY_CLOUD_NAME: currentEnv.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: currentEnv.CLOUDINARY_API_KEY ? '••••••••' + currentEnv.CLOUDINARY_API_KEY.slice(-4) : '',
      TELEGRAM_BOT_TOKEN: currentEnv.TELEGRAM_BOT_TOKEN ? '••••••••' + currentEnv.TELEGRAM_BOT_TOKEN.slice(-4) : '',
      TELEGRAM_CHAT_ID: currentEnv.TELEGRAM_CHAT_ID
    }
  });
});

app.post('/api/config', (req, res) => {
  const { profile, automation, style, envUpdates } = req.body;
  const currentConfig = loadConfig();

  if (profile) currentConfig.profile = { ...currentConfig.profile, ...profile };
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

  if (!currentEnv.GEMINI_API_KEY) {
    return res.status(400).json({ error: 'Please set your GEMINI_API_KEY in Settings first.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: currentEnv.GEMINI_API_KEY });
    const prompt = `
Generate 5 viral, highly technical post topic ideas for a ${profile.currentRole || 'Backend/Fullstack'} engineer with stack: ${profile.primaryTechStack || 'Node, PostgreSQL, Docker'}.
Include a mix of:
- 2 topics in Arabic (العربية التقنية المتخصصة)
- 3 topics in English
Each topic must be specific, counter-intuitive or architecture/performance focused (no generic beginner fluff).

Return JSON array of objects:
[
  {
    "topic": "...",
    "category": "Backend / Database / System Design",
    "level": "Junior/Mid" or "Mid/Senior",
    "language": "EN" or "AR"
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const generated = JSON.parse(response.text.trim());
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

// 5. Test Connections
app.post('/api/test/gemini', async (req, res) => {
  const result = await testGeminiConnection();
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

// 6. Manual Pipeline Trigger
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

// 7. Preview Generator (Draft only)
app.post('/api/generate-preview', async (req, res) => {
  const { topic, language } = req.body;
  try {
    const config = loadConfig();
    const draft = await generatePostWithGemini({
      topic: topic || 'Database Connection Pooling vs Horizontal Scaling',
      language: language || 'EN',
      level: config.profile?.yearsOfExperience || 'Mid'
    });
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. LinkedIn OAuth Endpoints
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
