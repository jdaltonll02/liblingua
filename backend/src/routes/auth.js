const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const {
  register, login, logout, me,
  verifyEmail, resendVerification,
  completeProfile, updateProfile,
  changeEmail,
  googleRedirect, googleCallback,
  githubRedirect, githubCallback,
  promoteToAdmin,
  forgotPassword, resetPassword, changePassword,
  setup2FA, verify2FA, disable2FA,
} = require('../controllers/authController');

const router = Router();

const AGE_GROUPS = ['under_18', '18_35', '36_55', '56_plus'];

// ── Password auth ─────────────────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('native_language').trim().notEmpty().withMessage('Native language is required'),
    body('region_of_origin').trim().notEmpty().withMessage('Region of origin is required'),
    body('age_group').isIn(AGE_GROUPS).withMessage(`Age group must be one of: ${AGE_GROUPS.join(', ')}`),
    body('is_l1_speaker').isBoolean().withMessage('is_l1_speaker must be a boolean'),
  ],
  validate,
  register,
);

router.post(
  '/login',
  [
    body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login,
);

router.post('/logout', logout);
router.get('/me', requireAuth, me);

// ── Email verification ────────────────────────────────────────────────────────

router.get('/verify/:token', verifyEmail);

router.post(
  '/resend-verification',
  [body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required')],
  validate,
  resendVerification,
);

// ── Profile completion (SSO users) ────────────────────────────────────────────

router.patch(
  '/complete-profile',
  requireAuth,
  [
    body('native_language').trim().notEmpty().withMessage('Native language is required'),
    body('region_of_origin').trim().notEmpty().withMessage('Region of origin is required'),
    body('age_group').isIn(AGE_GROUPS).withMessage(`Age group must be one of: ${AGE_GROUPS.join(', ')}`),
    body('is_l1_speaker').isBoolean().withMessage('is_l1_speaker must be a boolean'),
  ],
  validate,
  completeProfile,
);

// ── Profile update (any authenticated user) ───────────────────────────────────

router.patch(
  '/profile',
  requireAuth,
  uploadAvatar(),   // parses multipart/form-data and attaches req.file if a photo was included
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
    body('native_language').optional().trim().notEmpty(),
    body('native_dialect').optional(),
    body('region_of_origin').optional().trim().notEmpty(),
    body('age_group').optional().isIn(AGE_GROUPS).withMessage(`Age group must be one of: ${AGE_GROUPS.join(', ')}`),
    body('is_l1_speaker').optional(),
  ],
  validate,
  updateProfile,
);

// ── Email change ──────────────────────────────────────────────────────────────

router.post(
  '/change-email',
  requireAuth,
  [body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required')],
  validate,
  changeEmail,
);

// ── Password reset ───────────────────────────────────────────────────────────

router.post(
  '/forgot-password',
  [body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required')],
  validate,
  forgotPassword,
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  validate,
  resetPassword,
);

router.post(
  '/change-password',
  requireAuth,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  validate,
  changePassword,
);

// ── 2FA ───────────────────────────────────────────────────────────────────────

router.post('/2fa/setup',   requireAuth, setup2FA);
router.post('/2fa/verify',  requireAuth, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit code required'),
], validate, verify2FA);
router.post('/2fa/disable', requireAuth, [
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit code required'),
], validate, disable2FA);

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

router.get('/github', githubRedirect);
router.get('/github/callback', githubCallback);

// ── Admin ─────────────────────────────────────────────────────────────────────

router.post(
  '/promote',
  requireAdmin,
  [body('email').isString().withMessage('Valid email required').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required')],
  validate,
  promoteToAdmin,
);

module.exports = router;
