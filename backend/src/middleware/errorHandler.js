/**
 * Hardened Global Error Handler Middleware
 * Security Control: C-A05-02 / CWE-209
 * Emits generic error responses with unique correlation IDs; stack traces omitted.
 */

const auditService = require('../services/auditService');

function globalErrorHandler(err, req, res, next) {
  const correlationId = req.correlationId || `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Log full internal error to secure audit log
  auditService.logSecurityEvent({
    correlationId,
    userId: req.currentUser?.id || null,
    action: 'UNHANDLED_SERVER_EXCEPTION',
    resource: req.path,
    ipAddress: req.ip,
    status: 'ERROR',
    details: {
      errorMessage: err.message,
      statusCode: err.status || 500
    }
  });

  const statusCode = err.status || 500;
  const userSafeMessage = statusCode >= 500 
    ? 'An unexpected internal error occurred. Please reference the correlation ID when contacting support.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: userSafeMessage,
    correlation_id: correlationId
  });
}

module.exports = { globalErrorHandler };

