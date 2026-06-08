const express = require('express');
const { requireAdmin } = require('../../middleware/auth');
const { listAuditLogs } = require('../../controllers/auditController');

const router = express.Router();

router.get('/', requireAdmin, listAuditLogs);

module.exports = router;
