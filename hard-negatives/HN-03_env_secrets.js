/**
 * Hard Negative HN-03: Variables named password, token, secret that read from environment or hold a hash
 * Why it is safe: No hardcoded secrets or credentials; values are dynamically fetched
 * from environment variables or represent one-way cryptographic hashes.
 */
function getSecurityConfiguration() {
  const jwtSecret = process.env.JWT_SECRET || null;
  const dbPassword = process.env.DB_PASSWORD || null;
  const userPasswordHash = '$2a$12$e8pYfP16Q6v8jX1g2k...synthetic...hash';

  return {
    hasJwtSecret: Boolean(jwtSecret),
    hasDbPassword: Boolean(dbPassword),
    storedHashLength: userPasswordHash.length
  };
}

module.exports = { getSecurityConfiguration };
