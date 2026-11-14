/**
 * Orders & Invoices Routes
 * Controls: C-A01-01 (IDOR Scoping), C-A03-03 (Safe Invoices)
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, orderController.createOrder);
router.get('/', authenticate, orderController.listUserOrders);
router.get('/:id', authenticate, orderController.getOrderDetails);
router.get('/:id/invoice', authenticate, orderController.downloadInvoice);

module.exports = router;

