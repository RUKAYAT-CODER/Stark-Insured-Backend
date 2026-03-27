import { patchCookie, enforceHttps } from '../src/middleware/secure_transport';

describe('patchCookie', () => {
  it('adds Secure flag', () => expect(patchCookie('session=abc')).toContain('Secure'));
  it('adds HttpOnly flag', () => expect(patchCookie('session=abc')).toContain('HttpOnly'));
  it('adds SameSite=Strict', () => expect(patchCookie('session=abc')).toContain('SameSite=Strict'));
  it('does not duplicate flags', () => {
    const c = patchCookie('session=abc; Secure; HttpOnly; SameSite=Strict');
    expect((c.match(/Secure/g) ?? []).length).toBe(1);
  });
});
