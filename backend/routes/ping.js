const express = require('express');

const router = express.Router();

// Mounted at /ping in server.js
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

router.head('/', (req, res) => {
  res.status(200).end();
});

module.exports = router;
