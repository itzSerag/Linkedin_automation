import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { loadEnv, updateEnv } from '../config.js';

const LINKEDIN_API_VERSION = '202511';

export function getLinkedInAuthUrl() {
  const env = loadEnv();
  const clientId = env.LINKEDIN_CLIENT_ID;
  const redirectUri = encodeURIComponent(env.LINKEDIN_REDIRECT_URI);
  const state = 'linkedin_auth_' + Date.now();
  const scope = encodeURIComponent('w_member_social openid profile email');

  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
}

export async function exchangeOAuthCode(code) {
  const env = loadEnv();
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('client_id', env.LINKEDIN_CLIENT_ID);
  params.append('client_secret', env.LINKEDIN_CLIENT_SECRET);
  params.append('redirect_uri', env.LINKEDIN_REDIRECT_URI);

  try {
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in || 5184000; // ~60 days
    const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Fetch user profile info to get member sub ID
    const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const memberId = userRes.data.sub;
    const memberName = userRes.data.name || `${userRes.data.given_name || ''} ${userRes.data.family_name || ''}`.trim();

    updateEnv({
      LINKEDIN_ACCESS_TOKEN: accessToken,
      LINKEDIN_MEMBER_ID: memberId,
      LINKEDIN_TOKEN_EXPIRY: expiryDate
    });

    return {
      success: true,
      memberId,
      memberName,
      expiryDate,
      message: 'Successfully authenticated with LinkedIn!'
    };
  } catch (error) {
    console.error('LinkedIn OAuth token exchange error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.message || 'LinkedIn token exchange failed');
  }
}

/**
 * Escapes reserved characters for LinkedIn's Little Text Format in the commentary field.
 * LinkedIn's Posts API silently truncates posts at unescaped parentheses '()', brackets '[]',
 * braces '{}', asterisks, underscores, tildes, pipes, or angle brackets because it parses
 * them as entity markup (mentions). Escaping them ensures LinkedIn renders the complete full post!
 */
export function escapeLinkedInCommentary(text) {
  if (!text) return '';
  return String(text).replace(/([\\|{}\[\]()<>*_~])/g, '\\$1');
}

export async function uploadImageToLinkedIn(imageBuffer) {
  const env = loadEnv();
  const accessToken = env.LINKEDIN_ACCESS_TOKEN;
  const memberId = env.LINKEDIN_MEMBER_ID;

  if (!accessToken || !memberId) {
    throw new Error('LinkedIn access token or member ID is missing. Please connect LinkedIn in Settings.');
  }

  // 1. Initialize Upload
  const initPayload = {
    initializeUploadRequest: {
      owner: `urn:li:person:${memberId}`
    }
  };

  const initRes = await axios.post(
    'https://api.linkedin.com/rest/images?action=initializeUpload',
    initPayload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    }
  );

  const uploadUrl = initRes.data.value.uploadUrl;
  const imageUrn = initRes.data.value.image;

  // 2. Upload binary image buffer to LinkedIn's signed upload URL
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      'Content-Type': 'image/png'
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return imageUrn;
}

export async function publishLinkedInPost({ text, imageBuffer, imageUrl, firstCommentText }) {
  const env = loadEnv();
  const accessToken = env.LINKEDIN_ACCESS_TOKEN;
  const memberId = env.LINKEDIN_MEMBER_ID;

  if (!accessToken || !memberId) {
    return {
      success: false,
      isMock: true,
      message: 'LinkedIn account not connected. Saved as local draft.'
    };
  }

  let finalBuffer = imageBuffer;
  if (!finalBuffer && imageUrl) {
    try {
      if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('/media/')) {
        const localPath = path.resolve('src/public' + imageUrl.replace(/^https?:\/\/[^\/]+/, ''));
        if (fs.existsSync(localPath)) {
          finalBuffer = fs.readFileSync(localPath);
        }
      } else {
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        finalBuffer = Buffer.from(imgRes.data);
      }
    } catch (fetchErr) {
      console.warn('Failed to fetch image from URL for LinkedIn upload:', fetchErr.message);
    }
  }

  let imageUrn = null;
  if (finalBuffer) {
    try {
      imageUrn = await uploadImageToLinkedIn(finalBuffer);
    } catch (imgErr) {
      console.warn('Image upload to LinkedIn failed, falling back to text-only post:', imgErr.message);
    }
  }

  // Prepare Post Body for /rest/posts with escaped Little Text format
  const formattedText = escapeLinkedInCommentary(text);
  const authorUrn = `urn:li:person:${memberId}`;
  const postPayload = {
    author: authorUrn,
    commentary: formattedText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false
  };

  if (imageUrn) {
    postPayload.content = {
      media: {
        title: 'Engineering Technical Visual Card',
        id: imageUrn
      }
    };
  }

  let postUrn = null;

  try {
    const postRes = await axios.post('https://api.linkedin.com/rest/posts', postPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    postUrn = postRes.headers['x-restli-id'] || postRes.headers['x-linkedin-id'];
    if (!postUrn && postRes.data && postRes.data.id) {
      postUrn = postRes.data.id;
    }
  } catch (apiErr) {
    console.error('LinkedIn /rest/posts error:', apiErr.response?.data || apiErr.message);
    
    // Fallback to legacy /v2/ugcPosts if rest/posts gave versioning issue
    try {
      const ugcPayload = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: formattedText },
            shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
            media: imageUrn ? [
              {
                status: 'READY',
                description: { text: 'Technical Visual Card' },
                media: imageUrn,
                title: { text: 'Engineering Architecture Card' }
              }
            ] : []
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const ugcRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', ugcPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        }
      });
      postUrn = ugcRes.data.id;
    } catch (fallbackErr) {
      throw new Error(apiErr.response?.data?.message || apiErr.message || 'Failed to publish post to LinkedIn');
    }
  }

  const cleanPostUrn = postUrn || `urn:li:share:${Date.now()}`;
  const postUrl = `https://www.linkedin.com/feed/update/${cleanPostUrn}/`;

  // Publish First Comment if requested
  let firstCommentStatus = null;
  if (firstCommentText && postUrn) {
    try {
      // Small cooldown to let the post register in LinkedIn indexing
      await new Promise(r => setTimeout(r, 4000));
      const commentRes = await axios.post(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(cleanPostUrn)}/comments`,
        {
          actor: authorUrn,
          message: { text: firstCommentText }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': LINKEDIN_API_VERSION,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
      firstCommentStatus = 'published';
    } catch (commentErr) {
      console.warn('Failed to publish first comment:', commentErr.response?.data || commentErr.message);
      firstCommentStatus = 'failed: ' + (commentErr.response?.data?.message || commentErr.message);
    }
  }

  return {
    success: true,
    postUrn: cleanPostUrn,
    postUrl,
    firstCommentStatus,
    publishedAt: new Date().toISOString()
  };
}

export function getLinkedInStatus() {
  const env = loadEnv();
  const isConfigured = Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET);
  const isConnected = Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_MEMBER_ID);
  
  let daysRemaining = null;
  if (env.LINKEDIN_TOKEN_EXPIRY) {
    const expiry = new Date(env.LINKEDIN_TOKEN_EXPIRY);
    const now = new Date();
    daysRemaining = Math.max(0, Math.round((expiry - now) / (1000 * 60 * 60 * 24)));
  }

  return {
    isConfigured,
    isConnected,
    memberId: env.LINKEDIN_MEMBER_ID || null,
    tokenExpiry: env.LINKEDIN_TOKEN_EXPIRY || null,
    daysRemaining
  };
}
