/**
 * Administrative Control Center Controller
 * Security Controls: C-A01-02 (Admin RBAC), C-A09-02 (Audit Logs), DC-09 (Breach Simulation), DC-10 (Retention Purge)
 */

const fs = require('fs');
const path = require('path');
const userRepo = require('../repositories/userRepo');
const auditService = require('../services/auditService');
const dpdpService = require('../services/dpdpService');
const db = require('../repositories/db');

function listUsers(req, res, next) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const users = userRepo.listAllUsers(parseInt(limit, 10), parseInt(offset, 10));
    res.status(200).json({ success: true, users, count: users.length });
  } catch (err) {
    next(err);
  }
}

function getAuditLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = auditService.getRecentAuditLogs(limit);
    res.status(200).json({ success: true, logs });
  } catch (err) {
    next(err);
  }
}

function simulateBreachNotification(req, res, next) {
  try {
    // DC-09 / Section 8(6): Simulates statutory intimation to Board and users
    const runbookPath = path.resolve(__dirname, '../../../privacy/breach_runbook.md');
    const runbookText = fs.existsSync(runbookPath) ? fs.readFileSync(runbookPath, 'utf8') : '';

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'BREACH_SIMULATION_EXECUTED',
      resource: '/api/admin/simulate-breach-notification',
      ipAddress: req.ip,
      status: 'ALERT',
      details: { statutoryIntimationTarget: 'Data Protection Board of India' }
    });

    res.status(200).json({
      success: true,
      protocol: 'DPDP-S8(6)-BREACH-INTIMATION',
      board_notified: true,
      affected_principals_notified: true,
      timestamp: new Date().toISOString(),
      runbook_summary: 'Dispatched Form DPBI-BN-1 to Data Protection Board of India; user intimation email dispatched to affected principals.'
    });
  } catch (err) {
    next(err);
  }
}

function triggerRetentionPurge(req, res, next) {
  try {
    // DC-10 / Section 8(7): Automated Purge Job
    const result = dpdpService.purgeExpiredData();

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'DATA_RETENTION_PURGE_JOB_RUN',
      resource: '/api/admin/purge-expired-data',
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: result
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

function getComplianceOverview(req, res, next) {
  try {
    const controlsPath = path.resolve(__dirname, '../../../groundtruth/controls.json');
    const dpdpPath = path.resolve(__dirname, '../../../groundtruth/dpdp-controls.json');

    const securityControls = JSON.parse(fs.readFileSync(controlsPath, 'utf8'));
    const dpdpControls = JSON.parse(fs.readFileSync(dpdpPath, 'utf8'));

    const userCount = db.prepare('SELECT count(*) as count FROM users WHERE status != "erased"').get().count;
    const orderCount = db.prepare('SELECT count(*) as count FROM orders').get().count;
    const minorCount = db.prepare('SELECT count(*) as count FROM users WHERE is_minor = 1').get().count;
    const consentCount = db.prepare('SELECT count(*) as count FROM consent_ledger').get().count;

    res.status(200).json({
      success: true,
      baseline: {
        security_controls_total: securityControls.length,
        security_findings_target: 0,
        dpdp_controls_total: dpdpControls.length,
        dpdp_non_compliance_target: 0,
        status: 'CLEAN_NEGATIVE_CONTROL'
      },
      counts: {
        activeUsers: userCount,
        ordersFulfilled: orderCount,
        minorAccountsGated: minorCount,
        consentLedgerEntries: consentCount
      },
      securityControls,
      dpdpControls
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getAuditLogs,
  simulateBreachNotification,
  triggerRetentionPurge,
  getComplianceOverview
};

