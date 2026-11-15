import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const CONFIG_PATH = path.join(rootDir, 'config.json');
const IDEAS_PATH = path.join(rootDir, 'data', 'ideas.json');
const POSTS_PATH = path.join(rootDir, 'data', 'posts.json');
const INSPIRATION_PATH = path.join(rootDir, 'data', 'inspiration.md');
const ENV_PATH = path.join(rootDir, '.env');
let configLoadFailed = false;
let ideasLoadFailed = false;
let postsLoadFailed = false;

function writeFileAtomically(filePath, contents) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, contents, 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    try {
      fs.rmSync(tempPath, { force: true });
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
}

function saveJsonFile(filePath, value, label) {
  try {
    writeFileAtomically(filePath, JSON.stringify(value, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving ${label}:`, error);
    return false;
  }
}

export function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      configLoadFailed = false;
      return {};
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected a JSON object');
    }
    configLoadFailed = false;
    return parsed;
  } catch (error) {
    configLoadFailed = true;
    console.error('Error loading config.json:', error);
    return {};
  }
}

export function saveConfig(newConfig) {
  if (!newConfig || typeof newConfig !== 'object' || Array.isArray(newConfig)) return false;
  if (configLoadFailed) return false;
  const saved = saveJsonFile(CONFIG_PATH, newConfig, 'config.json');
  if (saved) configLoadFailed = false;
  return saved;
}

export function loadEnv() {
  dotenv.config({ path: ENV_PATH, override: true });
  return {
    PORT: process.env.PORT || 3000,
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || '',
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || '',
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback',
    LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN || '',
    LINKEDIN_MEMBER_ID: process.env.LINKEDIN_MEMBER_ID || '',
    LINKEDIN_TOKEN_EXPIRY: process.env.LINKEDIN_TOKEN_EXPIRY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || ''
  };
}

export function updateEnv(updates) {
  try {
    let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    const lines = content.split('\n');
    const updatedKeys = new Set();

    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const [key] = trimmed.split('=');
      const cleanKey = key.trim();
      if (cleanKey in updates) {
        updatedKeys.add(cleanKey);
        return `${cleanKey}=${String(updates[cleanKey])}`;
      }
      return line;
    });

    for (const [key, value] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${String(value)}`);
      }
    }

    writeFileAtomically(ENV_PATH, newLines.join('\n'));
    for (const [key, value] of Object.entries(updates)) {
      process.env[key] = String(value);
    }
    dotenv.config({ path: ENV_PATH, override: true });
    return true;
  } catch (error) {
    console.error('Error updating .env:', error);
    return false;
  }
}

export function loadIdeas() {
  try {
    if (!fs.existsSync(IDEAS_PATH)) {
      ideasLoadFailed = false;
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(IDEAS_PATH, 'utf-8'));
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
    ideasLoadFailed = false;
    return parsed;
  } catch (error) {
    ideasLoadFailed = true;
    console.error('Error loading ideas.json:', error);
    return [];
  }
}

export function saveIdeas(ideas) {
  if (!Array.isArray(ideas) || ideasLoadFailed) return false;
  const saved = saveJsonFile(IDEAS_PATH, ideas, 'ideas.json');
  if (saved) ideasLoadFailed = false;
  return saved;
}

export function loadPosts() {
  try {
    if (!fs.existsSync(POSTS_PATH)) {
      postsLoadFailed = false;
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf-8'));
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
    postsLoadFailed = false;
    return parsed;
  } catch (error) {
    postsLoadFailed = true;
    console.error('Error loading posts.json:', error);
    return [];
  }
}

export function savePosts(posts) {
  if (!Array.isArray(posts) || postsLoadFailed) return false;
  const saved = saveJsonFile(POSTS_PATH, posts, 'posts.json');
  if (saved) postsLoadFailed = false;
  return saved;
}

export function loadInspiration() {
  try {
    if (!fs.existsSync(INSPIRATION_PATH)) return '';
    return fs.readFileSync(INSPIRATION_PATH, 'utf-8');
  } catch (error) {
    return '';
  }
}

export { rootDir };
