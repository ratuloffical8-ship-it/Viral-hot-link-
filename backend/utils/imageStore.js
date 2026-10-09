const sharp = require('sharp');
const { ref } = require('./firebase');
const { httpError } = require('./helpers');

/** Resize + compress an uploaded image. Returns base64 strings ready to store. */
async function processImage(buffer) {
  try {
    const base = () => sharp(buffer, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });

    const main = await base()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

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
  const snapshot = await ref(`images/${id}/${variant === 'thumb' ? 'thumb' : 'main'}`).once('value');
  const data = snapshot.val();
  return data ? Buffer.from(data, 'base64') : null;
}

async function deleteImage(id) {
  await ref(`images/${id}`).remove();
}

module.exports = { processImage, storeImage, loadImage, deleteImage };
