const { Router } = require('express');
const { body } = require('express-validator');
const { requireAuth, requireResearchAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { activePolicies, allPolicies, myConsent, createConsentEvent } = require('../controllers/consentController');

const router = Router();

router.get('/active', activePolicies);
router.get('/admin/policies', requireResearchAdmin, allPolicies);
router.get('/me', requireAuth, myConsent);
router.post(
  '/',
  requireAuth,
  [
    body('policy_id').isUUID().withMessage('Valid policy_id is required'),
    body('decision').isIn(['GRANTED', 'WITHDRAWN']),
    body('scopes').isArray({ min: 1 }),
    body('scopes.*').isString(),
    body('reason').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  ],
  validate,
  createConsentEvent,
);

module.exports = router;
