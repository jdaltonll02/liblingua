const { requireAuth, requireAdmin, requireRole } = require('../middleware/auth');
const { signToken } = require('../utils/jwt');

function makeReq({ cookie, header } = {}) {
  return {
    cookies: cookie ? { token: cookie } : {},
    headers: header ? { authorization: header } : {},
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function activeToken(overrides = {}) {
  return signToken({ id: 'u1', email: 'a@b.com', role: 'CONTRIBUTOR', is_active: true, is_admin: false, ...overrides });
}

describe('requireAuth', () => {
  test('returns 401 when no token is present', () => {
    const res = makeRes();
    const next = jest.fn();
    requireAuth(makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token from httpOnly cookie', () => {
    const next = jest.fn();
    const res  = makeRes();
    requireAuth(makeReq({ cookie: activeToken() }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accepts a valid token from Authorization header', () => {
    const next = jest.fn();
    const res  = makeRes();
    requireAuth(makeReq({ header: `Bearer ${activeToken()}` }), res, next);
    expect(next).toHaveBeenCalled();
  });

  test('prefers cookie over Authorization header when both present', () => {
    const next     = jest.fn();
    const res      = makeRes();
    const cookieTok = activeToken({ id: 'cookie-user' });
    const headerTok = activeToken({ id: 'header-user' });
    const req = makeReq({ cookie: cookieTok, header: `Bearer ${headerTok}` });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('cookie-user');
  });

  test('returns 401 for an expired token', async () => {
    const token = signToken({ id: 'u1', is_active: true }, '1ms');
    await new Promise((r) => setTimeout(r, 10));
    const res = makeRes();
    requireAuth(makeReq({ cookie: token }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 for a tampered token', () => {
    const [h, p, s] = activeToken().split('.');
    const tampered = `${h}.${p}X.${s}`;
    const res = makeRes();
    requireAuth(makeReq({ cookie: tampered }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when account is deactivated (is_active: false)', () => {
    const token = activeToken({ is_active: false });
    const res = makeRes();
    requireAuth(makeReq({ cookie: token }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/deactivated/i) }));
  });

  test('attaches decoded user to req.user on success', () => {
    const next = jest.fn();
    const req  = makeReq({ cookie: activeToken({ id: 'u99' }) });
    requireAuth(req, makeRes(), next);
    expect(req.user.id).toBe('u99');
  });
});

describe('requireAdmin', () => {
  test('allows ADMIN role through', () => {
    const next = jest.fn();
    const req  = makeReq({ cookie: activeToken({ role: 'ADMIN' }) });
    requireAdmin(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('allows SUPER_ADMIN role through', () => {
    const next = jest.fn();
    const req  = makeReq({ cookie: activeToken({ role: 'SUPER_ADMIN' }) });
    requireAdmin(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks CONTRIBUTOR role with 403', () => {
    const res = makeRes();
    requireAdmin(makeReq({ cookie: activeToken({ role: 'CONTRIBUTOR' }) }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('blocks MODERATOR role with 403', () => {
    const res = makeRes();
    requireAdmin(makeReq({ cookie: activeToken({ role: 'MODERATOR' }) }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('blocks unauthenticated request with 401', () => {
    const res = makeRes();
    requireAdmin(makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireRole', () => {
  test('allows exact role match', () => {
    const next = jest.fn();
    const req  = makeReq({ cookie: activeToken({ role: 'ANALYST' }) });
    requireRole('ANALYST')(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('allows when role is in multi-role list', () => {
    const next = jest.fn();
    const req  = makeReq({ cookie: activeToken({ role: 'MODERATOR' }) });
    requireRole('ADMIN', 'MODERATOR')(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks when role is not in list', () => {
    const res = makeRes();
    requireRole('ADMIN')(makeReq({ cookie: activeToken({ role: 'CONTRIBUTOR' }) }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
