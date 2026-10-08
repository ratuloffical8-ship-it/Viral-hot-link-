const express = require('express');
const { requireAdmin } = require('../middleware/telegramAuth');
const { getMonetagSettings, saveMonetagSettings } = require('../utils/settings');
const { getBackgroundImages, asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Mounted at /api/monetag in server.js

/**
 * PUBLIC: used by the Intermediate Page to load ads and background images.
 * GET /api/monetag/public
 */
router.get(
  '/public',
  asyncHandler(async (req, res) => {
    const settings = await getMonetagSettings();

    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      enabled: settings.enabled,
      domain: settings.domain,
      zoneId: settings.zoneId,
      metaContent: settings.metaContent,
      directLink: settings.showDirectLinkButton ? settings.directLink : '',
      backgroundImages: getBackgroundImages(),
    });
  })
);

/**
 * ADMIN: read current Monetag settings.
 * GET /api/monetag
 */
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getMonetagSettings({ fresh: true });
    res.json({ settings });
  })
);

/**
 * ADMIN: save Monetag settings.
 * PUT /api/monetag
 * Body: { enabled, domain, zoneId, metaContent, directLink, showDirectLinkButton }
 */
router.put(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const settings = await saveMonetagSettings(req.body);
    res.json({ message: 'Monetag settings saved.', settings });
  })
);

module.exports = router;
