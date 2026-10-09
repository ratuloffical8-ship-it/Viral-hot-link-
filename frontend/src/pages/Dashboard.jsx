import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, copyText } from '../api.js';
import MonetagSettings from '../components/MonetagSettings.jsx';

function confirmDialog(message) {
  return new Promise((resolve) => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && typeof tg.showConfirm === 'function') {
      try {
        tg.showConfirm(message, (ok) => resolve(Boolean(ok)));
        return;
      } catch (err) {
        // fall back to browser confirm
      }
    }
    resolve(window.confirm(message));
  });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, todayClicks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listLinks();
      setLinks(data.links);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCopy(link) {
    const ok = await copyText(link.shortUrl);
    if (ok) {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(''), 1800);
    } else {
      setError('Could not copy. Please copy the link manually.');
    }
  }

  async function handleDelete(link) {
    const ok = await confirmDialog(`Delete "${link.title}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingId(link.id);
    setError('');
    try {
      await api.deleteLink(link.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats.totalLinks}</div>
          <div className="stat-label">Links</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.totalClicks}</div>
          <div className="stat-label">Total clicks</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.todayClicks}</div>
          <div className="stat-label">Today</div>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      <section className="card">
        <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            All Generated Links
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ flex: '0 0 auto' }}
            onClick={load}
            disabled={loading}
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {!loading && links.length === 0 && (
          <div className="empty">
            <p>No links yet.</p>
            <Link className="btn btn-sm" to="/create">
              Create your first link
            </Link>
          </div>
        )}

        {links.map((link) => (
          <div className="link-item" key={link.id}>
            <img className="link-thumb" src={link.thumbUrl} alt="" loading="lazy" />
            <div className="link-body">
              <div className="link-title">{link.title}</div>
              <div className="link-url">{link.shortUrl}</div>
              <div className="link-meta">
                👁 <strong>{link.clicks}</strong> clicks · {formatDate(link.createdAt)}
              </div>
              <div className="link-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCopy(link)}>
                  {copiedId === link.id ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(link)}
                  disabled={deletingId === link.id}
                >
                  {deletingId === link.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <MonetagSettings />
    </div>
  );
                     }
