const { db, ref, increment } = require('../utils/firebase');
const { processImage, storeImage, deleteImage } = require('../utils/imageStore');
const { generateId, getDateKey, getBaseUrl, httpError } = require('../utils/helpers');

const ID_REGEX = /^[a-z0-9]{4,12}$/;

function isValidId(id) {
  return ID_REGEX.test(String(id || ''));
}

function cleanText(value, maxLength) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Shape a stored link for the frontend (hides internal fields) */
function toClient(link, baseUrl) {
  return {
    id: link.id,
    title: link.title,
    description: link.description || '',
    imageUrl: link.imageUrl,
    thumbUrl: link.thumbUrl || link.imageUrl,
    clicks: Number(link.clicks) || 0,
    createdAt: link.createdAt || 0,
    shortUrl: `${baseUrl}/v/${link.id}`,
  };
}

/** POST /api/links  (admin, multipart: image, title, description) */
async function createLink(req, res) {
  if (!req.file) {
    throw httpError(400, 'Please choose an image.');
  }

  const title = cleanText(req.body.title, 100);
  const description = cleanText(req.body.description, 300);
  if (!title) {
    throw httpError(400, 'Caption / title is required.');
  }

  // Resize + compress first, so a bad image fails before anything is saved
  const processed = await processImage(req.file.buffer);
  const baseUrl = getBaseUrl(req);

  let created = null;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    const id = generateId(6);
    const record = {
      id,
      title,
      description,
      imageUrl: `${baseUrl}/img/${id}.jpg`,
      thumbUrl: `${baseUrl}/img/${id}_t.jpg`,
      imageWidth: processed.width,
      imageHeight: processed.height,
      clicks: 0,
      createdAt: Date.now(),
      createdBy: req.admin.id,
    };

    // eslint-disable-next-line no-await-in-loop
    const result = await ref(`links/${id}`).transaction((current) => (current === null ? record : undefined));
    if (result.committed) {
      created = record;
    }
  }

  if (!created) {
    throw httpError(500, 'Could not generate a unique link. Please try again.');
  }

  try {
    await storeImage(created.id, processed);
  } catch (err) {
    await ref(`links/${created.id}`).remove();
    throw httpError(500, 'Could not save the image. Please try again.');
  }

  res.status(201).json({
    message: 'Link created.',
    link: toClient(created, baseUrl),
  });
}

/** GET /api/links  (admin) -> links + basic analytics */
async function listLinks(req, res) {
  const today = getDateKey();

  const [linksSnap, totalSnap, todaySnap] = await Promise.all([
    ref('links').once('value'),
    ref('stats/totalClicks').once('value'),
    ref(`stats/daily/${today}`).once('value'),
  ]);

  const baseUrl = getBaseUrl(req);
  const links = Object.values(linksSnap.val() || {})
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((link) => toClient(link, baseUrl));

  const sumOfLinkClicks = links.reduce((sum, link) => sum + link.clicks, 0);

  res.json({
    links,
    stats: {
      totalLinks: links.length,
      totalClicks: totalSnap.exists() ? Number(totalSnap.val()) || 0 : sumOfLinkClicks,
      todayClicks: Number(todaySnap.val()) || 0,
    },
  });
}

/** DELETE /api/links/:id  (admin) */
async function deleteLink(req, res) {
  const id = String(req.params.id || '').toLowerCase();
  if (!isValidId(id)) {
    throw httpError(400, 'Invalid link ID.');
  }

  const linkRef = ref(`links/${id}`);
  const snapshot = await linkRef.once('value');
  if (!snapshot.exists()) {
    throw httpError(404, 'Link not found.');
  }

  await linkRef.remove();
  try {
    await deleteImage(id);
  } catch (err) {
    console.error('[delete] could not remove image:', err.message);
  }

  res.json({ message: 'Link deleted.', id });
}

/** GET /api/links/public/:id  (public) -> data for the Intermediate Page */
async function getPublicLink(req, res) {
  const id = String(req.params.id || '').toLowerCase();
  if (!isValidId(id)) {
    throw httpError(404, 'Link not found.');
  }

  const snapshot = await ref(`links/${id}`).once('value');
  const link = snapshot.val();
  if (!link) {
    throw httpError(404, 'Link not found.');
  }

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    id: link.id,
    title: link.title,
    description: link.description || '',
    imageUrl: link.imageUrl,
  });
}

/** Count one real visit (called by the /v/:id route, never for bots) */
async function recordClick(id) {
  const today = getDateKey();
  await db.ref().update({
    [`links/${id}/clicks`]: increment(1),
    'stats/totalClicks': increment(1),
    [`stats/daily/${today}`]: increment(1),
  });
}

module.exports = {
  isValidId,
  createLink,
  listLinks,
  deleteLink,
  getPublicLink,
  recordClick,
};
