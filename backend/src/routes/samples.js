const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getRandomSample, getSampleById,
  createSample, bulkCreateSamples, getLanguageProgress, syncFromHuggingFace,
} = require('../controllers/sampleController');

const router = Router();

const DOMAINS = ['general', 'health', 'legal', 'education', 'news', 'conversational'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const sampleValidators = [
  body('text').trim().notEmpty().withMessage('text is required'),
  body('domain').isIn(DOMAINS).withMessage(`domain must be one of: ${DOMAINS.join(', ')}`),
  body('difficulty').isIn(DIFFICULTIES).withMessage(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`),
];

router.get('/random', requireAuth, getRandomSample);
router.get('/progress', requireAuth, getLanguageProgress);
router.get('/:id', requireAuth, getSampleById);
router.post('/', requireAdmin, sampleValidators, validate, createSample);
router.post('/bulk', requireAdmin, bulkCreateSamples);
router.post('/sync-huggingface', requireAdmin, syncFromHuggingFace);

module.exports = router;
