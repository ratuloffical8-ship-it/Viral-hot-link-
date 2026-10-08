const crypto = require('crypto');

// Short-link alphabet: no confusing characters (0/o, 1/l/i)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Generate a random short ID, e.g. "x8k2pa" */
function generateId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i += 1) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

/** Escape text before putting it into HTML / meta tags */
function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BOT_REGEX =
  /facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|slackbot|linkedinbot|discordbot|skypeuripreview|pinterest|googlebot|bingbot|applebot|embedly|vkshare|redditbot|bot\b|crawler|spider|preview|curl|wget/i;

/** True if the User-Agent looks like a link-preview bot or crawler */
function isBot(userAgent) {
  return BOT_REGEX.test(String(userAgent || ''));
}

/** Today's date key (YYYY-MM-DD) in the configured timezone (default Asia/Dhaka) */
function getDateKey(date = new Date()) {
  const timeZone = process.env.TIMEZONE || 'Asia/Dhaka';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Build the list of GitHub raw image URLs used as intermediate page backgrounds */
function getBackgroundImages() {
  const user = process.env.GITHUB_USER;
  const repo = process.env.GITHUB_REPO;
  if (!user || !repo) return [];

  const branch = process.env.GITHUB_BRANCH || 'main';
  const path = (process.env.GITHUB_IMAGES_PATH || 'images').replace(/^\/+|\/+$/g, '');
  const count = Math.min(Math.max(Number(process.env.BACKGROUND_IMAGE_COUNT) || 10, 1), 50);
  const ext = (process.env.BACKGROUND_IMAGE_EXT || 'jpg').replace(/^\./, '');

  const base = `https://raw.githubusercontent.com/${user}/${repo}/${branch}${path ? `/${path}` : ''}`;
  return Array.from({ length: count }, (_, i) => `${base}/${i + 1}.${ext}`);
}

/** Public base URL of this site (no trailing slash) */
function getBaseUrl(req) {
  const fromEnv = process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (req) return `${req.protocol}://${req.get('host')}`;
  return '';
}

/** Wrap an async Express handler so errors reach the error middleware */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Create an Error that carries an HTTP status code */
function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = {
  generateId,
  escapeHtml,
  isBot,
  getDateKey,
  getBackgroundImages,
  getBaseUrl,
  asyncHandler,
  httpError,
};
