/**
 * HTTP Security Headers & Anti-CSRF Defense
 * Security Controls: C-A02-04 (HSTS, TLS enforcement), C-A05-06 (Helmet headers), C-A01-05 (Anti-CSRF)
 */

const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allowed for bundled React frontend
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://cdn.kiranakart.local"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"], // Defends against clickjacking
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Double-submit cookie anti-CSRF check for state changing operations
 */
function csrfProtection(req, res, next) {
  // Safe methods do not require CSRF tokens
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt auth login/register endpoints which use JSON bodies and Origin header validation
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.['csrf-token'];

  // If using Cookie-based sessions, require token match
  if (csrfCookie) {
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      return res.status(403).json({
        error: 'Invalid or missing CSRF token',
        correlation_id: req.correlationId
      });
    }
  }

  next();
}

module.exports = {
  securityHeaders,
  csrfProtection
};

