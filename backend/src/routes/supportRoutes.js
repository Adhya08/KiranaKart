/**
 * Support, File Attachments & URL Import Routes
 * Controls: C-A01-04 (Path traversal), C-A08-04 (Safe file upload), C-A10-01 (SSRF defense)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileUploadService = require('../services/fileUploadService');
const ssrfService = require('../services/ssrfService');
const { authenticate } = require('../middleware/auth');

// Multer memory storage (never write unvalidated files to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/upload-attachment', authenticate, upload.single('attachment'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file attachment uploaded' });
    }

    const saved = fileUploadService.saveAttachment(
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded and verified successfully',
      file: saved
    });
  } catch (err) {
    next(err);
  }
});

router.get('/attachments/:opaqueId', authenticate, (req, res, next) => {
  try {
    const { opaqueId } = req.params;
    const filePath = fileUploadService.getAttachmentPath(opaqueId);

    if (!filePath) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// Safe supplier catalog URL import (SSRF protected) (C-A10-01)
router.post('/import-from-url', authenticate, async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'URL required' });

    const result = await ssrfService.validateAndFetchUrl(url);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
