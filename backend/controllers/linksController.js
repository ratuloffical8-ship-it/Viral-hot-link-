const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/telegramAuth');
const { asyncHandler, httpError } = require('../utils/helpers');
const {
  createLink,
  listLinks,
  deleteLink,
  getPublicLink,
  listPublicLinks,
} = require('../controllers/linksController');

const router = express.Router();

// Mounted at /api/links in server.js

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(httpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed.'));
    }
  },
});

// PUBLIC: other links for the "More to watch" section
router.get('/public', asyncHandler(listPublicLinks));

// PUBLIC: link info for the Intermediate Page
router.get('/public/:id', asyncHandler(getPublicLink));

// ADMIN ONLY below
router.get('/', requireAdmin, asyncHandler(listLinks));
router.post('/', requireAdmin, upload.single('image'), asyncHandler(createLink));
router.delete('/:id', requireAdmin, asyncHandler(deleteLink));

module.exports = router;
