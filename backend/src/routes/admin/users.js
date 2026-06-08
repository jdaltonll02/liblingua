const express = require('express');
const { requireRole, requireAdmin } = require('../../middleware/auth');
const { uploadAvatar } = require('../../middleware/upload');
const {
  listUsers,
  getUserDetail,
  createUser,
  updateUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
} = require('../../controllers/userController');

const router = express.Router();

// User management is restricted to SUPER_ADMIN and ADMIN only
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), listUsers);
router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), getUserDetail);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createUser);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), uploadAvatar((req) => req.params.id), updateUser);
router.patch('/:id/role', requireRole('SUPER_ADMIN'), updateUserRole);
router.patch('/:id/deactivate', requireRole('SUPER_ADMIN', 'ADMIN'), deactivateUser);
router.patch('/:id/activate', requireRole('SUPER_ADMIN', 'ADMIN'), activateUser);
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteUser);

module.exports = router;
