const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listContributors, listContributorsAdmin, deleteContributor } = require('../controllers/contributorsController');

const router = Router();

router.get('/', listContributors); // public

// Admin routes
const { requireAdmin } = require('../middleware/auth');
router.get('/admin/list',       requireAdmin, listContributorsAdmin);
router.delete('/admin/:id',     requireAdmin, deleteContributor);

module.exports = router;

