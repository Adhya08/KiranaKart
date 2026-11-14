/**
 * Audit Logging Service
 * Security Controls: C-A09-02 (Security event auditing), C-A09-01 (PII and secret redaction)
 */

const db = require('../repositories/db');
const cryptoService = require('./cryptoService');

function logSecurityEvent({ correlationId, userId = null, action, resource, ipAddress = '127.0.0.1', status, details = {} }) {
  const auditId = `aud_${cryptoService.generateSecureToken(12)}`;
  const now = new Date().toISOString();

  // Redact any sensitive keys before logging
  const sanitizedDetails = redactSensitiveFields(details);

  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, correlation_id, user_id, action, resource, ip_address, status, details_redacted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      auditId,
      correlationId || `corr_${cryptoService.generateSecureToken(8)}`,
      userId,
      action,
      resource,
      ipAddress,
      status,
      JSON.stringify(sanitizedDetails),
      now
    );
  } catch (err) {
    // Audit log write failure should fail safely without crashing app
    console.error('Failed to persist audit log:', err.message);
  }
}

function redactSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = new Set(['password', 'token', 'otp', 'card', 'cvv', 'secret', 'auth_tag', 'dob']);

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveFields(redacted[key]);
    }
  }
  return redacted;
}

function getRecentAuditLogs(limit = 50) {
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit);
}

module.exports = {
  logSecurityEvent,
  redactSensitiveFields,
  getRecentAuditLogs
};

