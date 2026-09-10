// Unit checks for api/_lib/cookies.js — parsing, serialising, and CSRF.
import assert from 'node:assert/strict';
import {
  parseCookies, serializeCookie, appendCookie, randomToken,
  setSessionCookie, clearSessionCookie, issueCsrfToken, ensureCsrfToken, verifyCsrf,
  SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER,
} from '../api/_lib/cookies.js';

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); fail++; }
};

// Minimal ServerResponse stand-in: only the header methods these functions use.
const mockRes = () => {
  const headers = {};
  return {
    headers,
    setHeader: (k, v) => { headers[k] = v; },
    getHeader: (k) => headers[k],
  };
};
const req = (cookie, extra = {}) => ({ headers: { ...(cookie ? { cookie } : {}), ...extra } });

console.log('\n── parseCookies ──');
t('reads a single pair', () =>
  assert.deepEqual(parseCookies(req('a=1')), { a: '1' }));
t('reads several pairs', () =>
  assert.deepEqual(parseCookies(req('a=1; b=2; c=3')), { a: '1', b: '2', c: '3' }));
t('no Cookie header yields {}', () =>
  assert.deepEqual(parseCookies(req()), {}));
t('undefined request yields {}', () =>
  assert.deepEqual(parseCookies(undefined), {}));
t('percent-decodes values', () =>
  assert.equal(parseCookies(req('x=a%20b')).x, 'a b'));
t('keeps a value containing "="', () =>
  assert.equal(parseCookies(req('jwt=aa.bb==')).jwt, 'aa.bb=='));
t('skips a malformed pair but keeps the good ones', () =>
  assert.deepEqual(parseCookies(req('bad; a=1')), { a: '1' }));
t('a leading "=" is not a name', () =>
  assert.deepEqual(parseCookies(req('=oops')), {}));
t('tolerates an undecodable value rather than throwing', () =>
  assert.equal(parseCookies(req('x=%E0%A4%A')).x, '%E0%A4%A'));
t('empty value is preserved', () =>
  assert.equal(parseCookies(req('a=')).a, ''));

console.log('\n── serializeCookie ──');
t('applies Path, SameSite and Secure by default', () => {
  const c = serializeCookie('a', '1');
  assert.match(c, /^a=1; Path=\/; SameSite=Lax; Secure$/);
});
t('omits Max-Age when not given', () =>
  assert.ok(!serializeCookie('a', '1').includes('Max-Age')));
t('includes Max-Age=0 when explicitly zero', () =>
  assert.match(serializeCookie('a', '', { maxAge: 0 }), /Max-Age=0/));
t('adds HttpOnly on request', () =>
  assert.match(serializeCookie('a', '1', { httpOnly: true }), /HttpOnly/));
t('can drop Secure for local http', () =>
  assert.ok(!serializeCookie('a', '1', { secure: false }).includes('Secure')));
t('percent-encodes the value', () =>
  assert.match(serializeCookie('a', 'x y'), /a=x%20y/));

console.log('\n── appendCookie ──');
t('sets the first cookie as an array', () => {
  const res = mockRes();
  appendCookie(res, 'a=1');
  assert.deepEqual(res.getHeader('Set-Cookie'), ['a=1']);
});
t('a second cookie does not clobber the first', () => {
  const res = mockRes();
  appendCookie(res, 'a=1');
  appendCookie(res, 'b=2');
  assert.deepEqual(res.getHeader('Set-Cookie'), ['a=1', 'b=2']);
});
t('absorbs a pre-existing string header', () => {
  const res = mockRes();
  res.setHeader('Set-Cookie', 'a=1');
  appendCookie(res, 'b=2');
  assert.deepEqual(res.getHeader('Set-Cookie'), ['a=1', 'b=2']);
});

console.log('\n── session cookie ──');
t('is HttpOnly and Secure', () => {
  const res = mockRes();
  setSessionCookie(res, 'sess-abc');
  const [c] = res.getHeader('Set-Cookie');
  assert.match(c, new RegExp(`^${SESSION_COOKIE}=sess-abc`));
  assert.match(c, /HttpOnly/);
  assert.match(c, /Secure/);
});
t('clearing expires it immediately', () => {
  const res = mockRes();
  clearSessionCookie(res);
  assert.match(res.getHeader('Set-Cookie')[0], /Max-Age=0/);
});

console.log('\n── randomToken ──');
t('is 64 hex chars (32 bytes)', () => assert.match(randomToken(), /^[0-9a-f]{64}$/));
t('does not repeat across 100 draws', () =>
  assert.equal(new Set(Array.from({ length: 100 }, randomToken)).size, 100));

console.log('\n── CSRF ──');
t('issued token is returned to the caller, and the cookie is HttpOnly', () => {
  const res = mockRes();
  const token = issueCsrfToken(res);
  const [c] = res.getHeader('Set-Cookie');
  assert.match(c, new RegExp(`^${CSRF_COOKIE}=${token}`));
  // The usual double-submit cookie has to be script-readable. This one does not,
  // because the token reaches the page through the JSON body of
  // GET /api/auth-session — issueCsrfToken RETURNS it, which is what the
  // assertion above pins. HttpOnly then removes it as an XSS prize while the
  // browser still proves it holds the cookie.
  assert.ok(c.includes('HttpOnly'), 'the page reads the token from JSON, not the cookie');
  assert.ok(c.includes('Secure'));
  assert.ok(c.includes('SameSite=Lax'));
});
t('matching cookie and header verify', () => {
  const token = randomToken();
  assert.equal(verifyCsrf(req(`${CSRF_COOKIE}=${token}`, { [CSRF_HEADER]: token })), true);
});
t('mismatched token fails', () => {
  assert.equal(
    verifyCsrf(req(`${CSRF_COOKIE}=${randomToken()}`, { [CSRF_HEADER]: randomToken() })), false);
});
t('missing header fails', () =>
  assert.equal(verifyCsrf(req(`${CSRF_COOKIE}=${randomToken()}`)), false));
t('missing cookie fails', () =>
  assert.equal(verifyCsrf(req('', { [CSRF_HEADER]: randomToken() })), false));
t('no cookies at all fails', () =>
  assert.equal(verifyCsrf(req()), false));
t('a differing-length token fails without throwing', () =>
  assert.equal(verifyCsrf(req(`${CSRF_COOKIE}=abc`, { [CSRF_HEADER]: 'abcd' })), false));
t('empty strings on both sides still fail', () =>
  assert.equal(verifyCsrf(req(`${CSRF_COOKIE}=`, { [CSRF_HEADER]: '' })), false));

console.log('\n── ensureCsrfToken ──');
// The navbar asks GET /api/auth-session on every page load. If that minted a
// new token each time, it would invalidate the one an open /signin tab is
// holding, and that tab's next POST would 403 for no visible reason.
t('an existing token is returned unchanged, not replaced', () => {
  const token = randomToken();
  const res = mockRes();
  assert.equal(ensureCsrfToken(req(`${CSRF_COOKIE}=${token}`), res), token);
  const [c] = res.getHeader('Set-Cookie');
  assert.match(c, new RegExp(`^${CSRF_COOKIE}=${token}`), 'the cookie value changed');
});
t('the reused cookie keeps HttpOnly, Secure and a fresh Max-Age', () => {
  const token = randomToken();
  const res = mockRes();
  ensureCsrfToken(req(`${CSRF_COOKIE}=${token}`), res);
  const [c] = res.getHeader('Set-Cookie');
  assert.ok(c.includes('HttpOnly'));
  assert.ok(c.includes('Secure'));
  assert.match(c, /Max-Age=2592000/, 'the 30-day window should slide forward');
});
t('a request with no cookie gets a fresh token', () => {
  const res = mockRes();
  const token = ensureCsrfToken(req(), res);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.match(res.getHeader('Set-Cookie')[0], new RegExp(`^${CSRF_COOKIE}=${token}`));
});
t('a malformed cookie is treated as absent rather than reused', () => {
  for (const bad of ['abc', '', randomToken().slice(0, 63), `${randomToken()}x`, 'Z'.repeat(64)]) {
    const res = mockRes();
    const token = ensureCsrfToken(req(`${CSRF_COOKIE}=${bad}`), res);
    assert.notEqual(token, bad, `reused a token that could never verify: "${bad}"`);
    assert.match(token, /^[0-9a-f]{64}$/);
  }
});
t('the token it returns verifies against the cookie it set', () => {
  const res = mockRes();
  const token = ensureCsrfToken(req(), res);
  assert.equal(verifyCsrf(req(`${CSRF_COOKIE}=${token}`, { [CSRF_HEADER]: token })), true);
});

console.log(`\n${fail ? '✗' : '✓'} cookies: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
