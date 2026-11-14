/**
 * Health Check Routes
 * Hard Negative: HN-08 (Unauthenticated static health check, safe from information leakage)
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    application: 'KiranaKart Secure Reference App',
    baseline_version: '2026.1',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

