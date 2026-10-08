/**
 * Keep-Alive system for Render Free Tier.
 * Pings the server's own /ping route every N minutes (default: 3)
 * so the service does not go to sleep after 15 minutes of inactivity.
 *
 * Usage (in server.js, after app.listen):
 *   const { startKeepAlive } = require('./utils/keepAlive');
 *   startKeepAlive();
 */
const axios = require('axios');

let timer = null;

function getPingUrl() {
  // Render sets RENDER_EXTERNAL_URL automatically; BASE_URL is the manual fallback
  const base = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/ping`;
}

async function pingSelf(url) {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    console.log(`[KeepAlive] Ping OK (${res.status}) at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[KeepAlive] Ping failed: ${err.message}`);
  }
}

/**
 * Start the keep-alive interval. Safe to call multiple times.
 */
function startKeepAlive() {
  if (timer) return;

  const url = getPingUrl();

  if (!url) {
    console.warn('[KeepAlive] BASE_URL / RENDER_EXTERNAL_URL not set. Keep-alive is disabled.');
    return;
  }

  // Skip in local development
  if (/localhost|127\.0\.0\.1/.test(url)) {
    console.log('[KeepAlive] Local URL detected. Keep-alive is disabled.');
    return;
  }

  const minutes = Number(process.env.KEEP_ALIVE_INTERVAL_MIN) || 3;
  const intervalMs = Math.max(1, minutes) * 60 * 1000;

  timer = setInterval(() => pingSelf(url), intervalMs);

  // Do not block process exit
  if (typeof timer.unref === 'function') timer.unref();

  console.log(`[KeepAlive] Started. Pinging ${url} every ${minutes} minute(s).`);
}

/**
 * Stop the keep-alive interval (useful for graceful shutdown).
 */
function stopKeepAlive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[KeepAlive] Stopped.');
  }
}

module.exports = { startKeepAlive, stopKeepAlive };
