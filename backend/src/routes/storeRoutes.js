/**
 * Store Owner Portal Routes
 * Controls: C-A01-02 (RBAC), C-A05-07 (Safe XML import)
 */

const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { authenticate, requireRole } = require('../middleware/auth');

// Scoped strictly to store_owner and admin (C-A01-02)
router.use(authenticate, requireRole(['store_owner', 'admin']));

router.get('/dashboard', storeController.getStoreDashboard);
router.put('/products/:productId/inventory', storeController.updateProductInventory);
router.post('/bulk-import', storeController.bulkImport);

module.exports = router;

