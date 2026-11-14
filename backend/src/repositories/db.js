/**
 * SQLite Database Connection & Initialization
 * Security Controls: C-A03-01 (parameterised queries only, no string-built SQL)
 * Uses Node.js native built-in node:sqlite (zero external binary dependencies)
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const cryptoService = require('../services/cryptoService');

const dbPath = path.resolve(__dirname, '../../../kiranakart.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Transaction wrapper matching better-sqlite3 signature
db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = fn(...args);
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch (rbErr) {
        // Ignore rollback error if transaction already aborted
      }
      throw err;
    }
  };
};

function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, '../../../db/schema.sql');
  const seedPath = path.resolve(__dirname, '../../../db/seed.sql');

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Check if users already seeded
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedInitialUsers();
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      db.exec(seedSql);
    }
    seedAdditionalSyntheticRecords();
  }
}

function seedInitialUsers() {
  const passwordHash = '$2a$12$4mIekQnUaZkJX1.X6/jOme8i1a0ePjZ58c7eF8w4xW7/R6xK9eWc.'; // Password123!

  const users = [
    {
      id: 'usr_admin_01',
      name: 'Meera Iyer (Chief Compliance Officer)',
      email: 'admin@example.com',
      phone: '+919876500000',
      role: 'admin',
      dob: '1988-03-14',
      is_minor: 0,
      parental_consent_verified: 1
    },
    {
      id: 'usr_owner_01',
      name: 'Ramesh Patel (Kirana Store Owner)',
      email: 'ramesh@example.com',
      phone: '+919876500001',
      role: 'store_owner',
      dob: '1982-08-22',
      is_minor: 0,
      parental_consent_verified: 1
    },
    {
      id: 'usr_cust_01',
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+919876500003',
      role: 'customer',
      dob: '1995-12-05',
      is_minor: 0,
      parental_consent_verified: 1
    },
    {
      id: 'usr_cust_02',
      name: 'Priya Nair',
      email: 'priya@example.com',
      phone: '+919876500004',
      role: 'customer',
      dob: '1997-04-18',
      is_minor: 0,
      parental_consent_verified: 1
    },
    // Synthetic 5 Minor Users (DPDP Section 9 & PRD Section 5.6 compliant)
    {
      id: 'usr_minor_01',
      name: 'Ananya Rao',
      email: 'ananya.minor@example.com',
      phone: '+919876500011',
      role: 'customer',
      dob: '2011-05-14', // 15 y/o
      is_minor: 1,
      parental_consent_verified: 1,
      parent_name: 'Vikram Rao',
      parent_email: 'vikram.parent@example.com',
      parent_phone: '+919876500021'
    },
    {
      id: 'usr_minor_02',
      name: 'Rohan Verma',
      email: 'rohan.minor@example.com',
      phone: '+919876500012',
      role: 'customer',
      dob: '2010-08-20', // 16 y/o
      is_minor: 1,
      parental_consent_verified: 1,
      parent_name: 'Sunita Verma',
      parent_email: 'sunita.parent@example.com',
      parent_phone: '+919876500022'
    },
    {
      id: 'usr_minor_03',
      name: 'Kavya Reddy',
      email: 'kavya.minor@example.com',
      phone: '+919876500013',
      role: 'customer',
      dob: '2012-02-11', // 14 y/o
      is_minor: 1,
      parental_consent_verified: 1,
      parent_name: 'Suresh Reddy',
      parent_email: 'suresh.parent@example.com',
      parent_phone: '+919876500023'
    },
    {
      id: 'usr_minor_04',
      name: 'Kabir Khan',
      email: 'kabir.minor@example.com',
      phone: '+919876500014',
      role: 'customer',
      dob: '2009-11-03', // 17 y/o
      is_minor: 1,
      parental_consent_verified: 1,
      parent_name: 'Farah Khan',
      parent_email: 'farah.parent@example.com',
      parent_phone: '+919876500024'
    },
    {
      id: 'usr_minor_05',
      name: 'Diya Joshi',
      email: 'diya.minor@example.com',
      phone: '+919876500015',
      role: 'customer',
      dob: '2013-06-25', // 13 y/o
      is_minor: 1,
      parental_consent_verified: 1,
      parent_name: 'Manoj Joshi',
      parent_email: 'manoj.parent@example.com',
      parent_phone: '+919876500025'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, dob_encrypted, is_minor, parental_consent_verified, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  const insertParental = db.prepare(`
    INSERT INTO parental_consents (id, minor_user_id, parent_name, parent_email, parent_phone, verification_token_hash, status, verified_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'verified', ?, ?)
  `);

  const now = new Date().toISOString();

  for (const u of users) {
    const encryptedDob = cryptoService.encryptField(u.dob);
    insertUser.run(
      u.id,
      u.name,
      u.email,
      u.phone,
      passwordHash,
      encryptedDob,
      u.is_minor,
      u.parental_consent_verified,
      u.role,
      now,
      now
    );

    if (u.is_minor && u.parent_name) {
      const tokenHash = cryptoService.hashSha256(`synthetic_parent_token_${u.id}`);
      insertParental.run(
        `pc_${u.id}`,
        u.id,
        u.parent_name,
        u.parent_email,
        u.parent_phone,
        tokenHash,
        now,
        now
      );
    }
  }
}

function seedAdditionalSyntheticRecords() {
  const now = new Date().toISOString();

  // Seed sample addresses
  const insertAddr = db.prepare(`
    INSERT OR IGNORE INTO addresses (id, user_id, label, address_line, city, state, postal_code, is_default, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAddr.run('addr_01', 'usr_cust_01', 'Home', 'Flat 402, Green Glen Layout, Bellandur', 'Bengaluru', 'Karnataka', '560103', 1, now);
  insertAddr.run('addr_02', 'usr_cust_02', 'Office', 'Indiqube Gamma, Outer Ring Road, Kadubeesanahalli', 'Bengaluru', 'Karnataka', '560103', 1, now);

  // Seed sample consent ledger
  const insertConsent = db.prepare(`
    INSERT OR IGNORE INTO consent_ledger (id, user_id, purpose, notice_version, status, channel, ip_hash, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertConsent.run('cns_01', 'usr_cust_01', 'essential', '2026.1', 'granted', 'web_signup', cryptoService.hashSha256('127.0.0.1'), now);
  insertConsent.run('cns_02', 'usr_cust_01', 'order_updates', '2026.1', 'granted', 'web_signup', cryptoService.hashSha256('127.0.0.1'), now);
  insertConsent.run('cns_03', 'usr_cust_01', 'marketing', '2026.1', 'granted', 'web_signup', cryptoService.hashSha256('127.0.0.1'), now);

  // Seed sample nominee
  const insertNominee = db.prepare(`
    INSERT OR IGNORE INTO nominees (id, user_id, name, relationship, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertNominee.run('nom_01', 'usr_cust_01', 'Neha Sharma', 'Spouse', 'neha.sharma@example.com', '+919876500099', now, now);

  // Seed sample orders
  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (id, order_number, user_id, store_id, total_amount, discount_amount, final_amount, status, payment_status, payment_ref_encrypted, delivery_address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const encPaymentRef = cryptoService.encryptField('PAY_UPI_REF_9988776655');
  insertOrder.run('ord_01', 'KK-2026-1001', 'usr_cust_01', 'str_01', 355.0, 35.5, 319.5, 'delivered', 'paid', encPaymentRef, 'Flat 402, Green Glen Layout, Bellandur, Bengaluru', now, now);

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertItem.run('oi_01', 'ord_01', 'prd_01', 'Fresh Farm Tomatoes (Hybrid)', 38.0, 2, 76.0);
  insertItem.run('oi_02', 'ord_01', 'prd_11', 'Aashirvaad Shudh Chakki Atta', 245.0, 1, 245.0);
}

// Auto initialize on load
initializeDatabase();

module.exports = db;
