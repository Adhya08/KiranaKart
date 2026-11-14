/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegisterInput } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

router.post('/register', authLimiter, validateRegisterInput, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset);
router.post('/reset-password', authLimiter, authController.executePasswordReset);
router.post('/verify-parental-consent', authController.verifyParentConsent);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
