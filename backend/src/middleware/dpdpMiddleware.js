/**
 * DPDP Compliance Middleware
 * Controls: DC-07 (Purpose limitation check), DC-20 (Child tracking lockout)
 */

const dpdpService = require('../services/dpdpService');

/**
 * Enforce purpose tag authorization before processing personal data (DC-07)
 */
function requireConsentPurpose(purposeKey) {
  return (req, res, next) => {
    // If essential, always allowed
    if (purposeKey === 'essential') return next();

    if (!req.currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const consents = dpdpService.getUserConsents(req.currentUser.id);
    if (!consents[purposeKey]) {
      return res.status(403).json({
        error: `Processing blocked under DPDP Section 4 & 6: Active consent for '${purposeKey}' has not been granted.`,
        purpose_required: purposeKey,
        manage_consent_url: '/privacy'
      });
    }

    next();
  };
}

/**
 * Technical lockout on behavioural tracking & targeted advertising for minors (DC-20 / Section 9(3))
 */
function minorProtectionLockout(req, res, next) {
  if (req.currentUser && req.currentUser.is_minor) {
    // Hard block marketing targeting or analytics telemetry
    const path = req.path.toLowerCase();
    if (path.includes('marketing') || path.includes('analytics') || path.includes('tracking')) {
      return res.status(403).json({
        error: 'DPDP Section 9(3) Prohibition: Tracking, behavioural monitoring, and targeted advertising are strictly prohibited for minors under 18.',
        is_minor: true
      });
    }
  }
  next();
}

module.exports = {
  requireConsentPurpose,
  minorProtectionLockout
};

