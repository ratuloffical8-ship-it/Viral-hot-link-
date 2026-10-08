const { escapeHtml } = require('../utils/helpers');

/** 404 for unknown /api routes */
function notFoundApi(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

function simplePage(status, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${status}</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px}
    h1{font-size:56px;margin:0 0 8px}
    p{margin:0;color:#94a3b8;font-size:16px}
  </style>
</head>
<body>
  <div>
    <h1>${status}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

/** Central error handler */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Server error.';

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'Image is too large. Maximum size is 10 MB.';
    } else {
      status = 400;
      message = `Upload error: ${err.message}`;
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (process.env.NODE_ENV === 'production' && !err.statusCode) {
      message = 'Something went wrong. Please try again.';
    }
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({ error: message });
  }
  return res.status(status).type('html').send(simplePage(status, message));
}

module.exports = { notFoundApi, errorHandler };
