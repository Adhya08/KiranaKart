/**
 * Real-Time Flaw Injection Tool
 * Requirements: FR-RT-02, FR-RT-03, FR-RT-05
 * Applies or reverts single named vulnerability / DPDP regression patches
 */

const fs = require('fs');
const path = require('path');

const INJECTIONS = {
  'V-A01-01': {
    title: 'IDOR: Remove user ownership check on order lookup',
    targetFile: 'backend/src/repositories/orderRepo.js',
    original: 'stmt = db.prepare(\'SELECT * FROM orders WHERE id = ? AND user_id = ?\');\n    order = stmt.get(orderId, currentUser.id);',
    injected: '// INJECTED FLAW V-A01-01 (IDOR)\n    stmt = db.prepare(\'SELECT * FROM orders WHERE id = ?\');\n    order = stmt.get(orderId);'
  },
  'V-A01-02': {
    title: 'Broken Access Control: Disable RBAC middleware on admin routes',
    targetFile: 'backend/src/routes/adminRoutes.js',
    original: 'router.use(authenticate, requireRole([\'admin\']));',
    injected: '// INJECTED FLAW V-A01-02 (Admin Bypass)\n// router.use(authenticate, requireRole([\'admin\']));'
  },
  'V-A03-01': {
    title: 'SQL Injection: Concatenate unescaped search parameter',
    targetFile: 'backend/src/repositories/productRepo.js',
    original: 'query += \' AND (name LIKE ? OR description LIKE ?)\';\n    const term = `%${search.trim()}%`;\n    params.push(term, term);',
    injected: '// INJECTED FLAW V-A03-01 (SQL Injection)\n    query += ` AND (name LIKE \'%${search}%\')`;'
  },
  'D-02': {
    title: 'DPDP Non-Compliance: Pre-tick marketing consent checkbox',
    targetFile: 'frontend/public/app.js',
    original: 'state.activeConsents = cRes.consents || { essential: true };',
    injected: '// INJECTED REGRESSION D-02 (Pre-ticked non-essential consent)\n    state.activeConsents = { essential: true, marketing: true, analytics: true };'
  },
  'D-16': {
    title: 'DPDP Non-Compliance: Replace true erasure with soft-delete',
    targetFile: 'backend/src/repositories/userRepo.js',
    original: 'db.prepare(\'DELETE FROM addresses WHERE user_id = ?\').run(id);',
    injected: '// INJECTED REGRESSION D-16 (Soft delete retaining addresses)\n    // db.prepare(\'DELETE FROM addresses WHERE user_id = ?\').run(id);'
  }
};

function main() {
  const args = process.argv.slice(2);
  const flawIndex = args.indexOf('--flaw');
  const isList = args.includes('--list');
  const isRevert = args.includes('--revert');

  if (isList) {
    console.log('Available Flaw Injections:');
    for (const [id, info] of Object.entries(INJECTIONS)) {
      console.log(`  [${id}] ${info.title} -> ${info.targetFile}`);
    }
    return;
  }

  if (isRevert) {
    console.log('Reverting all injected flaws to clean baseline...');
    for (const [id, info] of Object.entries(INJECTIONS)) {
      const filePath = path.resolve(__dirname, '..', info.targetFile);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(info.injected)) {
          content = content.replace(info.injected, info.original);
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✓ Reverted ${id} in ${info.targetFile}`);
        }
      }
    }
    console.log('Repo is clean.');
    return;
  }

  if (flawIndex !== -1 && args[flawIndex + 1]) {
    const flawId = args[flawIndex + 1];
    const injection = INJECTIONS[flawId];
    if (!injection) {
      console.error(`Unknown flaw ID '${flawId}'. Use --list to see available injections.`);
      process.exit(1);
    }

    const filePath = path.resolve(__dirname, '..', injection.targetFile);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes(injection.original)) {
      if (content.includes(injection.injected)) {
        console.log(`Flaw ${flawId} is ALREADY injected into ${injection.targetFile}`);
        return;
      }
      console.error(`Error: Could not locate original target string in ${injection.targetFile}`);
      process.exit(1);
    }

    content = content.replace(injection.original, injection.injected);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Successfully injected flaw ${flawId}: "${injection.title}"`);
    console.log(`Target: ${injection.targetFile}`);
    console.log(`Expected Scanner Detection: ${flawId}`);
    return;
  }

  console.log('Usage:');
  console.log('  node tools/inject.js --list');
  console.log('  node tools/inject.js --flaw <FLAW_ID>');
  console.log('  node tools/inject.js --revert');
}

main();
