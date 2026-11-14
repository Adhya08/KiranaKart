/**
 * Cryptographic & Token Services
 * Security Controls: C-A02-01, C-A02-03, C-A02-05, C-A07-02, C-A07-03, C-A07-05
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const BCRYPT_SALT_ROUNDS = 12; // C-A02-01: Strong work factor
const revokedTokens = new Set(); // C-A07-02: Server-side token revocation list

/**
 * Hash password with bcrypt and unique salt
 */
async function hashPassword(plainTextPassword) {
  return await bcrypt.hash(plainTextPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Timing-safe password verification
 */
async function verifyPassword(plainTextPassword, storedHash) {
  if (!storedHash) {
    // Prevent timing side-channel attacks by running dummy compare
    await bcrypt.compare('dummy_timing_padding', '$2a$12$e8pYfP16Q6v8jX1g2kP5b.7o9/c9d0e1f2g3h4i5j6k7l8m9n0o1p');
    return false;
  }
  return await bcrypt.compare(plainTextPassword, storedHash);
}

/**
 * Timing-safe string equality comparison
 */
function timingSafeEqual(strA, strB) {
  if (typeof strA !== 'string' || typeof strB !== 'string') {
    return false;
  }
  const bufA = Buffer.from(strA, 'utf8');
  const bufB = Buffer.from(strB, 'utf8');
  if (bufA.length !== bufB.length) {
    // Pad to match length for timing invariance
    const dummy = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummy);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * AES-256-GCM Field-Level Encryption for PII (C-A02-03)
 * Output format: iv_hex:auth_tag_hex:ciphertext_hex
 */
function encryptField(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', config.AES_ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * AES-256-GCM Field-Level Decryption with Tag Authentication
 */
function decryptField(cipherString) {
  if (!cipherString || typeof cipherString !== 'string') return null;
  try {
    const parts = cipherString.split(':');
    if (parts.length !== 3) return cipherString; // If unencrypted mock fallback
    
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', config.AES_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return '[ENCRYPTED_PII_UNREADABLE]';
  }
}

/**
 * Generate Cryptographically Secure Random Token (CSPRNG) (C-A02-05)
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate 6-digit numeric OTP using CSPRNG
 */
function generateSecureOtp() {
  const num = crypto.randomInt(100000, 999999);
  return String(num);
}

/**
 * Generate SHA-256 Hash of string
 */
function hashSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Sign JWT with strict algorithm pinning HS256, issuer, audience, and jti (C-A07-02, C-A07-03)
 */
function signJwt(payload, expiresIn = config.JWT_EXPIRES_IN) {
  const jti = generateSecureToken(16);
  return jwt.sign(payload, config.JWT_SECRET, {
    algorithm: 'HS256', // Hardened algorithm pinning (no 'none' or alg confusion)
    expiresIn,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    jwtid: jti
  });
}

/**
 * Verify JWT with algorithm pinning and revocation check
 */
function verifyJwt(token) {
  if (!token) throw new Error('Token required');
  
  const decoded = jwt.verify(token, config.JWT_SECRET, {
    algorithms: ['HS256'], // Pinned algorithm
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE
  });

  if (decoded.jti && revokedTokens.has(decoded.jti)) {
    throw new Error('Token has been revoked');
  }

  return decoded;
}

/**
 * Revoke JWT token server-side upon logout
 */
function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.jti) {
      revokedTokens.add(decoded.jti);
    }
  } catch (e) {
    // Ignore decode error on invalid tokens
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  timingSafeEqual,
  encryptField,
  decryptField,
  generateSecureToken,
  generateSecureOtp,
  hashSha256,
  signJwt,
  verifyJwt,
  revokeToken
};
