const express = require('express');
const { ref } = require('../utils/firebase');
const { asyncHandler, escapeHtml, isBot, getBaseUrl, httpError } = require('../utils/helpers');
const { isValidId, recordClick } = require('../controllers/linksController');

const router = express.Router();

// Mounted at /v in server.js  ->  GET /v/:id

function renderOgPage({ link, pageUrl, goUrl }) {
  const siteName = process.env.SITE_NAME || 'Viral Link';
  const title = escapeHtml(link.title);
  const description = escapeHtml(link.description || link.title);
  const image = escapeHtml(link.imageUrl);
  const url = escapeHtml(pageUrl);

  const sizeTags =
    link.imageWidth && link.imageHeight
      ? `<meta property="og:image:width" content="${Number(link.imageWidth)}">
  <meta property="og:image:height" content="${Number(link.imageHeight)}">`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  ${sizeTags}
  <meta property="og:url" content="${url}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <link rel="canonical" href="${url}">
  <script>location.replace(${JSON.stringify(goUrl)});</script>
</head>
<body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center;padding:32px">
  <h1 style="font-size:22px">${title}</h1>
  <p><a href="${escapeHtml(goUrl)}" style="color:#38bdf8">Continue</a></p>
</body>
</html>`;
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').toLowerCase();
    if (!isValidId(id)) {
      throw httpError(404, 'This link does not exist or was removed.');
    }

    const snapshot = await ref(`links/${id}`).once('value');
    const link = snapshot.val();
    if (!link) {
      throw httpError(404, 'This link does not exist or was removed.');
    }

    const userAgent = req.get('user-agent') || '';
    const goUrl = `/go/${id}`;

    // Link-preview bots (WhatsApp, Telegram, Facebook...) get the Open Graph page
    if (!userAgent || isBot(userAgent)) {
      const pageUrl = `${getBaseUrl(req)}/v/${id}`;
      res.set('Cache-Control', 'public, max-age=300');
      return res.status(200).type('html').send(renderOgPage({ link, pageUrl, goUrl }));
    }

    // Real visitors: count the click, then open our own Intermediate Page
    if (req.method !== 'HEAD') {
      try {
        await recordClick(id);
      } catch (err) {
        console.error('[click] failed to record click:', err.message);
      }
    }

    res.set('Cache-Control', 'no-store');
    return res.redirect(302, goUrl);
  })
);

module.exports = router;
