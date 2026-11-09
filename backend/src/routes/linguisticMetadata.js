const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireResearchAdmin } = require('../middleware/auth');
const controller = require('../controllers/linguisticMetadataController');

const router = Router();
const admin = requireResearchAdmin;
const uuid = (field) => body(field).isUUID().withMessage(`${field} must be a UUID`);

router.get('/', controller.listActive);
router.get('/admin', admin, controller.listAll);
router.get('/approvals', admin, controller.listApprovals);
router.get('/profiles/mine', requireAuth, controller.myProfiles);
router.put('/profiles/mine', requireAuth, [
  uuid('variety_id'),
  body('speaking_proficiency').isIn(['NONE', 'LIMITED', 'WORKING', 'PROFICIENT', 'DOMINANT']),
  body('reading_proficiency').isIn(['NONE', 'LIMITED', 'WORKING', 'PROFICIENT', 'DOMINANT']),
  body('writing_proficiency').isIn(['NONE', 'LIMITED', 'WORKING', 'PROFICIENT', 'DOMINANT']),
  body('usage_frequency').isIn(['RARELY', 'MONTHLY', 'WEEKLY', 'DAILY']),
  body('age_of_acquisition').optional({ nullable: true }).isInt({ min: 0, max: 120 }),
], validate, controller.upsertMyProfile);

router.post('/varieties', admin, [uuid('language_id'), body('code').trim().notEmpty(), body('name').trim().notEmpty()], validate, controller.createVariety);
router.post('/orthographies', admin, [uuid('variety_id'), body('code').trim().notEmpty(), body('name').trim().notEmpty(), body('script').trim().notEmpty()], validate, controller.createOrthography);
router.post('/guidelines', admin, [
  uuid('variety_id'), body('orthography_id').optional({ nullable: true }).isUUID(),
  body('version').trim().notEmpty(), body('title').trim().notEmpty(),
  body('content_hash').trim().notEmpty(), body('content_url').isURL({ require_tld: false }),
], validate, controller.createGuideline);
router.post('/approvals', admin, [
  body('resource_type').isIn(['LANGUAGE_VARIETY', 'ORTHOGRAPHY', 'ANNOTATION_GUIDELINE', 'RESEARCH_POLICY', 'DATASET_RELEASE', 'DATASET_RELEASE_CANDIDATE']),
  body('resource_id').trim().notEmpty(), body('authority_role').isIn(['COMMUNITY', 'RESEARCH']),
  body('decision').isIn(['APPROVED', 'REJECTED']),
], validate, controller.approve);
router.post('/activate', admin, [
  body('resource_type').isIn(['LANGUAGE_VARIETY', 'ORTHOGRAPHY', 'ANNOTATION_GUIDELINE', 'RESEARCH_POLICY']), uuid('resource_id'),
], validate, controller.activate);

module.exports = router;
