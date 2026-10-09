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
  const apiKey = (process.env.IMGBB_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY is missing.');
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Invalid image data.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Image is too large. Maximum size is 32 MB.');
  }

  const form = new FormData();
  form.append('key', apiKey);
  form.append('image', buffer.toString('base64'));
  form.append('name', String(name).replace(/\.[^/.]+$/, '').slice(0, 80) || 'image');

  let response;
  try {
    response = await fetch(IMGBB_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://imgbb.com',
        Referer: 'https://imgbb.com/',
      },
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    throw new Error(`ImgBB upload failed: ${err.message}`);
  }

  const raw = await response.text();
  let result = null;
  try {
    result = JSON.parse(raw);
  } catch (err) {
    result = null;
  }

  if (!response.ok || !result || !result.success || !result.data) {
    const apiMessage =
      (result && result.error && result.error.message) ||
      (result && result.status_txt) ||
      (raw && raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)) ||
      `HTTP ${response.status}`;
    throw new Error(`ImgBB upload failed: ${apiMessage}`);
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
}

module.exports = { uploadToImgBB };
