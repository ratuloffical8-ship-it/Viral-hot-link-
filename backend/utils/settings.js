const { ref, serverTimestamp } = require('./firebase');
const { httpError } = require('./helpers');

const SETTINGS_PATH = 'settings/monetag';
const CACHE_TTL_MS = 30 * 1000;

let cache = { value: null, expiresAt: 0 };

/** Defaults come from Render environment variables (used only until settings are saved once) */
function envDefaults() {
  return {
    enabled: true,
    domain: process.env.MONETAG_DOMAIN || '',
    zoneId: process.env.MONETAG_ZONE_ID || '',
    metaContent: process.env.MONETAG_META_CONTENT || '',
    directLink: process.env.MONETAG_DIRECT_LINK || '',
    showDirectLinkButton: true,
  };
}

/** Validate and clean Monetag settings coming from the dashboard */
function sanitizeMonetagInput(input) {
  if (!input || typeof input !== 'object') {
    throw httpError(400, 'Invalid settings data.');
  }

  const domain = String(input.domain || '').trim().toLowerCase();
  const zoneId = String(input.zoneId || '').trim();
  const metaContent = String(input.metaContent || '').trim();
  const directLink = String(input.directLink || '').trim();

  if (domain && !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    throw httpError(400, 'Domain is invalid. Example: 3nbf4.com');
  }
  if (zoneId && !/^\d{3,12}$/.test(zoneId)) {
    throw httpError(400, 'Zone ID must be numeric.');
  }
  if (metaContent && !/^[A-Za-z0-9_-]{8,128}$/.test(metaContent)) {
    throw httpError(400, 'Meta content is invalid.');
  }
  if (directLink && !/^https:\/\/[^\s"'<>]+$/i.test(directLink)) {
    throw httpError(400, 'Direct link must be a valid https URL.');
  }

  return {
    enabled: input.enabled !== false,
    domain,
    zoneId,
    metaContent,
    directLink,
    showDirectLinkButton: input.showDirectLinkButton !== false,
  };
}

/**
 * Once settings have been saved from the dashboard, the saved values win,
 * even when a field was cleared on purpose (empty string).
 * Env values are only the starting point before the first save.
 */
function mergeSettings(defaults, saved) {
  const merged = { ...defaults };
  if (!saved || typeof saved !== 'object') return merged;

  ['domain', 'zoneId', 'metaContent', 'directLink'].forEach((key) => {
    if (typeof saved[key] === 'string') {
      merged[key] = saved[key].trim();
    } else if (saved[key] === undefined || saved[key] === null) {
      // Firebase drops empty values in some cases: treat a saved record with a
      // missing field as "cleared", not as "use env".
      merged[key] = '';
    }
  });
  if (typeof saved.enabled === 'boolean') merged.enabled = saved.enabled;
  if (typeof saved.showDirectLinkButton === 'boolean') {
    merged.showDirectLinkButton = saved.showDirectLinkButton;
  }
  return merged;
}

async function getMonetagSettings({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cache.value && cache.expiresAt > now) {
    return cache.value;
  }

  const snapshot = await ref(SETTINGS_PATH).once('value');
  const value = mergeSettings(envDefaults(), snapshot.val());

  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

async function saveMonetagSettings(input) {
  const clean = sanitizeMonetagInput(input);
  await ref(SETTINGS_PATH).set({ ...clean, updatedAt: serverTimestamp });
  cache = { value: null, expiresAt: 0 };
  return getMonetagSettings({ fresh: true });
}

module.exports = {
  getMonetagSettings,
  saveMonetagSettings,
  sanitizeMonetagInput,
};
