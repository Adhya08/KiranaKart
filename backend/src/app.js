/**
 * Main Express Application Initialization
 * Hardened according to OWASP Top 10:2021 & DPDP Act 2023
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const { securityHeaders, csrfProtection } = require('./middleware/securityHeaders');
const corsMiddleware = require('./middleware/cors');
const { requestLoggingMiddleware } = require('./middleware/logger');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { minorProtectionLockout } = require('./middleware/dpdpMiddleware');

// Route modules
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes');
const orderRoutes = require('./routes/orderRoutes');
const storeRoutes = require('./routes/storeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const privacyRoutes = require('./routes/privacyRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();

// Disable Express fingerprinting header (C-A05-06)
app.disable('x-powered-by');

// 1. Security Headers (Helmet, CSP, HSTS, X-Frame-Options)
app.use(securityHeaders);

// 2. Strict CORS
app.use(corsMiddleware);

// 3. Structured Request Logging with PII Scrubbing and CRLF Defusal
app.use(requestLoggingMiddleware);

// 4. Body Parsers with Caps (prevents large payload DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// 5. General Rate Limiter
app.use('/api/', apiLimiter);

// 6. Anti-CSRF Protection
app.use(csrfProtection);

// 7. DPDP Minor Lockout (DC-20)
app.use(minorProtectionLockout);

// 8. Mount API Routes
app.use(healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/support', supportRoutes);

// 9. Hardened Static Files (No directory listing C-A05-05)
const publicDir = path.resolve(__dirname, '../../frontend/public');
app.use(express.static(publicDir, {
  dotfiles: 'ignore', // Deny access to .git, .env (C-A05-05)
  index: 'index.html',
  maxAge: '1h'
}));

// Single page app fallback for client routes (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found', correlation_id: req.correlationId });
  }
  if (req.method === 'GET') {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  next();
});

// 10. Central Hardened Error Handler (C-A05-02)
app.use(globalErrorHandler);

module.exports = app;
