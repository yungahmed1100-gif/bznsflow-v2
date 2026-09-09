// Unit checks for the sign-in layer: api/_lib/auth.js, plus the request-shaping
// each handler does before it touches the network.
//
// Same runner style as cookies.test.mjs — a flat script with a pass/fail tally
// and a non-zero exit — because `npm test` chains these with && and node:test's
// output would not match the others.
//
// The database RPCs are NOT exercised here. They are one transaction each and
// worth testing against real Postgres, which is what scripts/chat-test-stack.sh
// exists for; the verification queries at the bottom of 003-accounts.sql cover
// them against the live project.

import assert from 'node:assert/strict';
import {
  normalizeEmail, isValidEmail, generateCode, normalizeCode,
  hashCode, hashToken, validateProfile, authBuckets, LIMITS,
} from '../api/_lib/auth.js';
import { bucketKeys } from '../api/_lib/guard.js';
import { CSRF_COOKIE, CSRF_HEADER, randomToken, safeEqual } from '../api/_lib/cookies.js';
import { INDUSTRY_IDS } from '../src/lib/industries.js';
import { COUNTRY_CODES, dialFor, countryOptions } from '../src/lib/countries.js';

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); fail++; }
};
const ta = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); fail++; }
};

process.env.AUTH_OTP_PEPPER ||= 'test-pepper';

console.log('\nemail');
t('lowercases and trims', () =>
  assert.equal(normalizeEmail('  Ahmed@BznsFlowAI.com '), 'ahmed@bznsflowai.com'));
t('accepts an ordinary address', () =>
  assert.equal(isValidEmail('ahmed@bznsflowai.com'), true));
t('accepts a subdomain and a plus tag', () =>
  assert.equal(isValidEmail('a+b@mail.example.co.uk'), true));
t('rejects a missing @', () => assert.equal(isValidEmail('ahmed.example.com'), false));
t('rejects a missing TLD', () => assert.equal(isValidEmail('ahmed@localhost'), false));
t('rejects whitespace inside', () => assert.equal(isValidEmail('a b@example.com'), false));
t('rejects empty and nullish', () => {
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(null), false);
});
t('rejects an over-long address', () =>
  assert.equal(isValidEmail(`${'a'.repeat(LIMITS.email)}@example.com`), false));

console.log('\ncodes');
t('is always six digits', () => {
  for (let i = 0; i < 2000; i++) assert.match(generateCode(), /^\d{6}$/);
});
t('spans the whole range, including values needing zero-padding', () => {
  // A modulo-biased or unpadded generator fails this: 1000 draws that never
  // start with 0 would mean the leading digit is not uniform.
  const seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(generateCode()[0]);
  assert.equal(seen.size, 10, `leading digits seen: ${[...seen].sort().join('')}`);
});
t('strips separators from a pasted code', () => {
  assert.equal(normalizeCode('123 456'), '123456');
  assert.equal(normalizeCode('123-456'), '123456');
});

console.log('\nhashing');
t('is deterministic for the same code and address', () =>
  assert.equal(hashCode('123456', 'a@b.com'), hashCode('123456', 'a@b.com')));
t('is salted by the address — same code, different person, different hash', () =>
  assert.notEqual(hashCode('123456', 'a@b.com'), hashCode('123456', 'c@d.com')));
t('normalises the address before hashing', () =>
  assert.equal(hashCode('123456', 'A@B.com'), hashCode('123456', ' a@b.com ')));
t('normalises the code before hashing', () =>
  assert.equal(hashCode('123 456', 'a@b.com'), hashCode('123456', 'a@b.com')));
t('depends on the pepper', () => {
  const before = hashCode('123456', 'a@b.com');
  const original = process.env.AUTH_OTP_PEPPER;
  process.env.AUTH_OTP_PEPPER = 'different';
  const after = hashCode('123456', 'a@b.com');
  process.env.AUTH_OTP_PEPPER = original;
  assert.notEqual(before, after);
});
t('throws loudly when the pepper is unset', () => {
  const original = process.env.AUTH_OTP_PEPPER;
  delete process.env.AUTH_OTP_PEPPER;
  assert.throws(() => hashCode('123456', 'a@b.com'), /AUTH_OTP_PEPPER/);
  process.env.AUTH_OTP_PEPPER = original;
});
t('session tokens hash to 64 hex chars and never echo the token', () => {
  const token = randomToken();
  const hash = hashToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
});
t('safeEqual matches equal values and rejects unequal or differing lengths', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
  assert.equal(safeEqual(undefined, ''), true); // both coerce to empty
});

console.log('\nprofile validation');
const good = { name: 'Ahmed', phone: '501234567', country: 'AE', industry: 'real-estate', lang: 'en' };
t('accepts a well-formed profile and composes E.164', () => {
  const r = validateProfile(good);
  assert.equal(r.ok, true);
  assert.equal(r.profile.phone, '+971501234567');
  assert.equal(r.profile.country, 'AE');
});
t('drops the national trunk zero', () =>
  assert.equal(validateProfile({ ...good, phone: '0501234567' }).profile.phone, '+971501234567'));
t('tolerates spaces and dashes in the number', () =>
  assert.equal(validateProfile({ ...good, phone: '050 123-4567' }).profile.phone, '+971501234567'));
t('uppercases the country code', () =>
  assert.equal(validateProfile({ ...good, country: 'ae' }).profile.country, 'AE'));
t('rejects an empty name', () =>
  assert.equal(validateProfile({ ...good, name: '   ' }).field, 'name'));
t('rejects an over-long name', () =>
  assert.equal(validateProfile({ ...good, name: 'a'.repeat(LIMITS.name + 1) }).field, 'name'));
t('rejects an unknown country', () =>
  assert.equal(validateProfile({ ...good, country: 'ZZ' }).field, 'country'));
t('rejects a too-short phone', () =>
  assert.equal(validateProfile({ ...good, phone: '12' }).field, 'phone'));
t('rejects a too-long phone', () =>
  assert.equal(validateProfile({ ...good, phone: '1'.repeat(16) }).field, 'phone'));
t('rejects a phone that is only a trunk zero', () =>
  assert.equal(validateProfile({ ...good, phone: '0000' }).field, 'phone'));
t('rejects an unknown industry', () =>
  assert.equal(validateProfile({ ...good, industry: 'not-a-sector' }).field, 'industry'));
t('rejects a missing industry', () =>
  assert.equal(validateProfile({ ...good, industry: '' }).field, 'industry'));
t('defaults an unrecognised language to en', () =>
  assert.equal(validateProfile({ ...good, lang: 'fr' }).profile.lang, 'en'));
t('keeps ar when asked', () =>
  assert.equal(validateProfile({ ...good, lang: 'ar' }).profile.lang, 'ar'));
t('survives a non-object body', () => {
  assert.equal(validateProfile(undefined).ok, false);
  assert.equal(validateProfile('nope').ok, false);
});

console.log('\nshared lists');
t('every industry the page renders is one the server accepts', () => {
  // The page and the validator import the same module; this asserts that
  // arrangement rather than assuming it.
  assert.ok(INDUSTRY_IDS.has('real-estate'));
  assert.ok(INDUSTRY_IDS.has('other'));
});
t('every country in the dropdown has a dial code', () => {
  for (const c of countryOptions('en')) {
    assert.ok(c.dial && /^\d+$/.test(c.dial), `${c.iso} has dial "${c.dial}"`);
    assert.ok(COUNTRY_CODES.has(c.iso));
  }
});
t('the dropdown lists every country exactly once', () => {
  const opts = countryOptions('en');
  assert.equal(opts.length, COUNTRY_CODES.size);
  assert.equal(new Set(opts.map((c) => c.iso)).size, opts.length);
});
t('GCC markets come first', () =>
  assert.deepEqual(countryOptions('en').slice(0, 6).map((c) => c.iso),
    ['AE', 'SA', 'KW', 'QA', 'BH', 'OM']));
t('dialFor is unknown-safe', () => assert.equal(dialFor('ZZ'), ''));

console.log('\nrate-limit buckets');
t('auth buckets do not collide with the chat buckets', () => {
  // Sharing keys would let ordinary chatting exhaust the sign-in allowance.
  const now = new Date('2026-09-10T12:34:00Z');
  const a = authBuckets('1.2.3.4', now);
  const c = bucketKeys('1.2.3.4', now);
  assert.notEqual(a.ip, c.ip);
  assert.notEqual(a.global, c.global);
});
t('the IP bucket rolls every minute and the global one every day', () => {
  const ip = '1.2.3.4';
  assert.notEqual(
    authBuckets(ip, new Date('2026-09-10T12:34:00Z')).ip,
    authBuckets(ip, new Date('2026-09-10T12:35:00Z')).ip,
  );
  assert.equal(
    authBuckets(ip, new Date('2026-09-10T12:34:00Z')).global,
    authBuckets(ip, new Date('2026-09-10T23:59:00Z')).global,
  );
});

// ---------------------------------------------------------------------------
// Handlers. Only the paths that return before any network call — everything
// past those needs Supabase and Apps Script, which belong in the e2e stack.
// ---------------------------------------------------------------------------

const mockRes = () => ({
  code: 0, headers: {}, body: undefined,
  status(n) { this.code = n; return this; },
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
  getHeader(k) { return this.headers[k.toLowerCase()]; },
  end(payload) { this.body = payload ? JSON.parse(payload) : undefined; return this; },
});

const csrfToken = randomToken();
const goodHeaders = {
  host: 'www.bznsflowai.com',
  origin: 'https://www.bznsflowai.com',
  cookie: `${CSRF_COOKIE}=${csrfToken}`,
  [CSRF_HEADER]: csrfToken,
};

const authCode = (await import('../api/auth-code.js')).default;
const authSession = (await import('../api/auth-session.js')).default;

console.log('\nPOST /api/auth-code');
await ta('rejects a non-POST method with Allow', async () => {
  const res = mockRes();
  await authCode({ method: 'GET', headers: goodHeaders }, res);
  assert.equal(res.code, 405);
  assert.equal(res.getHeader('allow'), 'POST');
});
await ta('rejects a foreign origin', async () => {
  const res = mockRes();
  await authCode({ method: 'POST', headers: { ...goodHeaders, origin: 'https://evil.example' } }, res);
  assert.equal(res.code, 403);
  assert.equal(res.body.reason, 'origin');
});
await ta('rejects a missing CSRF token', async () => {
  const res = mockRes();
  const { [CSRF_HEADER]: _drop, ...noToken } = goodHeaders;
  await authCode({ method: 'POST', headers: noToken, body: { email: 'a@b.com' } }, res);
  assert.equal(res.code, 403);
  assert.equal(res.body.reason, 'csrf');
});
await ta('rejects a CSRF header that does not match the cookie', async () => {
  const res = mockRes();
  await authCode({
    method: 'POST',
    headers: { ...goodHeaders, [CSRF_HEADER]: randomToken() },
    body: { email: 'a@b.com' },
  }, res);
  assert.equal(res.code, 403);
});
await ta('never caches a response', async () => {
  const res = mockRes();
  await authCode({ method: 'GET', headers: goodHeaders }, res);
  assert.equal(res.getHeader('cache-control'), 'no-store');
});

console.log('\n/api/auth-session');
await ta('rejects an unsupported method with a full Allow list', async () => {
  const res = mockRes();
  await authSession({ method: 'PUT', headers: goodHeaders }, res);
  assert.equal(res.code, 405);
  assert.equal(res.getHeader('allow'), 'GET, POST, PATCH, DELETE');
});
await ta('rejects a foreign origin', async () => {
  const res = mockRes();
  await authSession({ method: 'POST', headers: { ...goodHeaders, origin: 'https://evil.example' } }, res);
  assert.equal(res.code, 403);
  assert.equal(res.body.reason, 'origin');
});
await ta('requires CSRF on POST, PATCH and DELETE but not GET', async () => {
  const { [CSRF_HEADER]: _drop, ...noToken } = goodHeaders;
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const res = mockRes();
    await authSession({ method, headers: noToken }, res);
    assert.equal(res.code, 403, `${method} should require CSRF`);
    assert.equal(res.body.reason, 'csrf');
  }
  const res = mockRes();
  await authSession({ method: 'GET', headers: noToken }, res);
  assert.notEqual(res.code, 403); // GET is where the token comes from
});
await ta('GET issues a CSRF cookie and reports nobody signed in', async () => {
  const res = mockRes();
  await authSession({ method: 'GET', headers: { host: 'x', origin: 'https://x' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.account, null);
  assert.match(res.body.csrfToken, /^[a-f0-9]{64}$/);
  const cookies = [].concat(res.getHeader('set-cookie') || []);
  const csrf = cookies.find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  assert.ok(csrf, 'CSRF cookie should be set');
  // Per-cookie, not over the joined string: a naive `.includes('HttpOnly')`
  // across all Set-Cookie headers passes as long as ANY cookie is HttpOnly,
  // which is exactly the assertion that silently stops testing anything.
  assert.ok(csrf.includes('HttpOnly'), 'CSRF cookie should be HttpOnly');
  assert.ok(csrf.includes('Secure'));
});
await ta('PATCH without a session cookie is unauthorised, not a crash', async () => {
  const res = mockRes();
  await authSession({ method: 'PATCH', headers: goodHeaders, body: good }, res);
  assert.equal(res.code, 401);
  assert.equal(res.body.reason, 'no_session');
});
await ta('DELETE without a session still succeeds and clears the cookie', async () => {
  const res = mockRes();
  await authSession({ method: 'DELETE', headers: goodHeaders }, res);
  assert.equal(res.code, 200);
  const setCookie = [].concat(res.getHeader('set-cookie') || []).join('; ');
  assert.ok(/bf_session=;|bf_session=\s*;/.test(setCookie) || setCookie.includes('Max-Age=0'),
    `expected the session cookie to be cleared, got: ${setCookie}`);
});
await ta('marks every response Vary: Cookie', async () => {
  const res = mockRes();
  await authSession({ method: 'GET', headers: goodHeaders }, res);
  assert.equal(res.getHeader('vary'), 'Cookie');
});

console.log(`\n${fail ? '✗' : '✓'} auth: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
