const axios = require('axios');

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';
const MAX_BYTES = 32 * 1024 * 1024; // ImgBB limit: 32 MB

/**
 * Upload an image buffer to ImgBB.
 *
 * @param {Buffer} buffer - Image file contents
 * @param {string} [name] - Optional file name
 * @returns {Promise<{ url: string, displayUrl: string, thumbUrl: string, deleteUrl: string, width: number, height: number }>}
 */
async function uploadToImgBB(buffer, name = 'image') {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY is missing.');
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid image data.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Image is too large. Maximum size is 32 MB.');
  }

  const body = new URLSearchParams();
  body.append('image', buffer.toString('base64'));
  body.append('name', String(name).replace(/\.[^/.]+$/, '').slice(0, 80) || 'image');

  try {
    const response = await axios.post(`${IMGBB_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 45000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const result = response.data;
    if (!result || !result.success || !result.data) {
      throw new Error('ImgBB returned an unexpected response.');
    }

    const data = result.data;
    return {
      url: data.url,
      displayUrl: data.display_url || data.url,
      thumbUrl: (data.thumb && data.thumb.url) || data.url,
      deleteUrl: data.delete_url || '',
      width: Number(data.width) || 0,
      height: Number(data.height) || 0,
    };
  } catch (err) {
    const apiMessage =
      err.response && err.response.data && err.response.data.error && err.response.data.error.message;
    throw new Error(`ImgBB upload failed: ${apiMessage || err.message}`);
  }
}

module.exports = { uploadToImgBB };
