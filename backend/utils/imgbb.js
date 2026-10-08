/**
 * ImgBB image upload helper.
 * Docs: https://api.imgbb.com/
 *
 * Usage:
 *   const { uploadToImgBB } = require('./imgbb');
 *   const result = await uploadToImgBB(fileBuffer, 'my-image');
 *   // result => { url, displayUrl, thumbUrl, deleteUrl, width, height }
 */
const axios = require('axios');

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';
const MAX_SIZE_BYTES = 32 * 1024 * 1024; // ImgBB free limit: 32 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

/**
 * Upload an image buffer to ImgBB.
 *
 * @param {Buffer} buffer      - Image file buffer (e.g. from multer memoryStorage)
 * @param {string} [name]      - Optional file name (without extension)
 * @param {string} [mimeType]  - Optional MIME type used for validation
 * @returns {Promise<{url:string, displayUrl:string, thumbUrl:string|null, deleteUrl:string|null, width:number, height:number}>}
 */
async function uploadToImgBB(buffer, name = 'virallink', mimeType) {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error('IMGBB_API_KEY is missing in your environment variables.');
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid or empty image file.');
  }

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error('Image is too large. Maximum allowed size is 32 MB.');
  }

  if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
    throw new Error('Unsupported image type. Use JPG, PNG, GIF, WEBP or BMP.');
  }

  // ImgBB expects the image as a base64 string in a form-encoded body
  const body = new URLSearchParams();
  body.append('image', buffer.toString('base64'));
  body.append('name', String(name).slice(0, 100));

  try {
    const response = await axios.post(`${IMGBB_ENDPOINT}?key=${apiKey}`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const data = response.data && response.data.data;

    if (!response.data || !response.data.success || !data) {
      throw new Error('ImgBB returned an unexpected response.');
    }

    return {
      url: data.url, // direct image URL (best for og:image)
      displayUrl: data.display_url,
      thumbUrl: data.thumb ? data.thumb.url : null,
      deleteUrl: data.delete_url || null,
      width: Number(data.width) || 0,
      height: Number(data.height) || 0,
    };
  } catch (err) {
    // Surface a clean error message from ImgBB when available
    const apiMessage =
      err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message
        : null;

    console.error('[ImgBB] Upload failed:', apiMessage || err.message);
    throw new Error(apiMessage ? `ImgBB error: ${apiMessage}` : `ImgBB upload failed: ${err.message}`);
  }
}

module.exports = { uploadToImgBB, ALLOWED_MIME, MAX_SIZE_BYTES };
