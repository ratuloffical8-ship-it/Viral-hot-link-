import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import './IntermediatePage.css';

const SLIDE_INTERVAL_MS = 5000;
const DOMAIN_REGEX = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export default function IntermediatePage() {
  const { id } = useParams();
  const [link, setLink] = useState(null);
  const [ads, setAds] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState({});

  // Load link info + Monetag settings
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([api.getPublicLink(id), api.getMonetagPublic()]).then(([linkResult, adsResult]) => {
      if (cancelled) return;

      if (adsResult.status === 'fulfilled') {
        setAds(adsResult.value);
      }
      if (linkResult.status === 'fulfilled') {
        setLink(linkResult.value);
        setStatus('ready');
      } else {
        setStatus('notfound');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Page title + no-index
  useEffect(() => {
    if (link && link.title) document.title = link.title;

    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => {
      if (robots.parentNode) robots.parentNode.removeChild(robots);
    };
  }, [link]);

  // Load Monetag service worker + zone script
  useEffect(() => {
    if (!ads || !ads.enabled) return undefined;

    const domain = String(ads.domain || '').trim();
    const zoneId = String(ads.zoneId || '').trim();
    if (!DOMAIN_REGEX.test(domain) || !/^\d{3,12}$/.test(zoneId)) return undefined;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker is optional; ads can still load via the zone script
      });
    }

    const script = document.createElement('script');
    script.src = `https://${domain}/act/files/tag.min.js?z=${encodeURIComponent(zoneId)}`;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [ads]);

  // Background images that loaded successfully
  const images = useMemo(() => {
    const all = (ads && ads.backgroundImages) || [];
    return all.map((src, index) => ({ src, index })).filter((item) => !failed[item.index]);
  }, [ads, failed]);

  // Auto-slide
  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  function handleLeave() {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && typeof tg.close === 'function' && tg.initData) {
      tg.close();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  }

  const directLink = ads && ads.directLink;

  if (status === 'loading') {
    return (
      <div className="ip-root">
        <div className="ip-center">
          <div className="ip-spinner" />
        </div>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="ip-root">
        <div className="ip-center">
          <div className="ip-card">
            <h1 className="ip-title">Link not found</h1>
            <p className="ip-desc">This link does not exist or was removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ip-root">
      {/* Sliding background */}
      <div className="ip-bg" aria-hidden="true">
        {images.map((item, position) => (
          <img
            key={item.src}
            className={`ip-slide${position === active % Math.max(images.length, 1) ? ' is-active' : ''}`}
            src={item.src}
            alt=""
            loading={position === 0 ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed((prev) => ({ ...prev, [item.index]: true }))}
          />
        ))}
        <div className="ip-overlay" />
      </div>

      {/* Foreground content */}
      <main className="ip-center">
        <div className="ip-card">
          {link.imageUrl && (
            <img className="ip-cover" src={link.imageUrl} alt="" referrerPolicy="no-referrer" />
          )}
          <h1 className="ip-title">{link.title}</h1>
          {link.description && <p className="ip-desc">{link.description}</p>}

          {directLink && (
            <a className="ip-btn" href={directLink} target="_blank" rel="noopener noreferrer sponsored">
              Continue
            </a>
          )}

          <p className="ip-note">Sponsored ads may be shown on this page.</p>
          <button type="button" className="ip-leave" onClick={handleLeave}>
            Leave page
          </button>
        </div>
      </main>
    </div>
  );
         }
