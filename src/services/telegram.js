import axios from 'axios';
import { loadEnv } from '../config.js';

function getTelegramConfig() {
  const env = loadEnv();
  return {
    token: env.TELEGRAM_BOT_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID
  };
}

export async function sendTelegramMessage(text) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, message: 'Telegram Bot Token or Chat ID not configured.' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
    return { success: true, data: res.data };
  } catch (error) {
    console.error('Telegram sendMessage error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.description || error.message };
  }
}

export async function sendTelegramPhoto(photoUrlOrBuffer, caption) {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, message: 'Telegram not configured' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    const res = await axios.post(url, {
      chat_id: chatId,
      photo: photoUrlOrBuffer,
      caption,
      parse_mode: 'HTML'
    });
    return { success: true, data: res.data };
  } catch (error) {
    // If sending photo via URL fails, fallback to simple message
    return sendTelegramMessage(caption);
  }
}

export async function notifyPostPublished({ post, postUrl, imageUrl, firstCommentText }) {
  const langEmoji = post.language === 'AR' ? '🇸🇦 ARABIC' : '🇬🇧 ENGLISH';
  
  const caption = `
🚀 <b>New LinkedIn Post Published!</b>

🌐 <b>Language:</b> ${langEmoji}
🎯 <b>Topic:</b> ${post.topic || 'Engineering Thought'}
📊 <b>Length:</b> ${post.postText?.length || 0} characters

<b>Hook:</b>
<i>"${post.hook || post.postText?.slice(0, 100)}..."</i>

🔗 <b>View on LinkedIn:</b>
<a href="${postUrl}">${postUrl}</a>

💬 <b>First Comment Added:</b>
<i>${firstCommentText ? firstCommentText.slice(0, 150) + '...' : 'None'}</i>
`.trim();

  if (imageUrl && imageUrl.startsWith('http')) {
    return await sendTelegramPhoto(imageUrl, caption);
  } else {
    return await sendTelegramMessage(caption);
  }
}

export async function testTelegramConnection() {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { success: false, message: 'Telegram Bot Token or Chat ID is missing in Settings' };
  }
  return await sendTelegramMessage('✅ <b>Antigravity LinkedIn Automation Bot Connected!</b>\nYou will receive alerts here whenever a new post is published.');
}
