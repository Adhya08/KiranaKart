/**
 * Catalogue & Product Reviews Controller
 * Security Controls: C-A03-01 (Parameterised SQL), C-A03-02 (Review sanitization against XSS)
 */

const sanitizeHtml = require('sanitize-html');
const productRepo = require('../repositories/productRepo');
const cryptoService = require('../services/cryptoService');

function listProducts(req, res, next) {
  try {
    const { category, search, sort } = req.query;
    const { limit, offset } = req.pagination;

    const products = productRepo.listProducts({
      category: category ? String(category) : null,
      search: search ? String(search) : null,
      sort: sort ? String(sort) : 'name_asc',
      limit,
      offset
    });

    const categories = productRepo.listCategories();

    res.status(200).json({
      success: true,
      products,
      categories,
      total: products.length
    });
  } catch (err) {
    next(err);
  }
}

function getProductDetails(req, res, next) {
  try {
    const { id } = req.params;
    const product = productRepo.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = productRepo.getReviewsForProduct(id);

    res.status(200).json({
      success: true,
      product,
      reviews
    });
  } catch (err) {
    next(err);
  }
}

function addReview(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body || {};

    const product = productRepo.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Review comment is required' });
    }

    // Context-aware HTML sanitization against Stored XSS (C-A03-02)
    const cleanComment = sanitizeHtml(comment.trim(), {
      allowedTags: ['b', 'i', 'em', 'strong', 'p'],
      allowedAttributes: {}
    });

    const reviewId = `rev_${cryptoService.generateSecureToken(8)}`;
    productRepo.addReview({
      id: reviewId,
      productId: id,
      userId: req.currentUser.id,
      userName: req.currentUser.name,
      rating: numRating,
      commentSanitized: cleanComment
    });

    res.status(201).json({
      success: true,
      message: 'Review posted successfully',
      reviewId,
      commentSanitized: cleanComment
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProductDetails,
  addReview
};

