const { Router } = require('express');
const { requireAdmin } = require('../middleware/auth');
const { requireAuthOrApiKey } = require('../middleware/requireAuthOrApiKey');
const { listPublished, getDataset, publishLanguage, unpublishLanguage, deletePublication } = require('../controllers/datasetController');

const router = Router();

router.get('/published', listPublished);                      // public listing only
router.get('/',          requireAuthOrApiKey, getDataset);    // session cookie OR API key

router.post('/publish',          requireAdmin, publishLanguage);
router.delete('/publish/:lang',  requireAdmin, unpublishLanguage);
router.delete('/record/:lang',   requireAdmin, deletePublication);

module.exports = router;
