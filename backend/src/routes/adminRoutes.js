/**
 * Administrative Routes
 * Controls: C-A01-02 (Admin RBAC, deny by default), C-X-07 (No backdoor routes)
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/auth');

// Strict Admin Gate: Deny all non-admin requests by default (C-A01-02)
router.use(authenticate, requireRole(['admin']));

router.get('/users', adminController.listUsers);
router.get('/audit-logs', adminController.getAuditLogs);
router.post('/simulate-breach-notification', adminController.simulateBreachNotification);
router.post('/purge-expired-data', adminController.triggerRetentionPurge);
router.get('/compliance-overview', adminController.getComplianceOverview);

module.exports = router;
