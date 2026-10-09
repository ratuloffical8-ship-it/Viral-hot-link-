require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Firebase early so a bad config fails fast
require('./utils/firebase');

const pingRoutes = require('./routes/ping');
const linksRoutes = require('./routes/links');
const monetagRoutes = require('./routes/monetag');
const shareRoutes = require('./routes/share');
const imgRoutes = require('./routes/img');
const { getMonetagSettings } = require('./utils/settings');
const { escapeHtml } = require('./utils/helpers');
const { notFoundApi, errorHandler } = require('./middleware/errorHandler');
const { startKeepAlive, stopKeepAlive } = require('./utils/keepAlive');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const indexPath = path.join(distPath, 'index.html');

// Render sits behind a proxy
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false, // Monetag + Telegram scripts need to load freely
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false, // Telegram Web opens Mini Apps inside an iframe
  })
);

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }));

app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.',
});

// Images are cached for a year by browsers, so this only stops abuse
const imgLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.',
});

// ---------- Routes ----------
app.use('/ping', pingRoutes);
app.use('/api', apiLimiter);
app.use('/api/links', linksRoutes);
app.use('/api/monetag', monetagRoutes);
app.use('/api', notFoundApi);
app.use('/v', shareLimiter, shareRoutes);
app.use('/img', imgLimiter, imgRoutes);

// ---------- Frontend (React build) ----------
let indexCache = null;

function getIndexHtml() {
  if (indexCache !== null) return indexCache;
  if (!fs.existsSync(indexPath)) return null;
  indexCache = fs.readFileSync(indexPath, 'utf8');
  return indexCache;
}

/** Serve index.html with the Monetag verification meta tag injected */
async function sendIndex(req, res, next) {
  try {
    const html = getIndexHtml();
    if (!html) {
      return res
        .status(503)
        .type('text/plain')
        .send('API is running. Frontend build not found. Run "npm run build" inside the frontend folder.');
    }

    let output = html;
    try {
      const settings = await getMonetagSettings();
      if (settings.enabled && settings.metaContent) {
        const tag = `<meta name="monetag" content="${escapeHtml(settings.metaContent)}">`;
        output = html.replace('</head>', () => `  ${tag}\n</head>`);
      }
    } catch (err) {
      console.error('[monetag] could not inject meta tag:', err.message);
    }

    res.set('Cache-Control', 'no-store');
    return res.type('html').send(output);
  } catch (err) {
    return next(err);
  }
}

app.use(
  express.static(distPath, {
    index: false,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      // The service worker must always be re-checked by the browser
      if (path.basename(filePath) === 'sw.js') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);
app.get(/^\/(?!api(\/|$)|v\/|img\/|ping(\/|$)).*/, sendIndex);

// ---------- Errors ----------
app.use(errorHandler);

// ---------- Start ----------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  startKeepAlive();
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  stopKeepAlive();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

module.exports = app;
