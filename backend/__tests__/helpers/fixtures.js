'use strict';

const { signToken } = require('../../src/utils/jwt');

// ── Canonical test users ───────────────────────────────────────────────────────

const CONTRIBUTOR = {
  id: 'user-contrib-001',
  name: 'Alice Contributor',
  email: 'alice@example.com',
  password_hash: '$2a$12$testhashcontributor',
  role: 'CONTRIBUTOR',
  is_admin: false,
  is_active: true,
  email_verified: true,
  is_profile_complete: true,
  native_language: 'kpelle',
  region_of_origin: 'Bong County',
  age_group: 'age_18_35',
  is_l1_speaker: true,
  reputation_score: 10,
  oauth_provider: null,
  photo_url: null,
  profession: null,
  totp_enabled: false,
  reset_token: null,
  reset_token_expires_at: null,
  verification_token: null,
  pending_email: null,
  created_at: new Date('2024-01-01'),
};

const ADMIN_USER = {
  ...CONTRIBUTOR,
  id: 'user-admin-001',
  name: 'Bob Admin',
  email: 'bob@example.com',
  role: 'ADMIN',
  is_admin: true,
};

const SUPER_ADMIN = {
  ...CONTRIBUTOR,
  id: 'user-super-001',
  name: 'Carol SuperAdmin',
  email: 'carol@example.com',
  role: 'SUPER_ADMIN',
  is_admin: true,
};

const MODERATOR = {
  ...CONTRIBUTOR,
  id: 'user-mod-001',
  name: 'Dave Moderator',
  email: 'dave@example.com',
  role: 'MODERATOR',
  is_admin: false,
};

const DEACTIVATED_USER = {
  ...CONTRIBUTOR,
  id: 'user-deact-001',
  email: 'deactivated@example.com',
  is_active: false,
};

const UNVERIFIED_USER = {
  ...CONTRIBUTOR,
  id: 'user-unverified-001',
  email: 'unverified@example.com',
  email_verified: false,
  verification_token: 'verify-token-123',
};

// ── JWT helpers ────────────────────────────────────────────────────────────────

function tokenFor(user) {
  return signToken({
    id: user.id,
    email: user.email,
    is_admin: user.is_admin,
    role: user.role,
    is_active: user.is_active,
  });
}

function expiredToken(user) {
  return signToken(
    { id: user.id, email: user.email, is_admin: user.is_admin, role: user.role, is_active: user.is_active },
    '-1s',
  );
}

// A token signed with a completely different secret → will fail server-side verification
function forgedToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: true, role: 'SUPER_ADMIN', is_active: true },
    'this-is-the-wrong-secret',
  );
}

// alg:none attack — unsigned JWT (manually constructed)
function algNoneToken(user) {
  const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ id: user.id, is_admin: true, role: 'SUPER_ADMIN' })).toString('base64url');
  return `${header}.${payload}.`;
}

module.exports = {
  CONTRIBUTOR,
  ADMIN_USER,
  SUPER_ADMIN,
  MODERATOR,
  DEACTIVATED_USER,
  UNVERIFIED_USER,
  tokenFor,
  expiredToken,
  forgedToken,
  algNoneToken,
};
