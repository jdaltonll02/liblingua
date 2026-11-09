const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin, requireRole } = require('../middleware/auth');
const { uploadDualAudio } = require('../middleware/upload');
const {
  submitTranslation, getTranslations,
  getContributorTranslations, validateTranslation,
  assignReviewers, submitReview, adjudicateTranslation,
  reviseTranslation, reviewQueue, reviewHistory,
  eligibleReviewers,
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
    body('language_variety_id').isUUID().withMessage('language_variety_id is required'),
    body('orthography_id').isUUID().withMessage('orthography_id is required'),
    body('guideline_id').isUUID().withMessage('guideline_id is required'),
    body('translated_text').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
    body('register').optional().isIn(['GENERAL', 'CASUAL', 'FORMAL', 'TECHNICAL', 'CEREMONIAL', 'OTHER']),
    body('uncertainty').optional().isIn(['CONFIDENT', 'SOME_UNCERTAINTY', 'NEEDS_DISCUSSION']),
    body('annotation_outcome').optional().isIn(['TRANSLATED', 'UNTRANSLATABLE', 'CULTURALLY_SENSITIVE', 'NEEDS_CONTEXT']),
    body('alternative_translation').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('annotation_notes').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('code_switching_notes').optional({ checkFalsy: true }).isLength({ max: 2000 }),
  ],
  validate,
  submitTranslation
);

router.get('/', requireRole('SUPER_ADMIN', 'ADMIN', 'ANALYST'), getTranslations);
router.get('/mine', requireAuth, getContributorTranslations);
router.get(
  '/reviewers',
  requireRole('SUPER_ADMIN', 'ADMIN', 'RESEARCHER'),
  eligibleReviewers,
);
router.get(
  '/review-queue',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'RESEARCHER'),
  reviewQueue,
);

router.post(
  '/:id/review-assignments',
  requireRole('SUPER_ADMIN', 'ADMIN', 'RESEARCHER'),
  [body('reviewer_ids').isArray({ min: 2 }), body('reviewer_ids.*').isUUID()],
  validate,
  assignReviewers,
);

router.post(
  '/:id/reviews',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'RESEARCHER'),
  [body('decision').isIn(['APPROVE', 'REQUEST_CHANGES', 'REJECT', 'ABSTAIN'])],
  validate,
  submitReview,
);

router.get(
  '/:id/reviews',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'RESEARCHER'),
  reviewHistory,
);

router.post(
  '/:id/adjudications',
  requireRole('SUPER_ADMIN', 'ADMIN', 'RESEARCHER'),
  [body('decision').isIn(['APPROVE', 'REJECT', 'RETURN_FOR_REVISION'])],
  validate,
  adjudicateTranslation,
);

router.patch(
  '/:id/revise',
  requireAuth,
  [
    body('translated_text').trim().notEmpty().isLength({ max: 5000 }),
    body('change_reason').trim().notEmpty().isLength({ max: 2000 }),
  ],
  validate,
  reviseTranslation,
);

router.patch(
  '/:id/validate',
  requireAdmin,
  validateTranslation
);

module.exports = router;
