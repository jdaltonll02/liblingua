const { signToken, verifyToken } = require('../utils/jwt');

describe('jwt utility', () => {
  test('signToken returns a non-empty string', () => {
    const token = signToken({ id: 'u1', role: 'CONTRIBUTOR' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('verifyToken decodes the original payload', () => {
    const payload = { id: 'u1', email: 'a@b.com', role: 'CONTRIBUTOR', is_active: true };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('CONTRIBUTOR');
  });

  test('verifyToken throws on a tampered token', () => {
    const token = signToken({ id: 'u1' });
    const [h, p, s] = token.split('.');
    const tampered = `${h}.${p}TAMPERED.${s}`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  test('verifyToken throws on an expired token', async () => {
    const token = signToken({ id: 'u1' }, '1ms');
    await new Promise((r) => setTimeout(r, 10));
    expect(() => verifyToken(token)).toThrow(/expired/i);
  });

  test('verifyToken throws on a completely invalid string', () => {
    expect(() => verifyToken('not.a.jwt')).toThrow();
  });

  test('custom expiresIn is respected', async () => {
    const token = signToken({ id: 'u1' }, '2s');
    // Should not throw within TTL
    expect(() => verifyToken(token)).not.toThrow();
  });
});
