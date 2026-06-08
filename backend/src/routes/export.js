const { Router } = require('express');
const { requireAuthOrApiKey } = require('../middleware/requireAuthOrApiKey');
const { exportLimiter } = require('../middleware/rateLimiter');
const { exportCsv, exportJson, exportHuggingFace } = require('../controllers/exportController');

const router = Router();

// Requires either a logged-in session cookie (browser) or an API key (code).
router.get('/csv',         requireAuthOrApiKey, exportLimiter, exportCsv);
router.get('/json',        requireAuthOrApiKey, exportLimiter, exportJson);
router.get('/huggingface', requireAuthOrApiKey, exportLimiter, exportHuggingFace);

module.exports = router;
