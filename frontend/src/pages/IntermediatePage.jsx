import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import './IntermediatePage.css';

const SECONDS_PER_IMAGE = 1.3; // one new image arrives every 1.3 seconds
const ROW_SIZE = 10; // images per row
const MIN_TILES = 8; // repeat small lists so a row always fills the screen width
const DOMAIN_REGEX = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** Repeat a short list until it has enough tiles to fill the screen */
function fillTiles(list) {
  if (list.length === 0) return [];
  const out = [];
  while (out.length < MIN_TILES) {
    out.push(...list);
  }
  return out;
}

/** One scrolling row of equal-sized image tiles (direction: 'left' | 'right') */
function MarqueeRow({ tiles, direction, onFail }) {
  if (tiles.length === 0) return null;

  // The list is shown twice, so the loop restarts without any visible jump
  const loop = [...tiles, ...tiles];
  const duration = `${(tiles.length * SECONDS_PER_IMAGE).toFixed(2)}s`;

  return (
    <div className="ip-row" aria-hidden="true">
      <div className={`ip-track ip-track-${direction}`} style={{ animationDuration: duration }}>
        {loop.map((item, i) => (
          <div className="ip-tile" key={`${i}-${item.src}`}>
            <img
              src={item.src}
              alt=""
              decoding="async"
              draggable="false"
              referrerPolicy="no-referrer"
              onError={() => onFail(item.index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntermediatePage() {
  const { id } = useParams();
  const [link, setLink] = useState(null);
  const [ads, setAds] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound
  const [failed, setFailed] = useState({});
  const [opened, setOpened] = useState(false);

  // Load link info + Monetag settings
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setOpened(false);

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

  // Monetag: load ads ONLY when the link exists and ads are enabled
  useEffect(() => {
    if (status !== 'ready' || !ads) return undefined;

    if (!ads.enabled) {
      // Ads turned off from the dashboard: remove any old service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((list) => list.forEach((reg) => reg.unregister()))
          .catch(() => {});
      }
      return undefined;
    }

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
  }, [status, ads]);

  // Top row = first 10 images. Bottom row = images 11-20 when they exist,
  // otherwise the same images in reverse order.
  const { topTiles, bottomTiles } = useMemo(() => {
    const all = ((ads && ads.backgroundImages) || [])
      .map((src, index) => ({ src, index }))
      .filter((item) => !failed[item.index]);

    const top = all.slice(0, ROW_SIZE);
    const bottom = all.length > ROW_SIZE ? all.slice(ROW_SIZE, ROW_SIZE * 2) : [...top].reverse();

    return { topTiles: fillTiles(top), bottomTiles: fillTiles(bottom) };
  }, [ads, failed]);

  function markFailed(index) {
    setFailed((prev) => (prev[index] ? prev : { ...prev, [index]: true }));
  }

  function handleWatch() {
    if (!directLink) return;
    setOpened(true);
    // Opens in a new tab so the visitor keeps this page
    window.open(directLink, '_blank', 'noopener,noreferrer');
  }

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
      {/* Top row: moves to the left */}
      <MarqueeRow tiles={topTiles} direction="left" onFail={markFailed} />

      {/* Middle: link card with the Watch now button */}
      <main className="ip-center">
        <div className="ip-card">
          {link.imageUrl && (
            <img className="ip-cover" src={link.imageUrl} alt="" referrerPolicy="no-referrer" />
          )}
          <h1 className="ip-title">{link.title}</h1>
          {link.description && <p className="ip-desc">{link.description}</p>}

          {directLink && (
            <button type="button" className="ip-btn" onClick={handleWatch}>
              {opened ? 'Watch again' : 'Watch now'}
            </button>
          )}

          <p className="ip-note">
            Sponsored: tapping Watch now opens a sponsored page. Ads may also be shown on this page.
          </p>
          <button type="button" className="ip-leave" onClick={handleLeave}>
            Leave page
          </button>
        </div>
      </main>

      {/* Bottom row: moves to the right */}
      <MarqueeRow tiles={bottomTiles} direction="right" onFail={markFailed} />
    </div>
  );
    }
