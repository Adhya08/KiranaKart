/**
 * User Profile & Self-Service Correction Routes (DC-11, DC-17)
 */

const express = require('express');
const router = express.Router();
const userRepo = require('../repositories/userRepo');
const { authenticate } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');
const auditService = require('../services/auditService');

router.get('/', authenticate, (req, res) => {
  res.status(200).json({ success: true, profile: req.currentUser });
});

router.put('/', authenticate, validateProfileUpdate, (req, res) => {
  const updated = userRepo.updateProfile(req.currentUser.id, req.sanitizedUpdate);

  auditService.logSecurityEvent({
    correlationId: req.correlationId,
    userId: req.currentUser.id,
    action: 'PROFILE_SELF_SERVICE_CORRECTION',
    resource: '/api/profile',
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { updatedFields: Object.keys(req.sanitizedUpdate) }
  });

  res.status(200).json({
    success: true,
    message: 'Profile details updated successfully (DPDP Section 12 Right to Correction)',
    profile: updated
  });
});

module.exports = router;

