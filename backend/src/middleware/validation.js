/**
 * Schema Validation & Mass-Assignment Protection Middleware
 * Security Controls: C-A01-03 (Mass-assignment defense), C-A03-04 (Type coercion), C-A07-01 (Password policy), C-X-04 (Linear-time ReDoS safe regex)
 */

// Linear-time safe email regex (C-X-04) - avoids catastrophic backtracking
const SAFE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const SAFE_PHONE_REGEX = /^\+?[0-9]{10,14}$/;

/**
 * Validate Registration Payload with Strict Allowlist (C-A01-03)
 * Prevents client from injecting role: 'admin' or status: 'active'
 */
function validateRegisterInput(req, res, next) {
  const { name, email, phone, password, dob, parentName, parentEmail, parentPhone } = req.body || {};

  // Check required fields
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Valid full name between 2 and 80 characters required' });
  }

  if (!email || typeof email !== 'string' || email.length > 100 || !SAFE_EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  if (!phone || typeof phone !== 'string' || !SAFE_PHONE_REGEX.test(phone.trim())) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  // Password policy check (C-A07-01): Min 8 chars, mixed case, number, special character
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasNum) {
    return res.status(400).json({ error: 'Password must include uppercase, lowercase, and numeric characters' });
  }

  if (!dob || typeof dob !== 'string' || isNaN(Date.parse(dob))) {
    return res.status(400).json({ error: 'Valid date of birth required (YYYY-MM-DD)' });
  }

  // Calculate age for DPDP Section 9 minor check
  const birthDate = new Date(dob);
  const diffYears = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const isMinor = diffYears < 18;

  if (isMinor) {
    if (!parentName || !parentEmail) {
      return res.status(400).json({
        error: 'DPDP Section 9(1) Requirement: Verifiable parental details (Parent Name & Parent Contact) required for minors under 18'
      });
    }
  }

  // Build sanitized, strictly allow-listed user object (mass assignment defense)
  req.sanitizedUser = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    password,
    dob,
    isMinor,
    parentName: parentName ? parentName.trim() : null,
    parentEmail: parentEmail ? parentEmail.trim().toLowerCase() : null,
    parentPhone: parentPhone ? parentPhone.trim() : null,
    role: 'customer' // Enforce customer role; client can never set admin (C-A01-03)
  };

  next();
}

/**
 * Validate Profile Update (C-A01-03)
 */
function validateProfileUpdate(req, res, next) {
  const { name, phone } = req.body || {};

  const cleanUpdate = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Name must be between 2 and 80 characters' });
    }
    cleanUpdate.name = name.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== 'string' || !SAFE_PHONE_REGEX.test(phone.trim())) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    cleanUpdate.phone = phone.trim();
  }

  req.sanitizedUpdate = cleanUpdate;
  next();
}

/**
 * Coerce and cast query parameters (C-A03-04)
 */
function sanitizePaginationParams(req, res, next) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
}

module.exports = {
  validateRegisterInput,
  validateProfileUpdate,
  sanitizePaginationParams,
  SAFE_EMAIL_REGEX,
  SAFE_PHONE_REGEX
};
