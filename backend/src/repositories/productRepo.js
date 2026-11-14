/**
 * Product & Catalogue Repository
 * Security Controls: C-A03-01 (parameterised queries), C-A03-02 (output sanitization)
 */

const db = require('./db');

const ALLOWED_SORT_COLUMNS = Object.freeze({
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  name_asc: 'name ASC',
  name_desc: 'name DESC',
  newest: 'created_at DESC'
});

function listProducts({ category, search, sort = 'name_asc', limit = 50, offset = 0 }) {
  let query = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search && search.trim().length > 0) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const orderClause = ALLOWED_SORT_COLUMNS[sort] || 'name ASC';
  query += ` ORDER BY ${orderClause} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

function findById(id) {
  const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
  return stmt.get(id);
}

function listCategories() {
  const stmt = db.prepare('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC');
  return stmt.all().map(r => r.category);
}

function getReviewsForProduct(productId) {
  const stmt = db.prepare('SELECT id, product_id, user_name, rating, comment_sanitized, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC');
  return stmt.all(productId);
}

function addReview({ id, productId, userId, userName, rating, commentSanitized }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment_sanitized, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, productId, userId, userName, rating, commentSanitized, now);
}

function updateStock(productId, newQuantity) {
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?');
  stmt.run(newQuantity, now, productId);
}

function createProduct(product) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO products (id, store_id, name, category, description, price, discount_price, stock_quantity, unit, image_url, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  stmt.run(
    product.id,
    product.storeId,
    product.name,
    product.category,
    product.description || '',
    product.price,
    product.discountPrice || product.price,
    product.stockQuantity || 0,
    product.unit || '1 unit',
    product.imageUrl || '',
    now,
    now
  );
  return findById(product.id);
}

module.exports = {
  listProducts,
  findById,
  listCategories,
  getReviewsForProduct,
  addReview,
  updateStock,
  createProduct
};
