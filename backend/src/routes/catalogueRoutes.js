/**
 * Catalogue & Reviews Routes
 */

const express = require('express');
const router = express.Router();
const catalogueController = require('../controllers/catalogueController');
const { sanitizePaginationParams } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

router.get('/products', sanitizePaginationParams, catalogueController.listProducts);
router.get('/products/:id', catalogueController.getProductDetails);
router.post('/products/:id/reviews', authenticate, catalogueController.addReview);

module.exports = router;

