/**
 * Hard Negative HN-01: Dynamic SQL composed from a strict allow-list of column names
 * Why it is safe: No user-controlled text enters the SQL statement directly; column names
 * are strictly validated against an in-code allow-list, and values are bound via query parameters.
 */
function buildSafeProductQuery(sortBy, filterCategory, minPrice) {
  const ALLOWED_COLUMNS = Object.freeze({
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    name: 'name ASC',
    created: 'created_at DESC'
  });

  const orderClause = ALLOWED_COLUMNS[sortBy] || 'id ASC';
  const query = `SELECT id, name, price, category FROM products WHERE category = ? AND price >= ? ORDER BY ${orderClause}`;
  const params = [filterCategory, minPrice];

  return { query, params };
}

module.exports = { buildSafeProductQuery };
