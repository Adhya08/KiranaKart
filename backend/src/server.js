/**
 * Server Entrypoint
 */

const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`  KIRANAKART SECURE REFERENCE APPLICATION`);
  console.log(`  Hardened, DPDP-Compliant Twin for SecureScan`);
  console.log(`  Listening on: http://localhost:${config.PORT}`);
  console.log(`  Environment:  ${config.NODE_ENV}`);
  console.log(`  Baseline:     Zero Vulnerabilities / Low+ Findings`);
  console.log(`=======================================================`);
});

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
