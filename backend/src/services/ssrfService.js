/**
 * Server-Side Request Forgery (SSRF) Protection Service
 * Security Control: C-A10-01 / CWE-918
 * Restricts outbound fetching to explicit allowlist, blocks loopback/private/link-local/cloud-metadata.
 */

const { URL } = require('url');

const APPROVED_HOST_ALLOWLIST = new Set([
  'cdn.kiranakart.local',
  'supplier.agrifresh.in',
  'api.india-open-data.gov.in',
  'raw.githubusercontent.com'
]);

function isPrivateOrReservedIp(ipStr) {
  // Check loopback, private ranges, link-local, and AWS metadata
  if (ipStr === '127.0.0.1' || ipStr === 'localhost' || ipStr === '::1' || ipStr === '0.0.0.0') {
    return true;
  }
  // 169.254.169.254 (Cloud metadata)
  if (ipStr.startsWith('169.254.')) {
    return true;
  }
  // 10.0.0.0/8
  if (ipStr.startsWith('10.')) {
    return true;
  }
  // 172.16.0.0/12 (172.16. to 172.31.)
  const match172 = ipStr.match(/^172\.(\d+)\./);
  if (match172 && parseInt(match172[1], 10) >= 16 && parseInt(match172[1], 10) <= 31) {
    return true;
  }
  // 192.168.0.0/16
  if (ipStr.startsWith('192.168.')) {
    return true;
  }
  return false;
}

/**
 * Validate and safely fetch external resource
 */
async function validateAndFetchUrl(inputUrl) {
  let parsed;
  try {
    parsed = new URL(inputUrl);
  } catch (e) {
    throw new Error('Malformed URL provided');
  }

  // 1. Enforce HTTPS only (or restricted HTTP in mocked local tests)
  if (parsed.protocol !== 'https:') {
    throw new Error('Only secure HTTPS protocol is permitted');
  }

  // 2. Hostname must belong to approved allowlist
  const hostname = parsed.hostname.toLowerCase();
  if (!APPROVED_HOST_ALLOWLIST.has(hostname)) {
    throw new Error(`Hostname '${hostname}' is not in the approved supplier allowlist`);
  }

  // 3. Reject private IP addresses in hostname
  if (isPrivateOrReservedIp(hostname)) {
    throw new Error('Access to private or local loopback networks is prohibited');
  }

  // 4. In mock/test harness, return simulated safe response
  return {
    success: true,
    url: parsed.href,
    data: {
      status: 'verified',
      source: hostname,
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  validateAndFetchUrl,
  APPROVED_HOST_ALLOWLIST,
  isPrivateOrReservedIp
};
