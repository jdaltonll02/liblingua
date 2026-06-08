const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { listBadgeDefinitions, myBadges, contributorBadges, myStreak } = require('../controllers/badgeController');

const router = Router();

router.get('/definitions',         listBadgeDefinitions);        // public — list all badge types
router.get('/mine',                requireAuth, myBadges);       // authenticated user's badges
router.get('/streak',              requireAuth, myStreak);       // authenticated user's streak
router.get('/contributor/:id',     contributorBadges);           // any contributor's public badges

module.exports = router;
