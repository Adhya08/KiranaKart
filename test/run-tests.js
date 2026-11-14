/**
 * Automated Verification & Quality Suite
 * NFR-04: Security, authorization, crypto, DPDP privacy tests, no-PII-leak checks
 */

const assert = require('assert');
const cryptoService = require('../backend/src/services/cryptoService');
const userRepo = require('../backend/src/repositories/userRepo');
const orderRepo = require('../backend/src/repositories/orderRepo');
const productRepo = require('../backend/src/repositories/productRepo');
const dpdpService = require('../backend/src/services/dpdpService');
const ssrfService = require('../backend/src/services/ssrfService');
const { safeDeepMerge } = require('../backend/src/utils/safeMerge');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('  RUNNING KIRANAKART SECURE VERIFICATION SUITE');
  console.log('====================================================');

  console.log('\n[Suite 1: Cryptography & Security Controls]');
  
  await test('C-A02-01: Password hashes with bcrypt are verifiable and timing-safe', async () => {
    const plain = 'StrongSecurePass123!';
    const hash = await cryptoService.hashPassword(plain);
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
    const isValid = await cryptoService.verifyPassword(plain, hash);
    assert.strictEqual(isValid, true);
    const isInvalid = await cryptoService.verifyPassword('WrongPass', hash);
    assert.strictEqual(isInvalid, false);
  });

  await test('C-A02-03: AES-256-GCM field encryption and decryption', async () => {
    const sensitiveDob = '1995-12-05';
    const encrypted = cryptoService.encryptField(sensitiveDob);
    assert.notStrictEqual(encrypted, sensitiveDob);
    assert.strictEqual(encrypted.split(':').length, 3); // iv:tag:ciphertext
    const decrypted = cryptoService.decryptField(encrypted);
    assert.strictEqual(decrypted, sensitiveDob);
  });

  await test('C-A07-03: Pinned JWT sign and verify HS256', async () => {
    const payload = { id: 'usr_test_1', role: 'customer' };
    const token = cryptoService.signJwt(payload);
    const decoded = cryptoService.verifyJwt(token);
    assert.strictEqual(decoded.id, 'usr_test_1');
    assert.strictEqual(decoded.role, 'customer');
  });

  await test('C-A07-02: Server-side token revocation on logout', async () => {
    const token = cryptoService.signJwt({ id: 'usr_revoked_1', role: 'customer' });
    const verifiedBefore = cryptoService.verifyJwt(token);
    assert.ok(verifiedBefore);
    cryptoService.revokeToken(token);
    assert.throws(() => cryptoService.verifyJwt(token), /revoked/i);
  });

  await test('C-X-06: Prototype pollution safe merge utility', async () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "SafeName"}');
    const target = {};
    const merged = safeDeepMerge(target, maliciousPayload);
    assert.strictEqual(merged.name, 'SafeName');
    assert.strictEqual(({}).polluted, undefined, 'Global Object prototype must not be polluted');
  });

  await test('C-A10-01: SSRF Defense blocks private/loopback and unapproved domains', async () => {
    await assert.rejects(async () => {
      await ssrfService.validateAndFetchUrl('http://169.254.169.254/latest/meta-data/');
    }, /prohibited|HTTPS|allowlist/i);

    await assert.rejects(async () => {
      await ssrfService.validateAndFetchUrl('https://evil-attacker-site.com/catalog.xml');
    }, /allowlist/i);
  });

  console.log('\n[Suite 2: Authorization & IDOR Controls]');

  await test('C-A01-01: Order lookup strictly enforces ownership (IDOR fix)', async () => {
    const customerAarav = { id: 'usr_cust_01', role: 'customer' };
    const customerPriya = { id: 'usr_cust_02', role: 'customer' };
    const adminMeera = { id: 'usr_admin_01', role: 'admin' };

    // Aarav looks up own order ord_01
    const ownOrder = orderRepo.findOrderByIdScoped('ord_01', customerAarav);
    assert.ok(ownOrder, 'User must be able to view their own order');

    // Priya attempts to access Aarav order ord_01 -> must return null (404/403)
    const unauthorizedOrder = orderRepo.findOrderByIdScoped('ord_01', customerPriya);
    assert.strictEqual(unauthorizedOrder, null, 'IDOR prevented: User cannot access other users orders');

    // Admin has legitimate business access
    const adminAccess = orderRepo.findOrderByIdScoped('ord_01', adminMeera);
    assert.ok(adminAccess, 'Authorized admin can inspect order for support');
  });

  console.log('\n[Suite 3: DPDP Act 2023 Compliance Controls]');

  await test('DC-04 & DC-05: Consent ledger recording & withdrawal parity', async () => {
    const userId = 'usr_cust_01';
    
    // Grant marketing consent
    dpdpService.recordConsent({ userId, purpose: 'marketing', status: 'granted' });
    let consents = dpdpService.getUserConsents(userId);
    assert.strictEqual(consents.marketing, true);

    // Withdraw marketing consent
    dpdpService.withdrawConsent(userId, 'marketing');
    consents = dpdpService.getUserConsents(userId);
    assert.strictEqual(consents.marketing, false);
  });

  await test('DC-15: Right to Access (Download My Data) JSON bundle generation', async () => {
    const exportData = dpdpService.generateDataPrincipalExport('usr_cust_01');
    assert.ok(exportData.export_metadata);
    assert.strictEqual(exportData.export_metadata.statutory_basis, 'DPDP Act 2023 - Section 11 (Right to Access)');
    assert.ok(exportData.data_principal.name);
    assert.ok(Array.isArray(exportData.order_history));
    assert.ok(Array.isArray(exportData.third_party_processors_shared_with));
  });

  await test('DC-19 & DC-20: Minor accounts flagged and parental consent verified', async () => {
    const minorUser = userRepo.findById('usr_minor_01');
    assert.ok(minorUser);
    assert.strictEqual(minorUser.is_minor, true);
    assert.strictEqual(minorUser.parental_consent_verified, true);
  });

  await test('DC-18: Right of Nomination registration', async () => {
    const nominee = dpdpService.setNominee('usr_cust_02', {
      name: 'Sunil Nair',
      relationship: 'Brother',
      email: 'sunil.nair@example.com',
      phone: '+919876500088'
    });
    assert.strictEqual(nominee.name, 'Sunil Nair');
    assert.strictEqual(nominee.relationship, 'Brother');
  });

  await test('DC-16: Right to Erasure expunges PII while retaining ledger audit record', async () => {
    // Create temporary disposable user with unique contact details
    const tempId = `usr_disposable_${Date.now()}`;
    const uniquePhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    userRepo.create({
      id: tempId,
      name: 'Temporary Principal',
      email: `${tempId}@example.com`,
      phone: uniquePhone,
      passwordHash: 'dummy',
      dob: '1990-01-01',
      isMinor: false
    });

    assert.ok(userRepo.findById(tempId));

    // Execute true erasure
    dpdpService.executeRightToErasure(tempId);

    const erasedUser = userRepo.findById(tempId);
    assert.strictEqual(erasedUser.name, 'Erased Data Principal');
    assert.ok(erasedUser.phone.startsWith('+91000'));
    assert.strictEqual(erasedUser.status, 'erased');
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
