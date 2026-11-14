/**
 * Hard Negative HN-07: Hash function usage (SHA-256) for file integrity or cache keys
 * Why it is safe: SHA-256 is used here for deterministic deduplication and cache keys,
 * not for storing user passwords (passwords use Argon2id/bcrypt).
 */
const crypto = require('crypto');

function computeCatalogCacheKey(storeId, category, page) {
  const payload = `store:${storeId}:cat:${category}:p:${page}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { computeCatalogCacheKey };
