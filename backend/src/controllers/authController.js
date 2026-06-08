const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { signToken, verifyToken } = require('../utils/jwt');
const { sendVerificationEmail, sendInvitationEmail } = require('../services/emailService');

const AGE_GROUP_MAP = {
  under_18: 'under_18',
  '18_35': 'age_18_35',
  '36_55': 'age_36_55',
  '56_plus': 'age_56_plus',
};

const COOKIE_NAME = 'token';

function setCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict' });
}

const SAFE_SELECT = {
  id: true, name: true, email: true,
  native_language: true, native_dialect: true,
  region_of_origin: true, age_group: true, is_l1_speaker: true,
  reputation_score: true, is_admin: true, role: true, is_active: true,
  email_verified: true, is_profile_complete: true, oauth_provider: true,
  photo_url: true, profession: true,
  totp_enabled: true,
  created_at: true,
};

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function generateOAuthState() {
  const nonce = randomBytes(16).toString('hex');
  return signToken({ nonce, purpose: 'oauth_state' }, '10m');
}

function verifyOAuthState(state) {
  if (!state) return false;
  try {
    const payload = verifyToken(state);
    return payload.purpose === 'oauth_state';
  } catch { return false; }
}

async function findOrCreateOAuthUser({ email, name, googleId, githubId, provider }) {
  // Check by email first
  let contributor = await prisma.contributor.findUnique({ where: { email } });

  if (contributor) {
    const update = {};
    if (googleId && !contributor.google_id) update.google_id = googleId;
    if (githubId && !contributor.github_id) update.github_id = githubId;
    if (!contributor.email_verified) update.email_verified = true;
    if (Object.keys(update).length) {
      contributor = await prisma.contributor.update({ where: { id: contributor.id }, data: update });
    }
    return { contributor, isNew: false };
  }

  // Check by provider ID
  if (googleId) {
    contributor = await prisma.contributor.findUnique({ where: { google_id: googleId } }).catch(() => null);
    if (contributor) return { contributor, isNew: false };
  }
  if (githubId) {
    contributor = await prisma.contributor.findUnique({ where: { github_id: githubId } }).catch(() => null);
    if (contributor) return { contributor, isNew: false };
  }

  const created = await prisma.contributor.create({
    data: {
      name,
      email,
      google_id: googleId || null,
      github_id: githubId || null,
      oauth_provider: provider,
      email_verified: true,
      is_profile_complete: false,
    },
  });
  return { contributor: created, isNew: true };
}

async function issueOAuthSetPasswordEmail(contributor) {
  const reset_token = uuidv4();
  const reset_token_expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000);
  await prisma.contributor.update({
    where: { id: contributor.id },
    data: { reset_token, reset_token_expires_at },
  });
  sendInvitationEmail(contributor.email, contributor.name, reset_token).catch(console.error);
}

// ── Password auth ─────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { name, email, password, native_language, native_dialect, region_of_origin, is_l1_speaker } = req.body;
    const age_group = AGE_GROUP_MAP[req.body.age_group] || req.body.age_group;

    const existing = await prisma.contributor.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const devMode = !process.env.SMTP_HOST;
    const verification_token = devMode ? null : uuidv4();

    const contributor = await prisma.contributor.create({
      data: {
        name, email, password_hash,
        native_language, native_dialect: native_dialect || null,
        region_of_origin, age_group,
        is_l1_speaker: Boolean(is_l1_speaker),
        email_verified: devMode,
        verification_token,
        verification_sent_at: devMode ? null : new Date(),
        is_profile_complete: true,
      },
      select: SAFE_SELECT,
    });

    if (devMode) {
      // No SMTP configured — auto-verify and return JWT so user can sign in immediately
      const token = signToken({
        id: contributor.id,
        email: contributor.email,
        is_admin: contributor.is_admin,
        role: contributor.role,
        is_active: contributor.is_active,
      });
      setCookie(res, token);
      return res.status(201).json({ contributor, message: 'Account created.' });
    }

    sendVerificationEmail(email, name, verification_token).catch(console.error);

    // Don't set cookie — user must verify email first
    res.status(201).json({
      message: 'Account created. Please check your email to verify your account before signing in.',
      email,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const contributor = await prisma.contributor.findUnique({ where: { email } });
    if (!contributor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!contributor.password_hash) {
      if (contributor.reset_token) {
        return res.status(401).json({
          error: 'Please check your email to set your password before signing in.',
          needs_password_setup: true,
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, contributor.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!contributor.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in. Check your inbox for the verification link.',
        email_unverified: true,
        email,
      });
    }

    const token = signToken({
      id: contributor.id,
      email: contributor.email,
      is_admin: contributor.is_admin,
      role: contributor.role,
      is_active: contributor.is_active,
    });
    setCookie(res, token);

    const { password_hash: _, verification_token: __, ...safe } = contributor;
    res.json({ contributor: safe });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  clearCookie(res);
  res.json({ message: 'Logged out' });
}

async function me(req, res, next) {
  try {
    const contributor = await prisma.contributor.findUnique({
      where: { id: req.user.id },
      select: { ...SAFE_SELECT, _count: { select: { translations: true } } },
    });
    if (!contributor) return res.status(404).json({ error: 'Contributor not found' });
    res.json(contributor);
  } catch (err) {
    next(err);
  }
}

// ── Email verification ────────────────────────────────────────────────────────

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: { verification_token: token },
    });

    if (!contributor) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    // Reject tokens older than 24 hours
    if (contributor.verification_sent_at) {
      const age = Date.now() - new Date(contributor.verification_sent_at).getTime();
      if (age > VERIFICATION_EXPIRY_MS) {
        await prisma.contributor.update({
          where: { id: contributor.id },
          data: { verification_token: null },
        });
        return res.status(400).json({
          error: 'This verification link has expired. Please request a new one.',
          expired: true,
          email: contributor.email,
        });
      }
    }

    // If this is an email-change verification (not a new-account verification),
    // apply the pending address now and clear it.
    const isEmailChange = Boolean(contributor.pending_email);
    const updateData = {
      email_verified:       true,
      verification_token:   null,
      verification_sent_at: null,
    };
    if (isEmailChange) {
      updateData.email         = contributor.pending_email;
      updateData.pending_email = null;
    }

    const updated = await prisma.contributor.update({
      where:  { id: contributor.id },
      data:   updateData,
      select: SAFE_SELECT,
    });

    const jwt = signToken({
      id:       updated.id,
      email:    updated.email,
      is_admin: updated.is_admin,
      role:     updated.role,
      is_active: updated.is_active,
    });
    setCookie(res, jwt);
    res.json({
      contributor: updated,
      message: isEmailChange ? 'Email address updated successfully.' : 'Email verified. Welcome!',
    });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { email } });

    if (!contributor || !contributor.password_hash) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
    }
    if (contributor.email_verified) {
      return res.json({ message: 'This email is already verified. You can sign in.' });
    }

    const verification_token = uuidv4();
    await prisma.contributor.update({
      where: { id: contributor.id },
      data: { verification_token, verification_sent_at: new Date() },
    });

    sendVerificationEmail(email, contributor.name, verification_token).catch(console.error);
    res.json({ message: 'Verification email resent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
}

// ── SSO: profile completion ───────────────────────────────────────────────────

async function completeProfile(req, res, next) {
  try {
    const { native_language, native_dialect, region_of_origin, is_l1_speaker } = req.body;
    const age_group = AGE_GROUP_MAP[req.body.age_group] || req.body.age_group;

    const updated = await prisma.contributor.update({
      where: { id: req.user.id },
      data: {
        native_language, native_dialect: native_dialect || null,
        region_of_origin, age_group,
        is_l1_speaker: Boolean(is_l1_speaker),
        is_profile_complete: true,
      },
      select: SAFE_SELECT,
    });

    res.json({ contributor: updated });
  } catch (err) {
    next(err);
  }
}

// ── Profile update (authenticated) ───────────────────────────────────────────

async function updateProfile(req, res, next) {
  try {
    const { name, native_language, native_dialect, region_of_origin, is_l1_speaker, profession } = req.body;
    const age_group = req.body.age_group ? (AGE_GROUP_MAP[req.body.age_group] || req.body.age_group) : undefined;

    const data = {};
    if (name             != null) data.name             = String(name).trim();
    if (native_language  != null) data.native_language  = String(native_language).trim();
    if (native_dialect   != null) data.native_dialect   = String(native_dialect).trim() || null;
    if (region_of_origin != null) data.region_of_origin = String(region_of_origin).trim();
    // FormData sends booleans as strings — handle both forms
    if (is_l1_speaker    != null) data.is_l1_speaker    = is_l1_speaker === true || is_l1_speaker === 'true';
    if (age_group        != null) data.age_group        = age_group;
    if (profession       != null) data.profession       = String(profession).trim() || null;

    // Avatar uploaded via multipart — req.file is set by uploadAvatar() middleware
    if (req.file) {
      data.photo_url = req.file.location  // S3
        ?? req.file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/'); // disk
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.contributor.update({
      where:  { id: req.user.id },
      data,
      select: SAFE_SELECT,
    });

    res.json({ contributor: updated });
  } catch (err) {
    next(err);
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

async function googleRedirect(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_not_configured`);
  }
  const state = generateOAuthState();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.OAUTH_CALLBACK_BASE}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function googleCallback(req, res) {
  const { code, state, error } = req.query;

  if (error || !verifyOAuthState(state) || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.OAUTH_CALLBACK_BASE}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) throw new Error('No email from Google');

    const { contributor, isNew } = await findOrCreateOAuthUser({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      googleId: profile.sub,
      provider: 'google',
    });

    if (isNew) issueOAuthSetPasswordEmail(contributor).catch(console.error);

    const jwt = signToken({
      id: contributor.id,
      email: contributor.email,
      is_admin: contributor.is_admin,
      role: contributor.role,
      is_active: contributor.is_active,
    });
    setCookie(res, jwt);

    const dest = contributor.is_profile_complete ? '/dashboard' : '/auth/complete';
    res.redirect(`${process.env.FRONTEND_URL}${dest}`);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
  }
}

// ── GitHub OAuth ──────────────────────────────────────────────────────────────

async function githubRedirect(req, res) {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_not_configured`);
  }
  const state = generateOAuthState();
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.OAUTH_CALLBACK_BASE}/api/auth/github/callback`,
    scope: 'user:email',
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

async function githubCallback(req, res) {
  const { code, state, error } = req.query;

  if (error || !verifyOAuthState(state) || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.OAUTH_CALLBACK_BASE}/api/auth/github/callback`,
      }),
    });
    const { access_token, error: ghError } = await tokenRes.json();
    if (ghError) throw new Error(ghError);

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'liblingua/1.0' },
    });
    const ghUser = await userRes.json();

    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'liblingua/1.0' },
      });
      const emails = await emailsRes.json();
      email = (Array.isArray(emails) ? emails : []).find((e) => e.primary && e.verified)?.email;
    }
    if (!email) throw new Error('No verified email from GitHub');

    const { contributor, isNew } = await findOrCreateOAuthUser({
      email,
      name: ghUser.name || ghUser.login || email.split('@')[0],
      githubId: String(ghUser.id),
      provider: 'github',
    });

    if (isNew) issueOAuthSetPasswordEmail(contributor).catch(console.error);

    const jwt = signToken({
      id: contributor.id,
      email: contributor.email,
      is_admin: contributor.is_admin,
      role: contributor.role,
      is_active: contributor.is_active,
    });
    setCookie(res, jwt);

    const dest = contributor.is_profile_complete ? '/dashboard' : '/auth/complete';
    res.redirect(`${process.env.FRONTEND_URL}${dest}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
  }
}

// ── Password reset ────────────────────────────────────────────────────────────

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { email } });
    const msg = 'If that email exists, a reset link has been sent.';
    if (!contributor || !contributor.password_hash) return res.json({ message: msg });

    const reset_token = uuidv4();
    await prisma.contributor.update({
      where: { id: contributor.id },
      data: { reset_token, reset_token_expires_at: new Date(Date.now() + RESET_EXPIRY_MS) },
    });

    const { sendPasswordResetEmail } = require('../services/emailService');
    sendPasswordResetEmail(email, contributor.name, reset_token).catch(console.error);
    if (!process.env.SMTP_HOST) {
      const url = `${process.env.FRONTEND_URL}/auth/reset-password/${reset_token}`;
      console.log(`\n[EMAIL — dev mode] Password reset link for ${email}:\n  ${url}\n`);
    }
    res.json({ message: msg });
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { reset_token: token } });
    if (!contributor || !contributor.reset_token_expires_at ||
        new Date(contributor.reset_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    await prisma.contributor.update({
      where: { id: contributor.id },
      data: { password_hash, reset_token: null, reset_token_expires_at: null },
    });
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) { next(err); }
}

async function changeEmail(req, res, next) {
  try {
    const { email } = req.body;
    const existing = await prisma.contributor.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'That email is already in use.' });

    const devMode = !process.env.SMTP_HOST;
    if (devMode) {
      const updated = await prisma.contributor.update({
        where: { id: req.user.id },
        data: { email },
        select: SAFE_SELECT,
      });
      return res.json({ contributor: updated, message: 'Email updated.' });
    }

    // Production: store the new address and send a verification link to it.
    // The new address is saved in pending_email; verifyEmail applies it when clicked.
    const token = uuidv4();
    await prisma.contributor.update({
      where: { id: req.user.id },
      data: { pending_email: email, verification_token: token, verification_sent_at: new Date() },
    });

    const { sendEmailChangeVerification } = require('../services/emailService');
    sendEmailChangeVerification(email, req.user.name || 'there', token).catch(console.error);

    res.json({ message: `A verification link has been sent to ${email}. Click it to confirm the change.` });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { id: req.user.id } });
    if (!contributor.password_hash) {
      return res.status(400).json({ error: 'This account uses social sign-in. Password change is not available.' });
    }
    const valid = await bcrypt.compare(current_password, contributor.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
    const password_hash = await bcrypt.hash(new_password, 12);
    await prisma.contributor.update({ where: { id: req.user.id }, data: { password_hash } });
    res.json({ message: 'Password changed successfully.' });
  } catch (err) { next(err); }
}

// ── 2FA (TOTP) ────────────────────────────────────────────────────────────────

async function setup2FA(req, res, next) {
  try {
    const { authenticator } = require('otplib');
    const QRCode = require('qrcode');
    const secret = authenticator.generateSecret();
    const contributor = await prisma.contributor.findUnique({ where: { id: req.user.id } });
    const otpauth = authenticator.keyuri(contributor.email, 'liblingua', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    await prisma.contributor.update({
      where: { id: req.user.id },
      data: { totp_secret: secret, totp_enabled: false },
    });
    res.json({ secret, qr_code: qrDataUrl });
  } catch (err) { next(err); }
}

async function verify2FA(req, res, next) {
  try {
    const { authenticator } = require('otplib');
    const { code } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { id: req.user.id } });
    if (!contributor.totp_secret) {
      return res.status(400).json({ error: '2FA setup not initiated. Call /2fa/setup first.' });
    }
    if (!authenticator.verify({ token: code, secret: contributor.totp_secret })) {
      return res.status(401).json({ error: 'Invalid code. Please try again.' });
    }
    await prisma.contributor.update({ where: { id: req.user.id }, data: { totp_enabled: true } });
    res.json({ message: '2FA enabled successfully.' });
  } catch (err) { next(err); }
}

async function disable2FA(req, res, next) {
  try {
    const { authenticator } = require('otplib');
    const { code } = req.body;
    const contributor = await prisma.contributor.findUnique({ where: { id: req.user.id } });
    if (!contributor.totp_enabled) {
      return res.status(400).json({ error: '2FA is not enabled on this account.' });
    }
    if (!authenticator.verify({ token: code, secret: contributor.totp_secret })) {
      return res.status(401).json({ error: 'Invalid code. Please try again.' });
    }
    await prisma.contributor.update({
      where: { id: req.user.id },
      data: { totp_secret: null, totp_enabled: false },
    });
    res.json({ message: '2FA disabled.' });
  } catch (err) { next(err); }
}

// ── Admin ──────────────────────────────────────────────────────────────────────

async function promoteToAdmin(req, res, next) {
  try {
    // Only SUPER_ADMINs may promote others — ADMIN role is not sufficient
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only a SUPER_ADMIN can promote contributors to admin.' });
    }

    const contributor = await prisma.contributor.findUnique({ where: { email: req.body.email } });
    if (!contributor) return res.status(404).json({ error: 'Contributor not found' });

    const updated = await prisma.contributor.update({
      where: { email: req.body.email },
      data: { is_admin: true, role: 'ADMIN' },
      select: { id: true, name: true, email: true, is_admin: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register, login, logout, me,
  verifyEmail, resendVerification,
  completeProfile, updateProfile,
  changeEmail,
  googleRedirect, googleCallback,
  githubRedirect, githubCallback,
  promoteToAdmin,
  forgotPassword, resetPassword, changePassword,
  setup2FA, verify2FA, disable2FA,
};
