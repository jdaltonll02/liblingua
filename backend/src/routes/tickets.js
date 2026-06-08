const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { submitTicket, listTickets, getTicket, updateTicket, getTicketStats } = require('../controllers/ticketController');

const router = Router();

// Public — anyone can submit a ticket (optionally authenticated)
router.post('/', (req, res, next) => {
  // Attach user if logged in, but don't block unauthenticated submissions
  const token = req.cookies?.token || req.headers.authorization?.slice(7);
  if (token) {
    try {
      const { verifyToken } = require('../utils/jwt');
      req.user = verifyToken(token);
    } catch { /* ignore invalid token */ }
  }
  next();
}, submitTicket);

// Admin only
router.get('/stats',  requireAdmin, getTicketStats);
router.get('/',       requireAdmin, listTickets);
router.get('/:id',    requireAdmin, getTicket);
router.patch('/:id',  requireAdmin, updateTicket);

module.exports = router;
