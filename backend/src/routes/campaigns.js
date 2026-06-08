const { Router } = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign } = require('../controllers/campaignController');

const router = Router();

router.get('/',         listCampaigns);           // public
router.get('/:id',      getCampaign);             // public
router.post('/',        requireAdmin, createCampaign);
router.patch('/:id',    requireAdmin, updateCampaign);
router.delete('/:id',   requireAdmin, deleteCampaign);

module.exports = router;
