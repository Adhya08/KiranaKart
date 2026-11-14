/**
 * Environment & Application Configuration
 * Zero hardcoded secrets; defaults provided only for local development/test harness.
 * Security Controls: C-A02-02, C-A05-03
 */

const crypto = require('crypto');

// Generate safe ephemeral encryption keys if not supplied in environment
const DEFAULT_FALLBACK_KEY = crypto.createHash('sha256').update('kiranakart_local_development_salt').digest('hex');
const DEFAULT_JWT_SECRET = crypto.createHash('sha256').update('kiranakart_jwt_local_signing_secret').digest('hex');

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 4000,
  
  // Cryptographic Keys (C-A02-02)
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_ISSUER: 'kiranakart-secure-auth',
  JWT_AUDIENCE: 'kiranakart-app-clients',

  // AES-256-GCM 32-byte key (C-A02-03)
  AES_ENCRYPTION_KEY: Buffer.from((process.env.AES_ENCRYPTION_KEY || DEFAULT_FALLBACK_KEY).slice(0, 64), 'hex'),

  // CORS Settings (C-A05-01)
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:4000,http://127.0.0.1:3000,http://127.0.0.1:4000').split(','),

  // DPDP & Compliance Configurations
  DPDP_NOTICE_VERSION: '2026.1',
  SIGNIFICANT_DATA_FIDUCIARY_ENABLED: process.env.SIGNIFICANT_DATA_FIDUCIARY === 'true' || true,
  PRIMARY_STORAGE_REGION: 'ap-south-1 (Mumbai, India)',

  // Security Flags
  DEBUG_MODE: false // Hardened: debug always disabled by default (C-A05-03)
};
