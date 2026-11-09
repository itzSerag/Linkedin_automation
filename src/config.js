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

export function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return {};
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config.json:', error);
    return {};
  }
}

export function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving config.json:', error);
    return false;
  }
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
        process.env[cleanKey] = String(updates[cleanKey]);
        return `${cleanKey}=${updates[cleanKey]}`;
      }
      return line;
    });

    for (const [key, value] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${value}`);
        process.env[key] = String(value);
      }
    }

    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf-8');
    dotenv.config({ path: ENV_PATH, override: true });
    return true;
  } catch (error) {
    console.error('Error updating .env:', error);
    return false;
  }
}

export function loadIdeas() {
  try {
    if (!fs.existsSync(IDEAS_PATH)) return [];
    return JSON.parse(fs.readFileSync(IDEAS_PATH, 'utf-8'));
  } catch (error) {
    console.error('Error loading ideas.json:', error);
    return [];
  }
}

export function saveIdeas(ideas) {
  try {
    fs.writeFileSync(IDEAS_PATH, JSON.stringify(ideas, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving ideas.json:', error);
    return false;
  }
}

export function loadPosts() {
  try {
    if (!fs.existsSync(POSTS_PATH)) return [];
    return JSON.parse(fs.readFileSync(POSTS_PATH, 'utf-8'));
  } catch (error) {
    console.error('Error loading posts.json:', error);
    return [];
  }
}

export function savePosts(posts) {
  try {
    fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving posts.json:', error);
    return false;
  }
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
