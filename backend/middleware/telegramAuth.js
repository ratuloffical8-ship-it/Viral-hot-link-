const crypto = require('crypto');

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // initData valid for 24 hours

function getAdminIds() {
  return new Set(
    String(process.env.ADMIN_TELEGRAM_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

/**
 * Validate Telegram Mini App initData.
 * Returns the Telegram user object, or null if invalid.
 */
function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) return null;
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(calculatedHash, 'hex');
  const b = Buffer.from(receivedHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > MAX_AUTH_AGE_SECONDS) {
    return null;
  }

  try {
    const user = JSON.parse(params.get('user') || '');
    return user && user.id ? user : null;
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware: only the admins listed in ADMIN_TELEGRAM_IDS may pass.
 * Frontend must send header:  Authorization: tma <initData>
 */
function requireAdmin(req, res, next) {
  const adminIds = getAdminIds();
  if (adminIds.size === 0) {
    return res.status(500).json({ error: 'ADMIN_TELEGRAM_IDS is not configured.' });
  }

  // Local development helper (never active in production)
  if (process.env.NODE_ENV === 'development') {
    const devId = req.get('x-dev-admin-id');
    if (devId && adminIds.has(String(devId))) {
      req.admin = { id: String(devId), username: 'dev' };
      return next();
    }
  }

  const header = req.get('authorization') || '';
  const [scheme, ...rest] = header.split(' ');
  const initData = rest.join(' ');

  if (String(scheme).toLowerCase() !== 'tma' || !initData) {
    return res.status(401).json({ error: 'Unauthorized. Open this app from Telegram.' });
  }

  const user = validateInitData(initData, process.env.BOT_TOKEN);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired Telegram session.' });
  }

  if (!adminIds.has(String(user.id))) {
    return res.status(403).json({ error: 'You are not allowed to use this app.' });
  }

  req.admin = { id: String(user.id), username: user.username || '', name: user.first_name || '' };
  return next();
}

module.exports = { requireAdmin, validateInitData, getAdminIds };
