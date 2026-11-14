/**
 * File Upload Storage & Verification Service
 * Security Controls: C-A01-04 (Path traversal prevention), C-A08-04 (Upload validation & outside web root)
 */

const fs = require('fs');
const path = require('path');
const cryptoService = require('./cryptoService');

// Secure storage directory strictly outside web root
const UPLOAD_ROOT = path.resolve(__dirname, '../../../storage_uploads_safe');
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true, mode: 0o700 });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validate file buffer magic bytes
 */
function validateMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  if (mimeType === 'image/jpeg') {
    // JPEG magic bytes: FF D8 FF
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  if (mimeType === 'image/png') {
    // PNG magic bytes: 89 50 4E 47
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (mimeType === 'application/pdf') {
    // PDF magic bytes: 25 50 44 46 (%PDF)
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  return false;
}

/**
 * Save uploaded attachment safely with opaque UUID filename outside web root
 */
function saveAttachment(originalName, mimeType, buffer) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported file type. Only JPEG, PNG, and PDF are permitted.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum permitted size of 5 MB.');
  }

  if (!validateMagicBytes(buffer, mimeType)) {
    throw new Error('File content signature does not match declared MIME type.');
  }

  // Generate completely random opaque filename
  const extension = mimeType === 'image/jpeg' ? '.jpg' : (mimeType === 'image/png' ? '.png' : '.pdf');
  const opaqueId = `att_${cryptoService.generateSecureToken(16)}${extension}`;
  const targetPath = path.join(UPLOAD_ROOT, opaqueId);

  // Normalise path and assert it remains strictly under UPLOAD_ROOT (C-A01-04)
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(UPLOAD_ROOT)) {
    throw new Error('Path traversal attempt detected');
  }

  fs.writeFileSync(resolved, buffer);

  return {
    opaqueId,
    mimeType,
    sizeBytes: buffer.length
  };
}

/**
 * Retrieve attachment by opaque ID (never raw path)
 */
function getAttachmentPath(opaqueId) {
  // Reject path separators in opaque ID
  if (!opaqueId || opaqueId.includes('/') || opaqueId.includes('\\') || opaqueId.includes('..')) {
    throw new Error('Invalid attachment identifier');
  }

  const targetPath = path.resolve(UPLOAD_ROOT, opaqueId);
  if (!targetPath.startsWith(UPLOAD_ROOT)) {
    throw new Error('Access denied');
  }

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  return targetPath;
}

module.exports = {
  saveAttachment,
  getAttachmentPath,
  UPLOAD_ROOT
};

