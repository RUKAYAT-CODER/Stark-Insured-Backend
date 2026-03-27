import { issueRefreshToken, validateRefreshToken, revokeToken, RefreshTokenError } from '../src/auth/refresh_token';

const USER = 'user-123';
const IP_A = '203.0.113.10';
const IP_B = '198.51.100.42';

test('issues unique tokens', () => expect(issueRefreshToken(USER, IP_A)).not.toBe(issueRefreshToken(USER, IP_A)));
test('validates same IP', () => expect(validateRefreshToken(issueRefreshToken(USER, IP_A), IP_A)).toBe(USER));
test('throws IP_MISMATCH', () => {
  const t = issueRefreshToken(USER, IP_A);
  try { validateRefreshToken(t, IP_B); } catch(e) { expect((e as RefreshTokenError).code).toBe('IP_MISMATCH'); }
});
test('revokes after mismatch', () => {
  const t = issueRefreshToken(USER, IP_A);
  try { validateRefreshToken(t, IP_B); } catch {}
  try { validateRefreshToken(t, IP_A); } catch(e) { expect((e as RefreshTokenError).code).toBe('TOKEN_REVOKED'); }
});
test('normalises IPv6', () => expect(validateRefreshToken(issueRefreshToken(USER, '::ffff:'+IP_A), IP_A)).toBe(USER));
