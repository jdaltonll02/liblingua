const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadDualAudio } = require('../middleware/upload');
const {
  submitTranslation, getTranslations,
  getContributorTranslations, validateTranslation,
} = require('../controllers/translationController');

const router = Router();

const LANGUAGES = ['kpelle', 'bassa', 'grebo', 'vai', 'mende', 'loma', 'krahn', 'dan'];

router.post(
  '/',
  requireAuth,
  uploadDualAudio(),
  [
    body('sample_id').isUUID().withMessage('Valid sample_id UUID required'),
    body('target_language').trim().notEmpty().withMessage('target_language is required'),
    body('translated_text').trim().notEmpty().isLength({ max: 5000 }).withMessage('translated_text is required and must be under 5000 characters'),
  ],
  validate,
  submitTranslation
);

router.get('/', requireAuth, getTranslations);
router.get('/mine', requireAuth, getContributorTranslations);

router.patch(
  '/:id/validate',
  requireAdmin,
  [
    body('is_validated').isBoolean().withMessage('is_validated must be boolean'),
    body('quality_score')
      .if(body('is_validated').custom((v) => v === true || v === 'true'))
      .notEmpty().withMessage('quality_score is required when validating a translation')
      .isFloat({ min: 0, max: 1 }).withMessage('quality_score must be between 0 and 1'),
    body('quality_score')
      .if(body('is_validated').custom((v) => !(v === true || v === 'true')))
      .optional()
      .isFloat({ min: 0, max: 1 }).withMessage('quality_score must be between 0 and 1'),
  ],
  validate,
  validateTranslation
);

module.exports = router;
