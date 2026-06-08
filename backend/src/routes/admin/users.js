const express = require('express');
const { requireRole, requireAdmin } = require('../../middleware/auth');
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

router.get('/', requireAdmin, listUsers);
router.get('/:id', requireAdmin, getUserDetail);
router.post('/', requireAdmin, createUser);
router.patch('/:id', requireAdmin, updateUser);
router.patch('/:id/role', requireRole('SUPER_ADMIN'), updateUserRole);
router.patch('/:id/deactivate', requireAdmin, deactivateUser);
router.patch('/:id/activate', requireAdmin, activateUser);
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteUser);

module.exports = router;
