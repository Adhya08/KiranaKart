-- KiranaKart Secure Hardened Database Schema
-- Compatible with PostgreSQL and SQLite

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  dob_encrypted TEXT NOT NULL,
  is_minor INTEGER DEFAULT 0,
  parental_consent_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'store_owner', 'admin')),
  avatar_url TEXT,
  id_proof_path TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'erased')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parental_consents (
  id TEXT PRIMARY KEY,
  minor_user_id TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  verification_token_hash TEXT NOT NULL,
  status TEXT DEFAULT 'verified' CHECK(status IN ('pending', 'verified', 'revoked')),
  verified_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (minor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  is_approved INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  location_lat REAL,
  location_lng REAL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  discount_price REAL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  total_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  status TEXT DEFAULT 'placed' CHECK(status IN ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_ref_encrypted TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent REAL,
  flat_discount REAL,
  max_discount REAL,
  min_order_value REAL DEFAULT 0,
  usage_limit INTEGER DEFAULT 1000,
  times_used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  UNIQUE(coupon_id, user_id, order_id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment_sanitized TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS consent_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  notice_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('granted', 'withdrawn')),
  channel TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nominees (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grievances (
  id TEXT PRIMARY KEY,
  ticket_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'in_review' CHECK(status IN ('in_review', 'resolved', 'escalated_to_board')),
  resolution_note TEXT,
  board_escalated INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL,
  details_redacted TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempts_count INTEGER DEFAULT 1,
  locked_until TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_retention_audit (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  purged_at TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_logs(correlation_id);
