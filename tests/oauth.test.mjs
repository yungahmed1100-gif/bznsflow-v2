// Unit checks for the social sign-in layer: api/_lib/oidc.js, plus the request
// shaping api/auth-oauth.js and api/auth-callback.js do before any network call.
//
// Same flat runner as auth.test.mjs and cookies.test.mjs — a pass/fail tally and
// a non-zero exit — because `npm test` chains these with && and node:test's
// output would not line up with the others.
//
// The ID-token tests sign real RS256 tokens with a keypair generated here and
// serve the matching JWKS from a stubbed fetch. That is worth the setup: token
// verification is the one place in this feature where a bug is silent and total,
// and asserting on a hand-written fixture would only prove the fixture parses.
//
// NOT covered here: a live round trip against Google, Microsoft or LinkedIn.
// Those need real credentials and a browser; the manual checklist lives in
// web-chatbot/migrations/004-oauth-identities.sql.

import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync, createHash } from 'node:crypto';
import {
  PROVIDERS, providerFor, isConfigured, configuredProviders,
  buildAuthorizeUrl, pkceChallenge, base64url, verifyIdToken,
  claimsToIdentity, resolveIdentity, redirectUriFor, signinPath, CALLBACK_PATH,
} from '../api/_lib/oidc.js';
import { CSRF_COOKIE, OAUTH_COOKIE, randomToken } from '../api/_lib/cookies.js';

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
process.env.SITE_URL ||= 'https://www.bznsflowai.com';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

console.log('\nPKCE');
t('S256 matches the RFC 7636 appendix B vector', () => {
  // The published pair. If this drifts, every provider rejects every exchange
  // with an opaque invalid_grant, so it is worth pinning to the spec itself
  // rather than to whatever our own implementation happened to produce.
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  assert.equal(pkceChallenge(verifier), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
t('produces url-safe output with no padding', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(pkceChallenge(randomToken()), /^[A-Za-z0-9_-]{43}$/);
  }
});
t('a randomToken is a valid verifier length (43-128 chars)', () => {
  const v = randomToken();
  assert.ok(v.length >= 43 && v.length <= 128, `verifier was ${v.length} chars`);
  assert.match(v, /^[A-Za-z0-9._~-]+$/, 'verifier must use only unreserved characters');
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

console.log('\nprovider registry');
t('resolves known providers case-insensitively', () => {
  assert.equal(providerFor('google')?.id, 'google');
  assert.equal(providerFor('  MICROSOFT ')?.id, 'microsoft');
});
t('returns null for anything unknown', () => {
  for (const bad of ['', 'apple', 'constructor', '__proto__', 'toString', null, undefined, 42]) {
    assert.equal(providerFor(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});
t('reports only the providers whose secrets are set', () => {
  const ids = configuredProviders();
  assert.ok(ids.includes('google'), 'google is configured in this test env');
  assert.equal(isConfigured(PROVIDERS.google), true);
});
t('every provider declares the fields the flow needs', () => {
  for (const [id, p] of Object.entries(PROVIDERS)) {
    for (const field of ['authorizeUrl', 'tokenUrl', 'jwksUrl', 'checkIssuer', 'isEmailVerified']) {
      assert.equal(typeof p[field], 'function', `${id} is missing ${field}`);
    }
    assert.ok(p.scope.includes('openid'), `${id} must request the openid scope`);
    assert.equal(p.id, id, `${id} registry key and id disagree`);
  }
});

console.log('\nredirect URI');
t('uses the request host on localhost, over http', () => {
  assert.equal(redirectUriFor({ headers: { host: 'localhost:3000' } }),
    `http://localhost:3000${CALLBACK_PATH}`);
});
t('uses https for the configured site host', () => {
  assert.equal(redirectUriFor({ headers: { host: 'www.bznsflowai.com' } }),
    `https://www.bznsflowai.com${CALLBACK_PATH}`);
});
t('ignores an unrecognised Host and falls back to SITE_URL', () => {
  // Host is attacker-controllable. A forged one must not steer the redirect.
  assert.equal(redirectUriFor({ headers: { host: 'evil.example' } }),
    `https://www.bznsflowai.com${CALLBACK_PATH}`);
});
t('still works when SITE_URL is unset, rather than taking the button offline', () => {
  // SITE_URL is an optional tightening. Requiring it would mean one missing
  // environment variable silently breaks every provider button — which is
  // exactly what happened on the first deploy, before this test existed.
  const saved = process.env.SITE_URL;
  delete process.env.SITE_URL;
  try {
    assert.equal(redirectUriFor({ headers: { host: 'www.bznsflowai.com' } }),
      `https://www.bznsflowai.com${CALLBACK_PATH}`);
    assert.equal(redirectUriFor({ headers: { host: 'localhost:3000' } }),
      `http://localhost:3000${CALLBACK_PATH}`);
  } finally {
    process.env.SITE_URL = saved;
  }
});
t('refuses to guess when there is no Host at all', () => {
  assert.throws(() => redirectUriFor({ headers: {} }), /no Host header/);
});

console.log('\nreturn path');
t('maps language to the routes in src/routes.jsx', () => {
  assert.equal(signinPath('en'), '/en/signin');
  assert.equal(signinPath('ar'), '/signin');
  assert.equal(signinPath(undefined), '/signin');
});

// ---------------------------------------------------------------------------
// Authorize URL
// ---------------------------------------------------------------------------

console.log('\nauthorize URL');
const authArgs = {
  state: 'STATE', nonce: 'NONCE', challenge: 'CHALLENGE',
  redirectUri: `https://www.bznsflowai.com${CALLBACK_PATH}`,
};

t('carries every parameter the code flow needs', () => {
  const url = new URL(buildAuthorizeUrl({ provider: PROVIDERS.google, ...authArgs }));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'test-google-client-id');
  assert.equal(url.searchParams.get('state'), 'STATE');
  assert.equal(url.searchParams.get('nonce'), 'NONCE');
  assert.equal(url.searchParams.get('code_challenge'), 'CHALLENGE');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('redirect_uri'), authArgs.redirectUri);
  assert.ok(url.searchParams.get('scope').includes('openid'));
});
t('omits PKCE and nonce for LinkedIn, which implements neither', () => {
  // Sending them yields an opaque invalid_request with no hint which parameter
  // was at fault, so this is worth pinning.
  process.env.LINKEDIN_CLIENT_ID = 'li-id';
  process.env.LINKEDIN_CLIENT_SECRET = 'li-secret';
  const url = new URL(buildAuthorizeUrl({ provider: PROVIDERS.linkedin, ...authArgs }));
  assert.equal(url.searchParams.get('code_challenge'), null);
  assert.equal(url.searchParams.get('code_challenge_method'), null);
  assert.equal(url.searchParams.get('nonce'), null);
  assert.equal(url.searchParams.get('state'), 'STATE');
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
});
t('throws rather than building a URL with no client id', () => {
  process.env.MS_CLIENT_ID = '';
  assert.throws(() => buildAuthorizeUrl({ provider: PROVIDERS.microsoft, ...authArgs }),
    /MS_CLIENT_ID/);
});

// ---------------------------------------------------------------------------
// Identity mapping — the account-linking gate
// ---------------------------------------------------------------------------

console.log('\nclaims to identity');
t('normalises the email and trims the name', () => {
  const id = claimsToIdentity(PROVIDERS.google, {
    sub: ' 12345 ', email: '  Ahmed@BznsFlowAI.COM ', email_verified: true, name: '  Ahmed  ',
  });
  assert.equal(id.subject, '12345');
  assert.equal(id.email, 'ahmed@bznsflowai.com');
  assert.equal(id.name, 'Ahmed');
  assert.equal(id.emailVerified, true);
});
t('google: accepts both the boolean and the string spelling', () => {
  assert.equal(claimsToIdentity(PROVIDERS.google, { email_verified: true }).emailVerified, true);
  assert.equal(claimsToIdentity(PROVIDERS.google, { email_verified: 'true' }).emailVerified, true);
  assert.equal(claimsToIdentity(PROVIDERS.google, { email_verified: false }).emailVerified, false);
  assert.equal(claimsToIdentity(PROVIDERS.google, {}).emailVerified, false);
});

// The nOAuth rules. These four are the difference between a working B2B login
// and letting anyone claim ceo@customer.com, so they get named tests.
t('microsoft: xms_edov true is verified', () =>
  assert.equal(claimsToIdentity(PROVIDERS.microsoft,
    { xms_edov: true, tid: 'anything' }).emailVerified, true));
t('microsoft: a real organisation tenant is verified without xms_edov', () =>
  assert.equal(claimsToIdentity(PROVIDERS.microsoft,
    { tid: '11111111-2222-3333-4444-555555555555' }).emailVerified, true));
t('microsoft: the personal-account tenant is NOT verified', () => {
  // The whole nOAuth attack lands here: a consumer MSA can set `email` to
  // anything. If this ever returns true, the linking rule is wide open.
  assert.equal(claimsToIdentity(PROVIDERS.microsoft,
    { tid: '9188040d-6c67-4c5b-b112-36a304b66dad' }).emailVerified, false);
});
t('microsoft: a personal account with xms_edov false stays unverified', () =>
  assert.equal(claimsToIdentity(PROVIDERS.microsoft,
    { tid: '9188040d-6c67-4c5b-b112-36a304b66dad', xms_edov: false }).emailVerified, false));
t('microsoft: no tid at all is not verified', () =>
  assert.equal(claimsToIdentity(PROVIDERS.microsoft, { email: 'a@b.com' }).emailVerified, false));

t('linkedin: an explicit false is still refused', () => {
  assert.equal(claimsToIdentity(PROVIDERS.linkedin,
    { email: 'a@b.com', email_verified: false }).emailVerified, false);
  assert.equal(claimsToIdentity(PROVIDERS.linkedin,
    { email: 'a@b.com', email_verified: 'false' }).emailVerified, false);
});
t('linkedin: a MISSING email_verified is accepted, an absent email is not', () => {
  // LinkedIn's own docs say email_verified is optional and may be absent, and
  // it only ever returns a confirmed primary address. Requiring the flag would
  // reject real sign-ins; requiring the address is what actually matters.
  assert.equal(claimsToIdentity(PROVIDERS.linkedin,
    { email: 'a@b.com' }).emailVerified, true);
  assert.equal(claimsToIdentity(PROVIDERS.linkedin, {}).emailVerified, false);
});

console.log('\nissuer checks');
t('google accepts both published spellings and nothing else', () => {
  assert.equal(PROVIDERS.google.checkIssuer('https://accounts.google.com'), true);
  assert.equal(PROVIDERS.google.checkIssuer('accounts.google.com'), true);
  assert.equal(PROVIDERS.google.checkIssuer('https://accounts.google.com.evil'), false);
  assert.equal(PROVIDERS.google.checkIssuer(''), false);
});
t('microsoft validates the issuer against the token OWN tid', () => {
  const tid = '11111111-2222-3333-4444-555555555555';
  const ok = `https://login.microsoftonline.com/${tid}/v2.0`;
  assert.equal(PROVIDERS.microsoft.checkIssuer(ok, { tid }), true);
  // A different tenant's issuer with our tid, and vice versa — both must fail.
  assert.equal(PROVIDERS.microsoft.checkIssuer(ok, { tid: 'other' }), false);
  assert.equal(PROVIDERS.microsoft.checkIssuer(
    'https://login.microsoftonline.com/organizations/v2.0', { tid }), false);
  assert.equal(PROVIDERS.microsoft.checkIssuer(ok, {}), false);
});

// ---------------------------------------------------------------------------
// ID token verification, against real signatures
// ---------------------------------------------------------------------------

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const { publicKey: otherPublic, privateKey: otherPrivate } =
  generateKeyPairSync('rsa', { modulusLength: 2048 });

const KID = 'test-key-1';
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };
const otherJwk = { ...otherPublic.export({ format: 'jwk' }), kid: 'other-key', alg: 'RS256', use: 'sig' };

const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function makeToken(claims, { kid = KID, alg = 'RS256', key = privateKey } = {}) {
  const head = enc({ alg, kid, typ: 'JWT' });
  const body = enc(claims);
  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${body}`);
  signer.end();
  return `${head}.${body}.${signer.sign(key).toString('base64url')}`;
}

const now = () => Math.floor(Date.now() / 1000);
const goodClaims = (over = {}) => ({
  iss: 'https://accounts.google.com',
  aud: 'test-google-client-id',
  sub: 'google-sub-1',
  email: 'ahmed@bznsflowai.com',
  email_verified: true,
  name: 'Ahmed',
  nonce: 'NONCE',
  iat: now(),
  exp: now() + 3600,
  ...over,
});

// Serve the JWKS from a stub. Both keys are published so a wrong-key signature
// fails on the signature check rather than on a missing kid — which is the
// failure we actually want to prove is caught.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).includes('googleapis.com/oauth2/v3/certs')) {
    return new Response(JSON.stringify({ keys: [jwk, otherJwk] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`unexpected fetch in test: ${url}`);
};

const verifyGoogle = (idToken, nonce = 'NONCE') =>
  verifyIdToken({ provider: PROVIDERS.google, idToken, nonce });

console.log('\nID token verification');
await ta('accepts a correctly signed, current token', async () => {
  const claims = await verifyGoogle(makeToken(goodClaims()));
  assert.equal(claims.sub, 'google-sub-1');
  assert.equal(claims.email, 'ahmed@bznsflowai.com');
});
await ta('rejects a tampered payload', async () => {
  const token = makeToken(goodClaims());
  const [h, , s] = token.split('.');
  const forged = `${h}.${enc(goodClaims({ email: 'attacker@evil.example' }))}.${s}`;
  await assert.rejects(() => verifyGoogle(forged), /signature check failed/);
});
await ta('rejects a token signed with the wrong key', async () => {
  await assert.rejects(
    () => verifyGoogle(makeToken(goodClaims(), { key: otherPrivate })),
    /signature check failed/,
  );
});
await ta('rejects alg: none', async () => {
  // The classic JWT confusion bug. The algorithm must come from our allowlist,
  // never from the attacker-supplied header.
  const head = enc({ alg: 'none', kid: KID, typ: 'JWT' });
  await assert.rejects(() => verifyGoogle(`${head}.${enc(goodClaims())}.`),
    /unsupported alg/);
});
await ta('rejects an unknown kid even after refetching', async () => {
  await assert.rejects(() => verifyGoogle(makeToken(goodClaims(), { kid: 'nope' })),
    /no signing key/);
});
await ta('rejects an expired token', async () => {
  await assert.rejects(
    () => verifyGoogle(makeToken(goodClaims({ exp: now() - 300, iat: now() - 3900 }))),
    /expired/,
  );
});
await ta('tolerates small clock skew rather than failing a fresh token', async () => {
  const claims = await verifyGoogle(makeToken(goodClaims({ exp: now() - 30 })));
  assert.equal(claims.sub, 'google-sub-1');
});
await ta('rejects a token issued for a different client', async () => {
  await assert.rejects(() => verifyGoogle(makeToken(goodClaims({ aud: 'someone-else' }))),
    /audience mismatch/);
});
await ta('rejects a token from the wrong issuer', async () => {
  await assert.rejects(
    () => verifyGoogle(makeToken(goodClaims({ iss: 'https://accounts.google.com.evil' }))),
    /issuer mismatch/,
  );
});
await ta('rejects a replayed token whose nonce does not match this request', async () => {
  await assert.rejects(() => verifyGoogle(makeToken(goodClaims()), 'A-DIFFERENT-NONCE'),
    /nonce mismatch/);
});
await ta('rejects a missing or malformed token instead of throwing a TypeError', async () => {
  for (const bad of [undefined, null, '', 'not-a-jwt', 'a.b']) {
    await assert.rejects(() => verifyGoogle(bad), /id_token/);
  }
});

globalThis.fetch = realFetch;

// ---------------------------------------------------------------------------
// resolveIdentity — the userinfo fallback.
//
// LinkedIn documents its ID token as carrying only iss/sub/aud/iat/exp, so the
// email has to come from /v2/userinfo. Without this the callback rejected every
// LinkedIn sign-in with "no email"; these tests exist so that cannot come back.
// ---------------------------------------------------------------------------

console.log('\nuserinfo fallback');

/** Stub the userinfo endpoint and record whether it was called. */
function withUserinfo(body, status = 200) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    return new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json' },
    });
  };
  return calls;
}

await ta('fetches userinfo when the LinkedIn token has no email', async () => {
  const calls = withUserinfo({
    sub: 'li-1', name: 'Ahmed Darwish', email: 'AHMED@bznsflowai.com', email_verified: true,
  });
  try {
    const id = await resolveIdentity({
      provider: PROVIDERS.linkedin,
      claims: { sub: 'li-1', iss: 'https://www.linkedin.com' },
      accessToken: 'tok-123',
    });
    assert.equal(id.email, 'ahmed@bznsflowai.com', 'email should be normalised');
    assert.equal(id.name, 'Ahmed Darwish');
    assert.equal(id.emailVerified, true);
    assert.equal(calls.length, 1, 'userinfo should be called exactly once');
    assert.match(calls[0].url, /api\.linkedin\.com\/v2\/userinfo/);
    assert.equal(calls[0].auth, 'Bearer tok-123');
  } finally { globalThis.fetch = realFetch; }
});

await ta('does NOT call userinfo when the token already has what we need', async () => {
  const calls = withUserinfo({ email: 'should-never-be-used@example.com' });
  try {
    const id = await resolveIdentity({
      provider: PROVIDERS.google,
      claims: { sub: 'g-1', name: 'Ahmed', email: 'ahmed@bznsflowai.com', email_verified: true },
      accessToken: 'tok',
    });
    assert.equal(id.email, 'ahmed@bznsflowai.com');
    assert.equal(calls.length, 0, 'Google must not pay for a userinfo round trip');
  } finally { globalThis.fetch = realFetch; }
});

await ta('never lets userinfo override the signed subject', async () => {
  // userinfo is a bearer-authenticated JSON body, not a signed token. If it
  // could change `sub` it could reassign the whole identity.
  const calls = withUserinfo({ sub: 'ATTACKER-SUB', email: 'a@b.com', name: 'X' });
  try {
    const id = await resolveIdentity({
      provider: PROVIDERS.linkedin,
      claims: { sub: 'real-sub' },
      accessToken: 'tok',
    });
    assert.equal(id.subject, 'real-sub');
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = realFetch; }
});

await ta('the signed token wins over userinfo where they disagree', async () => {
  const calls = withUserinfo({ email: 'other@example.com', name: 'Someone Else' });
  try {
    const id = await resolveIdentity({
      provider: PROVIDERS.linkedin,
      claims: { sub: 'li-1', email: 'real@bznsflowai.com' },
      accessToken: 'tok',
    });
    assert.equal(id.email, 'real@bznsflowai.com', 'the verified token must win');
    assert.equal(id.name, 'Someone Else', 'but a gap may be filled from userinfo');
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = realFetch; }
});

await ta('degrades quietly when userinfo errors or times out', async () => {
  for (const scenario of ['http-500', 'throws']) {
    globalThis.fetch = scenario === 'throws'
      ? async () => { throw new Error('network down'); }
      : async () => new Response('nope', { status: 500 });
    try {
      const id = await resolveIdentity({
        provider: PROVIDERS.linkedin,
        claims: { sub: 'li-1' },
        accessToken: 'tok',
      });
      // No email, so the callback will send them to ?e=no_email — a clean
      // message rather than a 500.
      assert.equal(id.subject, 'li-1');
      assert.equal(id.email, '');
    } finally { globalThis.fetch = realFetch; }
  }
});

// ---------------------------------------------------------------------------
// Handlers — only the paths that return before any network call.
// ---------------------------------------------------------------------------

const mockRes = () => ({
  code: 0, headers: {}, body: undefined,
  status(n) { this.code = n; return this; },
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
  getHeader(k) { return this.headers[k.toLowerCase()]; },
  end(payload) { this.body = payload ? JSON.parse(payload) : undefined; return this; },
});

const host = { host: 'www.bznsflowai.com' };
const authOauth = (await import('../api/auth-oauth.js')).default;
const authCallback = (await import('../api/auth-callback.js')).default;

const setCookies = (res) => [].concat(res.getHeader('set-cookie') || []);

/** Every redirect this feature emits must stay on our own site. */
const assertLocalRedirect = (res) => {
  const loc = res.getHeader('location') || '';
  assert.ok(loc.startsWith('/'), `expected a site-relative path, got ${loc}`);
  assert.ok(!loc.startsWith('//'), `protocol-relative URL is an open redirect: ${loc}`);
};

console.log('\nGET /api/auth-oauth');
await ta('rejects a non-GET method with Allow', async () => {
  const res = mockRes();
  await authOauth({ method: 'POST', url: '/api/auth-oauth', headers: host }, res);
  assert.equal(res.code, 405);
  assert.equal(res.getHeader('allow'), 'GET');
});
await ta('redirects an unknown provider back to sign-in without echoing it', async () => {
  const res = mockRes();
  await authOauth({
    method: 'GET',
    url: '/api/auth-oauth?provider=%2F%2Fevil.example&lang=en',
    headers: host,
  }, res);
  assert.equal(res.code, 302);
  assertLocalRedirect(res);
  assert.equal(res.getHeader('location'), '/en/signin?e=provider');
  assert.equal(setCookies(res).length, 0, 'no cookie should be set for an unknown provider');
});
await ta('redirects to the provider and stashes the attempt', async () => {
  const res = mockRes();
  await authOauth({ method: 'GET', url: '/api/auth-oauth?provider=google&lang=ar', headers: host }, res);
  assert.equal(res.code, 302);

  const target = new URL(res.getHeader('location'));
  assert.equal(target.host, 'accounts.google.com');
  assert.equal(target.searchParams.get('redirect_uri'),
    `https://www.bznsflowai.com${CALLBACK_PATH}`);

  const cookie = setCookies(res).find((c) => c.startsWith(`${OAUTH_COOKIE}=`));
  assert.ok(cookie, 'expected the bf_oauth cookie');
  // Asserted per-cookie, not against the joined header: a `.includes` over all
  // Set-Cookie values would pass on attributes belonging to a different cookie.
  assert.ok(cookie.includes('HttpOnly'), 'bf_oauth must be HttpOnly');
  assert.ok(cookie.includes('Secure'), 'bf_oauth must be Secure');
  assert.ok(cookie.includes('SameSite=Lax'), 'bf_oauth must be SameSite=Lax');
  assert.ok(/Max-Age=(\d+)/.test(cookie) && Number(RegExp.$1) <= 600,
    `bf_oauth should be short-lived, got: ${cookie}`);
});
await ta('never caches a response', async () => {
  const res = mockRes();
  await authOauth({ method: 'GET', url: '/api/auth-oauth?provider=google', headers: host }, res);
  assert.equal(res.getHeader('cache-control'), 'no-store');
});
await ta('binds state, nonce and verifier together and freshly each time', async () => {
  const stash = async () => {
    const res = mockRes();
    await authOauth({ method: 'GET', url: '/api/auth-oauth?provider=google', headers: host }, res);
    const raw = setCookies(res).find((c) => c.startsWith(`${OAUTH_COOKIE}=`))
      .split(';')[0].split('=').slice(1).join('=');
    const parsed = JSON.parse(Buffer.from(decodeURIComponent(raw), 'base64url').toString());
    return { parsed, location: res.getHeader('location') };
  };

  const a = await stash();
  const b = await stash();
  assert.notEqual(a.parsed.s, b.parsed.s, 'state must not repeat');
  assert.notEqual(a.parsed.n, b.parsed.n, 'nonce must not repeat');
  assert.notEqual(a.parsed.v, b.parsed.v, 'verifier must not repeat');

  // The challenge on the wire must be the S256 of the verifier we kept.
  const sent = new URL(a.location).searchParams.get('code_challenge');
  assert.equal(sent, pkceChallenge(a.parsed.v));
  // And the raw verifier must never leave the server.
  assert.ok(!a.location.includes(a.parsed.v), 'the PKCE verifier must not be in the URL');
});

console.log('\nGET /api/auth-callback');
const stashCookie = (payload) =>
  `${OAUTH_COOKIE}=${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;

await ta('rejects a non-GET method with Allow', async () => {
  const res = mockRes();
  await authCallback({ method: 'POST', url: '/api/auth-callback', headers: host }, res);
  assert.equal(res.code, 405);
});
await ta('treats a cancelled consent screen as an ordinary outcome', async () => {
  const res = mockRes();
  await authCallback({
    method: 'GET',
    url: '/api/auth-callback?error=access_denied',
    headers: { ...host, cookie: stashCookie({ p: 'google', s: 'S', l: 'en' }) },
  }, res);
  assert.equal(res.getHeader('location'), '/en/signin?e=cancelled');
  assertLocalRedirect(res);
});
await ta('refuses a state that does not match the cookie', async () => {
  const res = mockRes();
  await authCallback({
    method: 'GET',
    url: '/api/auth-callback?code=abc&state=ATTACKER',
    headers: { ...host, cookie: stashCookie({ p: 'google', s: 'MINE', l: 'ar' }) },
  }, res);
  assert.equal(res.getHeader('location'), '/signin?e=state');
  assert.equal(setCookies(res).some((c) => c.startsWith('bf_session=')), false,
    'a failed state check must not open a session');
});
await ta('refuses a callback with no stash at all', async () => {
  const res = mockRes();
  await authCallback({
    method: 'GET', url: '/api/auth-callback?code=abc&state=S', headers: host,
  }, res);
  assert.equal(res.getHeader('location'), '/signin?e=expired');
});
await ta('always clears the stash, even on the failure paths', async () => {
  const res = mockRes();
  await authCallback({
    method: 'GET',
    url: '/api/auth-callback?code=abc&state=WRONG',
    headers: { ...host, cookie: stashCookie({ p: 'google', s: 'RIGHT', l: 'ar' }) },
  }, res);
  const cleared = setCookies(res).find((c) => c.startsWith(`${OAUTH_COOKIE}=`));
  assert.ok(cleared && cleared.includes('Max-Age=0'),
    `the attempt must be single-use, got: ${cleared}`);
});
await ta('does NOT apply the same-origin check', async () => {
  // Providers send the browser here from their own origin, and some attach
  // Origin: https://accounts.google.com. Running isAllowedOrigin on this
  // endpoint would 403 every real sign-in — a plausible "consistency" fix that
  // this test exists to stop.
  const res = mockRes();
  await authCallback({
    method: 'GET',
    url: '/api/auth-callback?code=abc&state=S',
    headers: { ...host, origin: 'https://accounts.google.com', cookie: stashCookie({ p: 'google', s: 'S', l: 'ar' }) },
  }, res);
  assert.notEqual(res.code, 403);
});
await ta('does NOT require a CSRF token', async () => {
  // Same reasoning: bf_csrf is delivered in the JSON body of GET
  // /api/auth-session, and there is no page script on a redirect to echo it
  // into a header. The state check is this endpoint's forgery defence.
  const res = mockRes();
  await authCallback({
    method: 'GET',
    url: '/api/auth-callback?code=abc&state=S',
    headers: { ...host, cookie: `${CSRF_COOKIE}=irrelevant; ${stashCookie({ p: 'google', s: 'S', l: 'ar' })}` },
  }, res);
  assert.notEqual(res.code, 403);
});
t('base64url round-trips binary containing + and / in standard base64', () => {
  const raw = Buffer.from([0xfb, 0xff, 0x3e, 0x00, 0x7f]);
  const encoded = base64url(raw);
  assert.ok(!/[+/=]/.test(encoded), `expected url-safe output, got ${encoded}`);
  assert.deepEqual(Buffer.from(encoded, 'base64url'), raw);
});
t('the RP-facing hash helper is stable', () => {
  // Guards the shape used by pkceChallenge; a change here breaks every
  // in-flight sign-in at deploy time.
  assert.equal(createHash('sha256').update('abc').digest('base64url'),
    'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
});

console.log(`\n${fail ? '✗' : '✓'} oauth: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
