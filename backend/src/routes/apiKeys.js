const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { createKey, listKeys, revokeKey } = require('../controllers/apiKeyController');

const router = Router();

router.post('/',      requireAuth, createKey);
router.get('/',       requireAuth, listKeys);
router.delete('/:id', requireAuth, revokeKey);

module.exports = router;
