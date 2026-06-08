const { Router } = require('express');
const { requireAdmin } = require('../../middleware/auth');
const {
  createManualTranslation,
  listManualTranslations,
  deleteManualTranslation,
} = require('../../controllers/manualTranslationController');

const router = Router();

router.post('/',        requireAdmin, createManualTranslation);
router.get('/',         requireAdmin, listManualTranslations);
router.delete('/:id',   requireAdmin, deleteManualTranslation);

module.exports = router;
