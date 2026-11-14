/**
 * Structured Security Logger & CRLF Injection Neutralizer
 * Security Controls: C-A09-01 (PII/Secret Redaction), C-A09-03 (CRLF Neutralization / CWE-117)
 */

function neutralizeCrlf(input) {
  if (typeof input !== 'string') return input;
  // Replace newlines and carriage returns with safe representations
  return input.replace(/[\r\n]/g, ' [CRLF_DEFUSED] ');
}

function scrubPiiAndSecrets(body) {
  if (!body || typeof body !== 'object') return body;
  const scrubbed = { ...body };
  const sensitiveKeys = ['password', 'token', 'otp', 'card', 'cvv', 'secret', 'dob', 'phone'];

  for (const key of Object.keys(scrubbed)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      scrubbed[key] = '[REDACTED_BY_SECURITY_LOGGER]';
    } else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
      scrubbed[key] = scrubPiiAndSecrets(scrubbed[key]);
    }
  }
  return scrubbed;
}

function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logPayload = {
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      method: req.method,
      path: neutralizeCrlf(req.path),
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip || req.connection?.remoteAddress
    };

    // Output single structured JSON line
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(logPayload));
    }
  });

  next();
}

module.exports = {
  requestLoggingMiddleware,
  neutralizeCrlf,
  scrubPiiAndSecrets
};

