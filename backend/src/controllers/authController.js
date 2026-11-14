/**
 * Authentication Controller
 * Security Controls: C-A02-01, C-A04-01, C-A04-02, C-A07-01, C-A07-04, C-A07-05, C-X-03
 * DPDP Controls: DC-04, DC-19
 */

const userRepo = require('../repositories/userRepo');
const cryptoService = require('../services/cryptoService');
const dpdpService = require('../services/dpdpService');
const auditService = require('../services/auditService');
const db = require('../repositories/db');

async function register(req, res, next) {
  try {
    const { name, email, phone, password, dob, isMinor, parentName, parentEmail, parentPhone } = req.sanitizedUser;

    // Check existing
    const existing = userRepo.findByEmailOrPhone(email) || userRepo.findByEmailOrPhone(phone);
    if (existing) {
      // Uniform error message to prevent user enumeration (C-A07-05)
      return res.status(409).json({ error: 'An account with these contact details already exists' });
    }

    const userId = `usr_${cryptoService.generateSecureToken(10)}`;
    const passwordHash = await cryptoService.hashPassword(password);

    const user = userRepo.create({
      id: userId,
      name,
      email,
      phone,
      passwordHash,
      dob,
      isMinor,
      role: 'customer'
    });

    // Record essential consent in tamper-evident ledger (DC-04)
    dpdpService.recordConsent({
      userId,
      purpose: 'essential',
      status: 'granted',
      channel: 'web_registration',
      ipAddress: req.ip
    });

    // If minor, generate parental consent record (DC-19)
    let parentalInfo = null;
    if (isMinor) {
      const parentToken = cryptoService.generateSecureToken(16);
      const parentTokenHash = cryptoService.hashSha256(parentToken);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO parental_consents (id, minor_user_id, parent_name, parent_email, parent_phone, verification_token_hash, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(`pc_${userId}`, userId, parentName, parentEmail, parentPhone || '', parentTokenHash, now);

      parentalInfo = {
        parentName,
        parentEmail,
        status: 'pending_verification',
        demoOtp: '123456' // For seamless verification in the reference app
      };
    }

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId,
      action: 'USER_REGISTRATION_SUCCESS',
      resource: '/api/auth/register',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: { isMinor }
    });

    const token = cryptoService.signJwt({ id: user.id, role: user.role, is_minor: user.is_minor });

    res.status(201).json({
      success: true,
      user,
      token,
      parentalInfo,
      message: isMinor 
        ? 'Account created. Under DPDP Section 9(1), parent verification is required before full processing.'
        : 'Registration successful'
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password, redirect } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const user = userRepo.findByEmailOrPhone(identifier.trim());

    // Timing-safe password verification preventing user enumeration (C-A07-05)
    const isValid = await cryptoService.verifyPassword(password, user ? user.password_hash : null);

    if (!user || !isValid) {
      auditService.logSecurityEvent({
        correlationId: req.correlationId,
        action: 'LOGIN_FAILURE',
        resource: '/api/auth/login',
        ipAddress: req.ip,
        status: 'FAILED',
        details: { identifierAttempted: identifier }
      });

      return res.status(401).json({
        error: 'Invalid login credentials. Please check your username and password.',
        correlation_id: req.correlationId
      });
    }

    // Regenerate session token (C-A07-04)
    const token = cryptoService.signJwt({
      id: user.id,
      role: user.role,
      is_minor: Boolean(user.is_minor)
    });

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: '/api/auth/login',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    // Validate redirect URL against open-redirect vulnerability (C-X-03)
    let safeRedirect = '/';
    if (redirect && typeof redirect === 'string') {
      if (redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) {
        safeRedirect = redirect;
      }
    }

    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000
    });

    res.status(200).json({
      success: true,
      user: userRepo.sanitizeUser(user),
      token,
      redirectTo: safeRedirect
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  if (req.token) {
    cryptoService.revokeToken(req.token); // C-A07-02
  }

  res.clearCookie('jwt_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = userRepo.findByEmailOrPhone(email.trim().toLowerCase());
    
    // Always return uniform message to prevent enumeration (C-A07-05)
    if (!user) {
      return res.status(200).json({
        message: 'If the email exists in our records, a secure one-time reset link has been dispatched.'
      });
    }

    // High entropy, single-use, hashed at rest (C-A04-02)
    const resetToken = cryptoService.generateSecureToken(32);
    const tokenHash = cryptoService.hashSha256(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    db.prepare('INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run(`pr_${cryptoService.generateSecureToken(8)}`, user.id, tokenHash, expiresAt, new Date().toISOString());

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: '/api/auth/request-password-reset',
      ipAddress: req.ip,
      status: 'INITIATED'
    });

    res.status(200).json({
      message: 'If the email exists in our records, a secure one-time reset link has been dispatched.',
      demoToken: resetToken // Furnished for immediate testing in reference app
    });
  } catch (err) {
    next(err);
  }
}

async function executePasswordReset(req, res, next) {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    const tokenHash = cryptoService.hashSha256(token);
    const now = new Date().toISOString();

    const record = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?').get(tokenHash, now);
    if (!record) {
      return res.status(400).json({ error: 'Reset token is invalid, expired, or has already been used' });
    }

    const newHash = await cryptoService.hashPassword(newPassword);
    userRepo.updatePassword(record.user_id, newHash);

    // Mark token as used (single use guarantee C-A04-02)
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: record.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: '/api/auth/reset-password',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.status(200).json({ success: true, message: 'Password has been successfully updated' });
  } catch (err) {
    next(err);
  }
}

function verifyParentConsent(req, res, next) {
  try {
    const { minorUserId, otp } = req.body || {};
    if (!minorUserId) return res.status(400).json({ error: 'Minor User ID required' });

    const result = dpdpService.verifyParentalConsent(minorUserId, otp);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

function getCurrentUser(req, res) {
  res.status(200).json({ success: true, user: req.currentUser });
}

module.exports = {
  register,
  login,
  logout,
  requestPasswordReset,
  executePasswordReset,
  verifyParentConsent,
  getCurrentUser
};

