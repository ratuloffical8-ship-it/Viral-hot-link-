const express = require('express');
const { asyncHandler, httpError } = require('../utils/helpers');
const { loadImage } = require('../utils/imageStore');

const router = express.Router();

// Mounted at /img in server.js
// /img/abc123.jpg (full image)  and  /img/abc123_t.jpg (thumbnail)
router.get(
  '/:file',
  asyncHandler(async (req, res) => {
    const match = /^([a-z0-9]{4,12})(_t)?\.jpg$/.exec(String(req.params.file || ''));
    if (!match) {
      throw httpError(404, 'Image not found.');
    }

    const buffer = await loadImage(match[1], match[2] ? 'thumb' : 'main');
    if (!buffer) {
      throw httpError(404, 'Image not found.');
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(buffer);
  })
);

module.exports = router;
