/**
 * User Repository
 * Security Controls: C-A03-01 (parameterised queries), C-A02-03 (PII decryption/encryption)
 */

const db = require('./db');
const cryptoService = require('../services/cryptoService');

function findById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id);
  if (!user) return null;
  return sanitizeUser(user);
}

function findByEmailOrPhone(identifier) {
  const stmt = db.prepare('SELECT * FROM users WHERE (email = ? OR phone = ?) AND status != ?');
  const user = stmt.get(identifier, identifier, 'erased');
  return user || null;
}

function create({ id, name, email, phone, passwordHash, dob, isMinor, role = 'customer' }) {
  const encryptedDob = cryptoService.encryptField(dob);
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, dob_encrypted, is_minor, parental_consent_verified, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);
  
  const parentalVerified = isMinor ? 0 : 1;
  stmt.run(id, name, email, phone, passwordHash, encryptedDob, isMinor ? 1 : 0, parentalVerified, role, now, now);
  return findById(id);
}

function updateProfile(id, { name, phone }) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?');
  stmt.run(name, phone, now, id);
  return findById(id);
}

function setParentalConsentVerified(userId) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET parental_consent_verified = 1, updated_at = ? WHERE id = ?').run(now, userId);
}

function updatePassword(id, newHash) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, id);
}

function listAllUsers(limit = 50, offset = 0) {
  const stmt = db.prepare('SELECT id, name, email, phone, role, is_minor, parental_consent_verified, status, created_at FROM users WHERE status != "erased" LIMIT ? OFFSET ?');
  return stmt.all(limit, offset);
}

function eraseUser(id) {
  // True Erasure (DC-16 / S12): Cryptographically overwrite and expunge PII
  const now = new Date().toISOString();
  const anonymizedEmail = `erased_${id}@anonymized.kiranakart.local`;
  const anonymizedPhone = `+91000${cryptoService.hashSha256(id).slice(0, 7)}`;
  const anonymizedName = 'Erased Data Principal';
  const dummyEncrypted = cryptoService.encryptField('0000-00-00');

  db.transaction(() => {
    // Anonymize user record
    db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, phone = ?, password_hash = 'ERASED', dob_encrypted = ?, avatar_url = NULL, id_proof_path = NULL, status = 'erased', updated_at = ?
      WHERE id = ?
    `).run(anonymizedName, anonymizedEmail, anonymizedPhone, dummyEncrypted, now, id);

    // Expunge addresses
    db.prepare('DELETE FROM addresses WHERE user_id = ?').run(id);

    // Expunge nominee
    db.prepare('DELETE FROM nominees WHERE user_id = ?').run(id);

    // Record audit of erasure without storing PII
    db.prepare('INSERT INTO data_retention_audit (id, entity_type, entity_id, purged_at, reason) VALUES (?, ?, ?, ?, ?)')
      .run(cryptoService.generateSecureToken(16), 'user_principal', id, now, 'Right to Erasure (DPDP S12)');
  })();
}

function sanitizeUser(user) {
  const decryptedDob = cryptoService.decryptField(user.dob_encrypted);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    dob: decryptedDob,
    is_minor: Boolean(user.is_minor),
    parental_consent_verified: Boolean(user.parental_consent_verified),
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

module.exports = {
  findById,
  findByEmailOrPhone,
  create,
  updateProfile,
  setParentalConsentVerified,
  updatePassword,
  listAllUsers,
  eraseUser,
  sanitizeUser
};
