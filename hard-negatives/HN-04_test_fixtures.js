/**
 * Hard Negative HN-04: Test fixtures with obviously fake keys in /test/ with documented allow-list entry
 * Why it is safe: Test-only fixture data containing explicitly mocked test tokens with
 * clear synthetic prefixes that cannot unlock any production service.
 */
const TEST_MOCK_PAYMENT_FIXTURE = Object.freeze({
  mockGatewayKey: 'MOCK_SANDBOX_KEY_SYNTHETIC_NOT_A_REAL_SECRET_000000',
  mockWebhookSecret: 'MOCK_WEBHOOK_SECRET_FOR_UNIT_TESTING_PURPOSES_ONLY_999999',
  testCustomerId: 'cust_synthetic_12345'
});

module.exports = { TEST_MOCK_PAYMENT_FIXTURE };

