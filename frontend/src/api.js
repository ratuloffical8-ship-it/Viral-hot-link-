const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/** Raw initData string provided by Telegram (empty outside Telegram) */
export function getInitData() {
  return (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';
}

export function inTelegram() {
  return Boolean(getInitData());
}

async function request(path, { method = 'GET', body, formData, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const initData = getInitData();
    if (initData) {
      headers.Authorization = `tma ${initData}`;
    } else if (import.meta.env.DEV && import.meta.env.VITE_DEV_ADMIN_ID) {
      // Local development only (backend NODE_ENV=development)
      headers['x-dev-admin-id'] = import.meta.env.VITE_DEV_ADMIN_ID;
    }
  }

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  } catch (err) {
    throw new Error('Network error. Please check your connection.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    throw new Error((data && data.error) || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  // Admin
  listLinks: () => request('/api/links'),
  createLink: (formData) => request('/api/links', { method: 'POST', formData }),
  deleteLink: (id) => request(`/api/links/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getMonetag: () => request('/api/monetag'),
  saveMonetag: (settings) => request('/api/monetag', { method: 'PUT', body: settings }),

  // Public (Intermediate Page)
  getPublicLink: (id) => request(`/api/links/public/${encodeURIComponent(id)}`, { auth: false }),
  getMonetagPublic: () => request('/api/monetag/public', { auth: false }),
};

/** Copy text to clipboard (works inside Telegram WebView too) */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // fall through to legacy method
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (err) {
    return false;
  }
                 }
