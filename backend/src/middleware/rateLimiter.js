/**
 * Progressive Rate Limiting Middleware
 * Security Control: C-A04-01 / CWE-307
 * Rate limiting and progressive lockout on authentication & sensitive endpoints.
 */

const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication endpoints (5 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 60 seconds.',
    status: 429
  }
});

// General API rate limiter (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please slow down.',
    status: 429
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};

