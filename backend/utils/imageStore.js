const sharp = require('sharp');
const { ref } = require('./firebase');
const { httpError } = require('./helpers');

// WhatsApp skips the preview image when it is too heavy (roughly > 300 KB)
const MAX_PREVIEW_BYTES = 280 * 1024;
const QUALITIES = [72, 62, 52, 42];

// Small in-memory cache so every request does not hit the database
const CACHE_LIMIT = 40;
const cache = new Map();

function cacheGet(key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value); // mark as recently used
  return value;
}

function cacheSet(key, value) {
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
}

/** Resize + compress an uploaded image. Returns base64 strings ready to store. */
async function processImage(buffer) {
  try {
    const base = () => sharp(buffer, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });

    let main = null;
    for (let i = 0; i < QUALITIES.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      main = await base()
        .resize({ width: 1200, height: 630, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALITIES[i], mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      if (main.data.length <= MAX_PREVIEW_BYTES) break;
    }

    const thumb = await base()
      .resize(240, 240, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    return {
      main: main.data.toString('base64'),
      thumb: thumb.toString('base64'),
      width: main.info.width,
      height: main.info.height,
    };
  } catch (err) {
    throw httpError(400, 'Could not read this image. Please try another one.');
  }
}

async function storeImage(id, processed) {
  await ref(`images/${id}`).set({
    main: processed.main,
    thumb: processed.thumb,
    width: processed.width,
    height: processed.height,
  });
}

/** variant: 'main' | 'thumb'. Returns a Buffer or null. */
async function loadImage(id, variant = 'main') {
  const field = variant === 'thumb' ? 'thumb' : 'main';
  const key = `${id}:${field}`;

  const cached = cacheGet(key);
  if (cached) return cached;

  const snapshot = await ref(`images/${id}/${field}`).once('value');
  const data = snapshot.val();
  if (!data) return null;

  const buffer = Buffer.from(data, 'base64');
  cacheSet(key, buffer);
  return buffer;
}

async function deleteImage(id) {
  cache.delete(`${id}:main`);
  cache.delete(`${id}:thumb`);
  await ref(`images/${id}`).remove();
}

module.exports = { processImage, storeImage, loadImage, deleteImage };
