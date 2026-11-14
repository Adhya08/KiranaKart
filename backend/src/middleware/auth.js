/**
 * Authentication & Role-Based Access Control (RBAC) Middleware
 * Security Controls: C-A01-02 (Admin RBAC), C-A07-02 (Revocation), C-A07-03 (Algorithm pinning)
 */

const cryptoService = require('../services/cryptoService');
const userRepo = require('../repositories/userRepo');
const auditService = require('../services/auditService');

function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication credentials required',
      correlation_id: req.correlationId
    });
  }

  try {
    const decoded = cryptoService.verifyJwt(token);
    const user = userRepo.findById(decoded.id);

    if (!user || user.status === 'erased' || user.status === 'suspended') {
      return res.status(401).json({ error: 'User account inactive or erased' });
    }

    req.currentUser = user;
    req.token = token;
    next();
  } catch (err) {
    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      action: 'AUTH_TOKEN_VERIFICATION_FAILURE',
      resource: req.path,
      ipAddress: req.ip,
      status: 'DENIED',
      details: { error: err.message }
    });

    return res.status(401).json({
      error: 'Invalid or expired session token',
      correlation_id: req.correlationId
    });
  }
}

/**
 * Role-Based Access Control Middleware (C-A01-02)
 * Deny by default; user must possess at least one allowed role.
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.currentUser.role)) {
      auditService.logSecurityEvent({
        correlationId: req.correlationId,
        userId: req.currentUser.id,
        action: 'UNAUTHORIZED_ROLE_ACCESS_ATTEMPT',
        resource: req.path,
        ipAddress: req.ip,
        status: 'FORBIDDEN',
        details: { userRole: req.currentUser.role, requiredRoles: allowedRoles }
      });

      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges for this resource',
        correlation_id: req.correlationId
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};

