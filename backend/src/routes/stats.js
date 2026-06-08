const { Router } = require('express');
const { getStats } = require('../controllers/statsController');

const router = Router();

// Public endpoint — no auth required so the landing page can display live counts
router.get('/', getStats);

module.exports = router;
