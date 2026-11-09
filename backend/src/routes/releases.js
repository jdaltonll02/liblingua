const { Router } = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { requireAuthOrApiKey } = require('../middleware/requireAuthOrApiKey');
const controller = require('../controllers/releaseController');

const router = Router();
const admin = requireRole('SUPER_ADMIN', 'ADMIN', 'RESEARCHER');

router.get('/', controller.listPublic);
router.get('/admin', admin, controller.listAdmin);
router.get('/:id/data', requireAuthOrApiKey, [
  query('split').optional().isIn(['train', 'validation', 'test']),
], validate, controller.data);
router.get('/:id/artifact', requireAuthOrApiKey, controller.artifact);
router.post('/', admin, [
  body('language').trim().notEmpty(),
  body('semantic_version').matches(/^\d+\.\d+\.\d+$/),
  body('split_seed').isString().isLength({ min: 16, max: 200 }),
  body('split_mode').optional().isIn(['SOURCE_GROUPED', 'SOURCE_AND_SPEAKER_GROUPED']),
  body('git_commit').matches(/^[a-f0-9]{7,64}$/i),
  body('changelog').optional({ nullable: true }).isString().isLength({ max: 10000 }),
], validate, controller.createCandidate);
router.post('/:id/publish', admin, controller.publish);

module.exports = router;
