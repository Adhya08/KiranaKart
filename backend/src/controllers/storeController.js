/**
 * Store Owner Portal Controller
 * Implements: FR-STORE, C-A05-07 (Safe XML import / XXE defense)
 */

const db = require('../repositories/db');
const orderRepo = require('../repositories/orderRepo');
const importService = require('../services/importService');
const auditService = require('../services/auditService');

function getStoreDashboard(req, res, next) {
  try {
    const store = db.prepare('SELECT * FROM stores WHERE owner_id = ?').get(req.currentUser.id);
    if (!store) {
      return res.status(404).json({ error: 'No store registered for this owner' });
    }

    const products = db.prepare('SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC').all(store.id);
    const orders = orderRepo.listStoreOrders(req.currentUser.id);

    res.status(200).json({
      success: true,
      store,
      products,
      orders,
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.final_amount || 0), 0)
      }
    });
  } catch (err) {
    next(err);
  }
}

function updateProductInventory(req, res, next) {
  try {
    const { productId } = req.params;
    const { stock, price } = req.body || {};

    // Validate ownership
    const store = db.prepare('SELECT id FROM stores WHERE owner_id = ?').get(req.currentUser.id);
    if (!store) return res.status(403).json({ error: 'Unauthorized store access' });

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ?').get(productId, store.id);
    if (!product) return res.status(404).json({ error: 'Product not found in your store' });

    const newStock = stock !== undefined ? parseInt(stock, 10) : product.stock_quantity;
    const newPrice = price !== undefined ? parseFloat(price) : product.price;

    db.prepare('UPDATE products SET stock_quantity = ?, price = ?, updated_at = ? WHERE id = ?')
      .run(newStock, newPrice, new Date().toISOString(), productId);

    res.status(200).json({
      success: true,
      message: 'Product inventory updated',
      productId,
      stock: newStock,
      price: newPrice
    });
  } catch (err) {
    next(err);
  }
}

function bulkImport(req, res, next) {
  try {
    const { format = 'csv', data } = req.body || {};
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Payload data string required for bulk import' });
    }

    const store = db.prepare('SELECT id FROM stores WHERE owner_id = ?').get(req.currentUser.id);
    if (!store) return res.status(403).json({ error: 'Store not found' });

    // C-A05-07: Safe XML parsing with external entities disabled
    const result = importService.importBulkProducts(store.id, data, format.toLowerCase());

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'BULK_PRODUCT_IMPORT',
      resource: '/api/store/bulk-import',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: { format, count: result.importedCount }
    });

    res.status(200).json({
      success: true,
      message: `Successfully imported ${result.importedCount} products`,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStoreDashboard,
  updateProductInventory,
  bulkImport
};
