import { useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY = {
  enabled: true,
  domain: '',
  zoneId: '',
  metaContent: '',
  directLink: '',
  showDirectLinkButton: true,
};

export default function MonetagSettings() {
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMonetag()
      .then((data) => {
        if (!cancelled) setForm({ ...EMPTY, ...data.settings });
      })
      .catch((err) => {
        if (!cancelled) setMessage({ type: 'error', text: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const data = await api.saveMonetag(form);
      setForm({ ...EMPTY, ...data.settings });
      setMessage({ type: 'success', text: 'Monetag settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="row" style={{ alignItems: 'center' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          ⚙️ Monetag Settings
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ flex: '0 0 auto' }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide' : 'Edit'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSave} style={{ marginTop: 14 }}>
          {loading ? (
            <p className="hint">Loading...</p>
          ) : (
            <>
              {message && <div className={`notice ${message.type}`}>{message.text}</div>}

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => update('enabled', e.target.checked)}
                />
                Enable Monetag ads
              </label>

              <div className="field">
                <label htmlFor="mt-domain">Domain</label>
                <input
                  id="mt-domain"
                  className="input"
                  value={form.domain}
                  onChange={(e) => update('domain', e.target.value)}
                  placeholder="3nbf4.com"
                  autoCapitalize="none"
                />
              </div>

              <div className="field">
                <label htmlFor="mt-zone">Zone ID</label>
                <input
                  id="mt-zone"
                  className="input"
                  inputMode="numeric"
                  value={form.zoneId}
                  onChange={(e) => update('zoneId', e.target.value)}
                  placeholder="11984257"
                />
              </div>

              <div className="field">
                <label htmlFor="mt-meta">Meta Tag Content</label>
                <input
                  id="mt-meta"
                  className="input"
                  value={form.metaContent}
                  onChange={(e) => update('metaContent', e.target.value)}
                  placeholder="c5d47a0233493b07fc81743d5b51c253"
                  autoCapitalize="none"
                />
              </div>

              <div className="field">
                <label htmlFor="mt-direct">Direct Link (optional button)</label>
                <input
                  id="mt-direct"
                  className="input"
                  value={form.directLink}
                  onChange={(e) => update('directLink', e.target.value)}
                  placeholder="https://uplcm.com/4/11984259"
                  autoCapitalize="none"
                />
              </div>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.showDirectLinkButton}
                  onChange={(e) => update('showDirectLinkButton', e.target.checked)}
                />
                Show Direct Link button on the page
              </label>

              <button type="submit" className="btn btn-block" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  );
    }
