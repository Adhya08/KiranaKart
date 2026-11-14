/**
 * Privacy & DPDP Compliance Routes
 * Implements: DC-01 through DC-24
 */

const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacyController');
const { authenticate } = require('../middleware/auth');

// Public Notice & SDF status endpoints (DC-01, DC-06, DC-13, DC-22)
router.get('/notice', privacyController.getPrivacyNotice);
router.get('/sdf-status', privacyController.getSignificantDataFiduciaryStatus);
router.get('/consent-manager', privacyController.consentManagerHook); // DC-07a

// Authenticated DPDP Principal Rights (DC-04, DC-05, DC-14, DC-15, DC-16, DC-18)
router.get('/consent', authenticate, privacyController.getUserConsents);
router.post('/consent', authenticate, privacyController.updateConsent);
router.get('/download-my-data', authenticate, privacyController.downloadMyData);
router.post('/request-erasure', authenticate, privacyController.requestErasure);
router.get('/nominee', authenticate, privacyController.getNominee);
router.post('/nominee', authenticate, privacyController.setNominee);
router.post('/grievances', authenticate, privacyController.submitGrievance);
router.get('/grievances', authenticate, privacyController.listUserGrievances);

module.exports = router;
