/**
 * Privacy & DPDP Compliance Controller
 * Implements Controls: DC-01 through DC-24
 */

const fs = require('fs');
const path = require('path');
const dpdpService = require('../services/dpdpService');
const auditService = require('../services/auditService');
const cryptoService = require('../services/cryptoService');
const db = require('../repositories/db');
const config = require('../config/env');

function getPrivacyNotice(req, res, next) {
  try {
    const lang = req.query.lang || 'en';
    const noticePath = path.resolve(__dirname, '../../../privacy/notice.json');
    const noticeJson = JSON.parse(fs.readFileSync(noticePath, 'utf8'));

    const langData = noticeJson.languages[lang] || noticeJson.languages['en'];
    res.status(200).json({
      success: true,
      version: noticeJson.version,
      fiduciary: noticeJson.fiduciary_name,
      dpo_contact: noticeJson.dpo_contact,
      available_languages: Object.keys(noticeJson.languages),
      current_language: lang,
      notice: langData
    });
  } catch (err) {
    next(err);
  }
}

function getUserConsents(req, res, next) {
  try {
    const consents = dpdpService.getUserConsents(req.currentUser.id);
    res.status(200).json({ success: true, consents });
  } catch (err) {
    next(err);
  }
}

function updateConsent(req, res, next) {
  try {
    const { purpose, status } = req.body || {};
    if (!purpose || !['granted', 'withdrawn'].includes(status)) {
      return res.status(400).json({ error: 'Valid purpose and status (granted|withdrawn) required' });
    }

    if (purpose === 'essential' && status === 'withdrawn') {
      return res.status(400).json({
        error: 'Essential processing cannot be withdrawn while maintaining an active account. Please use Account Erasure under Section 12 if you wish to close your account.'
      });
    }

    const result = dpdpService.recordConsent({
      userId: req.currentUser.id,
      purpose,
      status,
      channel: 'privacy_center_toggle',
      ipAddress: req.ip
    });

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: status === 'granted' ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
      resource: '/api/privacy/consent',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: { purpose, status }
    });

    res.status(200).json({ success: true, consent: result });
  } catch (err) {
    next(err);
  }
}

function downloadMyData(req, res, next) {
  try {
    // DPDP Section 11: Right to Access comprehensive export
    const exportData = dpdpService.generateDataPrincipalExport(req.currentUser.id);

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'DATA_PORTABILITY_EXPORT_GENERATED',
      resource: '/api/privacy/download-my-data',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kiranakart_data_export_${req.currentUser.id}.json"`);
    res.status(200).json(exportData);
  } catch (err) {
    next(err);
  }
}

function requestErasure(req, res, next) {
  try {
    // DPDP Section 12: Right to Erasure
    const result = dpdpService.executeRightToErasure(req.currentUser.id);

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'DATA_PRINCIPAL_ERASURE_EXECUTED',
      resource: '/api/privacy/request-erasure',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.clearCookie('jwt_token');
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

function getNominee(req, res, next) {
  try {
    const nominee = dpdpService.getNominee(req.currentUser.id);
    res.status(200).json({ success: true, nominee });
  } catch (err) {
    next(err);
  }
}

function setNominee(req, res, next) {
  try {
    const { name, relationship, email, phone } = req.body || {};
    if (!name || !relationship || !email || !phone) {
      return res.status(400).json({ error: 'Nominee full name, relationship, email, and phone are required' });
    }

    const updated = dpdpService.setNominee(req.currentUser.id, {
      name: name.trim(),
      relationship: relationship.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim()
    });

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'NOMINEE_REGISTERED',
      resource: '/api/privacy/nominee',
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.status(200).json({ success: true, nominee: updated });
  } catch (err) {
    next(err);
  }
}

function submitGrievance(req, res, next) {
  try {
    const { category, description } = req.body || {};
    if (!category || !description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Grievance category and detailed description (min 10 chars) required' });
    }

    const ticketId = `GRV-2026-${cryptoService.generateSecureToken(6).toUpperCase()}`;
    const id = `grv_${cryptoService.generateSecureToken(10)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO grievances (id, ticket_id, user_id, category, description, status, board_escalated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'in_review', 0, ?, ?)
    `).run(id, ticketId, req.currentUser.id, category, description.trim(), now, now);

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'GRIEVANCE_FILED',
      resource: `/api/privacy/grievances/${ticketId}`,
      ipAddress: req.ip,
      status: 'SUCCESS'
    });

    res.status(201).json({
      success: true,
      ticketId,
      sla_hours: 72,
      message: 'Grievance registered. Under DPDP S8(10), our Grievance Officer will respond within 72 hours.',
      escalation_notice: 'If unresolved within 72 hours, you may escalate to the Data Protection Board of India.'
    });
  } catch (err) {
    next(err);
  }
}

function listUserGrievances(req, res, next) {
  try {
    const tickets = db.prepare('SELECT * FROM grievances WHERE user_id = ? ORDER BY created_at DESC').all(req.currentUser.id);
    res.status(200).json({ success: true, tickets });
  } catch (err) {
    next(err);
  }
}

function getSignificantDataFiduciaryStatus(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      sdf_status: config.SIGNIFICANT_DATA_FIDUCIARY_ENABLED ? 'DESIGNATED' : 'STANDARD',
      statutory_provisions: {
        dpo_appointed: true,
        dpo_name: 'Smt. Priyanka Sharma',
        dpia_performed: true,
        dpia_document: '/privacy/dpia_summary.md',
        audit_frequency: 'Annual Independent Audit',
        retention_schedule: '/privacy/retention_schedule.json',
        storage_region: config.PRIMARY_STORAGE_REGION
      }
    });
  } catch (err) {
    next(err);
  }
}

function consentManagerHook(req, res, next) {
  try {
    // DPDP S6(7)-S6(9): Registered Consent Manager interoperability endpoint
    const { userId, requestedPurposes } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId query parameter required' });

    const consents = dpdpService.getUserConsents(userId);
    res.status(200).json({
      success: true,
      protocol: 'DPDP-CM-INTEROP-v1',
      user_id: userId,
      registered_fiduciary: 'KiranaKart Technologies Private Limited',
      consent_records: consents
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPrivacyNotice,
  getUserConsents,
  updateConsent,
  downloadMyData,
  requestErasure,
  getNominee,
  setNominee,
  submitGrievance,
  listUserGrievances,
  getSignificantDataFiduciaryStatus,
  consentManagerHook
};
