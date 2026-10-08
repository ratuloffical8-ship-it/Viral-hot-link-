const axios = require('axios');

let timer = null;

function resolveBaseUrl() {
  const url = process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';
  return url.replace(/\/+$/, '');
}

async function pingSelf(pingUrl) {
  try {
    const res = await axios.get(pingUrl, { timeout: 15000 });
    console.log(`[keep-alive] ${new Date().toISOString()} ping ${res.status}`);
  } catch (err) {
    console.error(`[keep-alive] ping failed: ${err.message}`);
  }
}

/**
 * Start pinging this server's /ping route so Render free tier does not sleep.
 * Default interval: 3 minutes (KEEP_ALIVE_INTERVAL_MINUTES).
 */
function startKeepAlive() {
  if (timer) return timer;

  if (String(process.env.KEEP_ALIVE_ENABLED).toLowerCase() === 'false') {
    console.log('[keep-alive] disabled via KEEP_ALIVE_ENABLED=false');
    return null;
  }

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    console.warn('[keep-alive] APP_BASE_URL not set. Keep-alive not started.');
    return null;
  }

  const minutes = Number(process.env.KEEP_ALIVE_INTERVAL_MINUTES) || 3;
  const intervalMs = Math.max(1, minutes) * 60 * 1000;
  const pingUrl = `${baseUrl}/ping`;

  console.log(`[keep-alive] started: ${pingUrl} every ${minutes} min`);
  timer = setInterval(() => pingSelf(pingUrl), intervalMs);

  return timer;
}

function stopKeepAlive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[keep-alive] stopped');
  }
}

module.exports = { startKeepAlive, stopKeepAlive };
