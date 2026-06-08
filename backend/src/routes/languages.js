const { Router } = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getLanguages, createLanguage, updateLanguage, deleteLanguage } = require('../controllers/languageController');

const router = Router();

router.get('/',        getLanguages);                   // public — used by LanguageSelector
router.post('/',       requireAdmin, createLanguage);
router.patch('/:id',   requireAdmin, updateLanguage);
router.delete('/:id',  requireAdmin, deleteLanguage);

module.exports = router;
