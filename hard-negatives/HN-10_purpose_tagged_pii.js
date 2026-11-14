/**
 * Hard Negative HN-10: Fields named 'dob' or 'phone' handling encrypted, purpose-tagged, consent-gated data
 * Why it is safe: These fields are not leaked in plain text; they are encrypted via AES-256-GCM,
 * tagged with DPDP purpose limitations, and gated behind explicit consent verification.
 */
class EncryptedPrincipalProfile {
  constructor({ id, encryptedDob, encryptedPhone, consentPurposes = [] }) {
    this.principalId = id;
    this.dob = encryptedDob; // Securely encrypted cipher string, not raw PII
    this.phone = encryptedPhone; // Encrypted with AES-256-GCM
    this.consentPurposes = Object.freeze([...consentPurposes]);
  }

  isPurposeAllowed(purpose) {
    return this.consentPurposes.includes(purpose);
  }
}

module.exports = { EncryptedPrincipalProfile };
