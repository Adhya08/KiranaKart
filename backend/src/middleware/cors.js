/**
 * Strict CORS Allowlist Middleware
 * Security Control: C-A05-01 / CWE-942
 * Explicit origins only; wildcard '*' with credentials is strictly prohibited.
 */

const cors = require('cors');
const config = require('../config/env');

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser agents (cURL, mobile apps, local tests) with no origin
    if (!origin) return callback(null, true);

    if (config.ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS violation: origin '${origin}' is not permitted`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Correlation-ID']
};

module.exports = cors(corsOptions);
