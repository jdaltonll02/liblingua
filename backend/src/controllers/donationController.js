const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

function getMtnConfig() {
  const key  = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const user = process.env.MTN_MOMO_API_USER;
  const pass = process.env.MTN_MOMO_API_KEY;
  if (!key || !user || !pass) return null;
  return {
    baseUrl: process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
    subKey:  key,
    user,
    pass,
    env:     process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
  };
}

async function getMtnToken(cfg) {
  const creds = Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64');
  const res   = await fetch(`${cfg.baseUrl}/collection/token/`, {
    method:  'POST',
    headers: { Authorization: `Basic ${creds}`, 'Ocp-Apim-Subscription-Key': cfg.subKey },
  });
  if (!res.ok) throw new Error(`MTN auth failed: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

// ── Stripe Checkout ───────────────────────────────────────────────────────────

async function createStripeSession(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Card payments are not configured on this server.' });
    }

    const { amount, donor_name, donor_email, message, is_anonymous } = req.body;
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) {
      return res.status(400).json({ error: 'Amount must be at least $1.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name:        'liblingua — Donation',
            description: message || 'Supporting language preservation in Liberia',
          },
          unit_amount: Math.round(amountNum * 100),
        },
        quantity: 1,
      }],
      customer_email: donor_email || undefined,
      metadata: {
        donor_name:   is_anonymous ? 'Anonymous' : (donor_name || ''),
        donor_email:  donor_email  || '',
        message:      message      || '',
        is_anonymous: String(Boolean(is_anonymous)),
      },
      success_url: `${frontendUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/donate?cancelled=1`,
    });

    // Create pending donation record
    await prisma.donation.create({
      data: {
        donor_name:   is_anonymous ? null : (donor_name?.trim() || null),
        donor_email:  donor_email?.trim().toLowerCase() || null,
        amount:       amountNum,
        currency:     'USD',
        provider:     'STRIPE',
        status:       'PENDING',
        provider_ref: session.id,
        message:      message?.trim() || null,
        is_anonymous: Boolean(is_anonymous),
      },
    });

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    next(err);
  }
}

// Called after Stripe redirects back to /donate/success?session_id=xxx
async function confirmStripeSession(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured.' });

    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required.' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const status  = session.payment_status === 'paid' ? 'COMPLETED' : 'PENDING';

    const donation = await prisma.donation.updateMany({
      where: { provider_ref: session_id },
      data:  {
        status,
        transaction_id: status === 'COMPLETED' ? session.payment_intent : undefined,
      },
    });

    res.json({
      succeeded:   status === 'COMPLETED',
      status,
      amount:      (session.amount_total || 0) / 100,
      currency:    session.currency?.toUpperCase() || 'USD',
      donor_email: session.customer_email || null,
    });
  } catch (err) {
    next(err);
  }
}

// Stripe webhook (for reliable server-side confirmation)
async function stripeWebhook(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(400).send('Stripe not configured');

    let event;
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.headers['stripe-signature'],
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`);
      }
    } else {
      event = JSON.parse(req.body.toString());
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        await prisma.donation.updateMany({
          where: { provider_ref: session.id },
          data:  { status: 'COMPLETED', transaction_id: session.payment_intent },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// ── MTN Mobile Money ──────────────────────────────────────────────────────────

async function initiateMtnMomo(req, res, next) {
  try {
    const cfg = getMtnConfig();
    if (!cfg) {
      return res.status(503).json({ error: 'MTN Mobile Money is not configured on this server.' });
    }

    const { amount, phone, currency = 'LRD', donor_name, donor_email, message } = req.body;
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) return res.status(400).json({ error: 'Amount must be at least 1.' });
    if (!phone)  return res.status(400).json({ error: 'Phone number is required.' });

    const referenceId  = uuidv4();
    const token        = await getMtnToken(cfg);
    const cleanPhone   = phone.replace(/\D/g, '');

    const momoRes = await fetch(`${cfg.baseUrl}/collection/v1_0/requesttopay`, {
      method:  'POST',
      headers: {
        'Authorization':              `Bearer ${token}`,
        'X-Reference-Id':             referenceId,
        'X-Target-Environment':       cfg.env,
        'Ocp-Apim-Subscription-Key':  cfg.subKey,
        'Content-Type':               'application/json',
      },
      body: JSON.stringify({
        amount:      String(Math.round(amountNum)),
        currency,
        externalId:  uuidv4(),
        payer:       { partyIdType: 'MSISDN', partyId: cleanPhone },
        payerMessage: 'liblingua donation',
        payeeNote:   message || 'Thank you for supporting language preservation in Liberia!',
      }),
    });

    if (!momoRes.ok) {
      const errText = await momoRes.text();
      return res.status(502).json({ error: `MTN request failed: ${errText.slice(0, 300)}` });
    }

    await prisma.donation.create({
      data: {
        donor_name:   donor_name?.trim() || null,
        donor_email:  donor_email?.trim().toLowerCase() || null,
        amount:       amountNum,
        currency,
        provider:     'MTN_MOMO',
        status:       'PENDING',
        provider_ref: referenceId,
        message:      message?.trim() || null,
        is_anonymous: !donor_name,
      },
    });

    res.json({
      reference_id: referenceId,
      message: 'A payment request has been sent to your phone. Please check your MTN MoMo prompt and approve the transaction.',
    });
  } catch (err) {
    next(err);
  }
}

async function checkMtnStatus(req, res, next) {
  try {
    const cfg = getMtnConfig();
    if (!cfg) return res.status(503).json({ error: 'MTN not configured.' });

    const { reference_id } = req.params;
    const token = await getMtnToken(cfg);

    const statusRes = await fetch(
      `${cfg.baseUrl}/collection/v1_0/requesttopay/${reference_id}`,
      {
        headers: {
          Authorization:               `Bearer ${token}`,
          'X-Target-Environment':      cfg.env,
          'Ocp-Apim-Subscription-Key': cfg.subKey,
        },
      },
    );

    const data   = await statusRes.json();
    const status = data.status === 'SUCCESSFUL' ? 'COMPLETED'
                 : data.status === 'FAILED'     ? 'FAILED'
                 : 'PENDING';

    if (status !== 'PENDING') {
      await prisma.donation.updateMany({
        where: { provider_ref: reference_id },
        data:  { status, transaction_id: status === 'COMPLETED' ? reference_id : undefined },
      });
    }

    res.json({ status, mtn_status: data.status, reason: data.reason || null });
  } catch (err) {
    next(err);
  }
}

// ── Public stats (shown on donate page) ─────────────────────────────────────

async function publicDonationStats(req, res, next) {
  try {
    const [count, total] = await Promise.all([
      prisma.donation.count({ where: { status: 'COMPLETED' } }),
      prisma.donation.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', currency: 'USD' } }),
    ]);
    res.json({ donors: count, total_usd: total._sum.amount || 0 });
  } catch (err) {
    next(err);
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function listDonations(req, res, next) {
  try {
    const { page = 1, limit = 50, status, provider } = req.query;
    const where = {};
    if (status)   where.status   = status;
    if (provider) where.provider = provider;

    const [donations, total] = await Promise.all([
      prisma.donation.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip:  (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 100),
        take:  Math.min(parseInt(limit), 100),
      }),
      prisma.donation.count({ where }),
    ]);

    const stats = await prisma.donation.groupBy({
      by: ['status'],
      _count: true,
      _sum:   { amount: true },
    });

    res.json({ donations, total, page: parseInt(page), stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStripeSession, confirmStripeSession, stripeWebhook,
  initiateMtnMomo, checkMtnStatus,
  publicDonationStats, listDonations,
};
