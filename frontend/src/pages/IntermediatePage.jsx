import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import './IntermediatePage.css';

const SECONDS_PER_IMAGE = 1.3; // one new image arrives every 1.3 seconds
const ROW_SIZE = 10; // images per row
const MIN_TILES = 8; // repeat small lists so a row always fills the screen width

// Monetag ad tags for viral-hot-link.onrender.com (zone IDs come from the Monetag dashboard).
// They are loaded automatically as soon as the page opens, no button tap needed.
const AD_TAGS = [
  { zone: '11992368', src: 'https://n6wxm.com/vignette.min.js' }, // Vignette banner
  { zone: '11992364', src: 'https://nap5k.com/tag.min.js' }, // In-Page Push
  { zone: '11992351', src: 'https://al5sm.com/tag.min.js' }, // OnClick (Popunder)
];

// Push notifications tag (works together with /sw.js on this site)
const PUSH_TAG = { zone: '11992361', src: 'https://5gvci.com/act/files/tag.min.js?z=11992361' };

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

  // Monetag: load every ad tag ONLY when the link exists and ads are enabled
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

    const parent = document.body || document.documentElement;
    const added = [];

    AD_TAGS.forEach((tag) => {
      if (document.querySelector(`script[data-ip-zone="${tag.zone}"]`)) return;
      const script = document.createElement('script');
      script.dataset.zone = tag.zone;
      script.dataset.ipZone = tag.zone;
      script.src = tag.src;
      parent.appendChild(script);
      added.push(script);
    });

    if (!document.querySelector(`script[data-ip-zone="${PUSH_TAG.zone}"]`)) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Service worker is optional; the other ad formats still work
        });
      }
      const push = document.createElement('script');
      push.dataset.ipZone = PUSH_TAG.zone;
      push.src = PUSH_TAG.src;
      push.async = true;
      push.setAttribute('data-cfasync', 'false');
      parent.appendChild(push);
      added.push(push);
    }

    return () => {
      added.forEach((node) => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
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
