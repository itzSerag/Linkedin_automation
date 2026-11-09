import { v2 as cloudinary } from 'cloudinary';
import { loadEnv } from '../config.js';
import fs from 'fs';
import path from 'path';
import { rootDir } from '../config.js';

function getCloudinaryClient() {
  const env = loadEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return null;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return cloudinary;
}

export async function uploadImageToCloudinary(buffer, fileName = 'linkedin_post') {
  const client = getCloudinaryClient();
  
  if (!client) {
    // Local fallback when Cloudinary is not configured yet
    const mediaDir = path.join(rootDir, 'src', 'public', 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    const safeName = `${fileName}_${Date.now()}.png`;
    const localFilePath = path.join(mediaDir, safeName);
    fs.writeFileSync(localFilePath, buffer);
    const env = loadEnv();
    const localUrl = `${env.APP_URL}/media/${safeName}`;
    return {
      success: true,
      url: localUrl,
      secure_url: localUrl,
      public_id: `local_${safeName}`,
      isLocal: true,
      message: 'Saved locally (Add Cloudinary keys in Dashboard to host on Cloudinary CDN)'
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: 'linkedin_posts',
        public_id: `${fileName}_${Date.now()}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            success: true,
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            isLocal: false
          });
        }
      }
    );
    uploadStream.end(buffer);
  });
}

export async function testCloudinaryConnection() {
  const client = getCloudinaryClient();
  if (!client) {
    return { success: false, message: 'Cloudinary credentials are not configured in .env' };
  }
  try {
    const result = await client.api.ping();
    return { success: true, message: 'Cloudinary connected successfully!', result };
  } catch (error) {
    return { success: false, message: error.message || 'Failed to connect to Cloudinary' };
  }
}
