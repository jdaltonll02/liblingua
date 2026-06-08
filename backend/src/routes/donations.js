const { Router } = require('express');
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const {
  createStripeSession, confirmStripeSession, stripeWebhook,
  initiateMtnMomo, checkMtnStatus,
  publicDonationStats, listDonations,
} = require('../controllers/donationController');

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/stats', publicDonationStats);

// Stripe — webhook must receive raw body before JSON parsing
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
router.post('/stripe/session',  createStripeSession);
router.get('/stripe/confirm',   confirmStripeSession);

// MTN MoMo
router.post('/mtn/initiate',              initiateMtnMomo);
router.get('/mtn/status/:reference_id',   checkMtnStatus);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, listDonations);

module.exports = router;
