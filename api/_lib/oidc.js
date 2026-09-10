// OpenID Connect for the social sign-in buttons.
//
// One code path, three providers. Google, Microsoft and LinkedIn all speak
// standard OIDC authorization-code flow, so the only thing that differs between
// them is a registry entry — endpoints, scope, and how each one says "this email
// is verified". Adding a fourth provider should be a literal object literal.
//
// Hand-rolled rather than reaching for a library, for the same reason db.js
// talks PostgREST over fetch: the token exchange is one form POST and the token
// check is node:crypto, so a dependency would buy nothing. WebAuthn is the one
// place that trade goes the other way — see api/auth-passkey.js when it lands.
//
// Nothing here writes a cookie or touches the database. The handlers do that;
// this module only knows how to talk to an identity provider.

import { createHash, createPublicKey, createVerify } from 'node:crypto';
import { fetchWithTimeout, httpError } from './fetch.js';
import { normalizeEmail, LIMITS } from './auth.js';

export const CALLBACK_PATH = '/api/auth-callback';

/**
 * Where to drop the browser when the round trip is over.
 *
 * Arabic lives at the unprefixed route and English under /en — the mapping in
 * src/routes.jsx. The language survives the trip to the provider and back
 * inside the bf_oauth cookie, because the provider will not carry it for us.
 */
export function signinPath(lang) {
  return lang === 'en' ? '/en/signin' : '/signin';
}

const TOKEN_TIMEOUT_MS = 8000;
const JWKS_TIMEOUT_MS = 5000;

// JWKS is cached for an hour. Providers rotate signing keys on the order of
// days and publish the new one well before using it; an unknown `kid` also
// forces a refetch below, which is what actually handles rotation. The TTL just
// stops every sign-in paying for a round trip.
const JWKS_TTL_MS = 60 * 60 * 1000;

// Tolerance for clock drift between us and the provider, in seconds. Two
// minutes is the usual allowance — enough for a badly-synced host, far short of
// meaningfully extending a token's life.
const CLOCK_SKEW_S = 120;

// The tenant every personal Microsoft account (outlook.com, hotmail.com, live)
// belongs to. Named because the email-verification rule below turns on it.
const MSA_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

/** Microsoft's endpoints are tenant-scoped, so they are read at call time. */
function msAuthority() {
  const tenant = String(process.env.MS_TENANT || '').trim() || 'organizations';
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}`;
}

/**
 * The provider registry.
 *
 * `supportsPkce` / `supportsNonce` default to true and are only set where a
 * provider genuinely does not implement them — LinkedIn being the odd one out.
 * Sending it parameters it does not understand is how you get an opaque
 * `invalid_request` with no clue which parameter caused it.
 */
export const PROVIDERS = {
  google: {
    id: 'google',
    label: 'Google',
    scope: 'openid email profile',
    idEnv: 'GOOGLE_CLIENT_ID',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
    authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    jwksUrl: () => 'https://www.googleapis.com/oauth2/v3/certs',
    // Google publishes both spellings across its documents; both are legitimate.
    checkIssuer: (iss) => iss === 'https://accounts.google.com' || iss === 'accounts.google.com',
    // Always present on Google ID tokens, and trustworthy.
    isEmailVerified: (claims) => truthy(claims.email_verified),
    // Without this a visitor with several Google accounts is silently signed in
    // as whichever one the browser saw last, with no way to pick.
    extra: { prompt: 'select_account' },
  },

  microsoft: {
    id: 'microsoft',
    label: 'Microsoft',
    scope: 'openid email profile',
    idEnv: 'MS_CLIENT_ID',
    secretEnv: 'MS_CLIENT_SECRET',
    authorizeUrl: () => `${msAuthority()}/oauth2/v2.0/authorize`,
    tokenUrl: () => `${msAuthority()}/oauth2/v2.0/token`,
    jwksUrl: () => `${msAuthority()}/discovery/v2.0/keys`,
    // Entra issues per-tenant: https://login.microsoftonline.com/{tid}/v2.0.
    // The issuer must be checked against the token's OWN tid, which is why this
    // takes the claims and the other two do not.
    checkIssuer: (iss, claims) => {
      const tid = String(claims?.tid || '').trim();
      return !!tid && iss === `https://login.microsoftonline.com/${tid}/v2.0`;
    },
    /**
     * THE nOAuth RULE. Do not loosen this without reading the note.
     *
     * The `email` claim on a PERSONAL Microsoft account is set by the user and
     * verified by nobody. An app that finds an account by that email alone lets
     * anyone type ceo@yourcustomer.com into their profile and walk in. That is
     * CVE-class, it has a name (nOAuth), and it has burned real products.
     *
     * Two independent defences, either one sufficient:
     *  - `xms_edov` ("email domain owner verified") true — the optional claim the
     *    Entra app registration should enable, per the setup runbook.
     *  - the token is from a real organisation tenant rather than the shared
     *    consumer one, which is guaranteed when MS_TENANT=organizations.
     *
     * The fallback exists so a missing optional claim degrades to "still safe"
     * instead of "nobody can sign in".
     */
    isEmailVerified: (claims) => {
      if (truthy(claims.xms_edov)) return true;
      const tid = String(claims?.tid || '').trim();
      return !!tid && tid !== MSA_TENANT;
    },
  },

  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    // The OIDC scopes. r_liteprofile / r_emailaddress are the pre-2023 ones and
    // are rejected outright on a new app.
    scope: 'openid profile email',
    idEnv: 'LINKEDIN_CLIENT_ID',
    secretEnv: 'LINKEDIN_CLIENT_SECRET',
    authorizeUrl: () => 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: () => 'https://www.linkedin.com/oauth/v2/accessToken',
    jwksUrl: () => 'https://www.linkedin.com/oauth/openid/jwks',
    checkIssuer: (iss) => iss === 'https://www.linkedin.com/oauth' || iss === 'https://www.linkedin.com',
    /**
     * LinkedIn only ever returns a member's PRIMARY address, which LinkedIn
     * itself requires the member to confirm before it can hold that slot. So
     * an absent `email_verified` means "not stated", not "not verified" —
     * and its own docs say the field is optional and may be missing.
     *
     * Requiring it would reject perfectly good sign-ins. An explicit `false`
     * is still refused, which is what actually matters for account linking.
     */
    isEmailVerified: (claims) => claims.email_verified !== false
      && claims.email_verified !== 'false'
      && !!claims.email,
    // LinkedIn implements neither. Sending them yields invalid_request.
    supportsPkce: false,
    supportsNonce: false,
    /**
     * LinkedIn's ID token is documented as carrying only iss/sub/aud/iat/exp —
     * name and email are NOT guaranteed to be in it, and its docs say so
     * outright. Google and Microsoft both put them in the token; LinkedIn
     * expects a second call. Without this the callback would reject every
     * LinkedIn sign-in with "no email".
     */
    userinfoUrl: () => 'https://api.linkedin.com/v2/userinfo',
  },
};

/** JSON and form encodings disagree about booleans; accept both spellings. */
function truthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** @returns {object|null} the registry entry, or null for an unknown name. */
export function providerFor(name) {
  const key = String(name || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PROVIDERS, key) ? PROVIDERS[key] : null;
}

/** True when both env vars for this provider are set. */
export function isConfigured(provider) {
  return !!(process.env[provider.idEnv] && process.env[provider.secretEnv]);
}

/**
 * Which providers this deployment can actually offer.
 *
 * The page is prerendered by vite-react-ssg, so it cannot know at build time
 * which secrets exist. GET /api/auth-session reports this list and the page
 * renders only the buttons that will work — better than showing a Microsoft
 * button that dead-ends in a 500 because the secret was never set.
 */
export function configuredProviders() {
  return Object.values(PROVIDERS).filter(isConfigured).map((p) => p.id);
}

function credentials(provider) {
  const clientId = process.env[provider.idEnv];
  const clientSecret = process.env[provider.secretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`${provider.idEnv} or ${provider.secretEnv} is not configured`);
  }
  return { clientId, clientSecret };
}

/** base64url, the encoding every part of OAuth and JOSE uses. */
export function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

/** The S256 PKCE challenge for a verifier. RFC 7636 §4.2. */
export function pkceChallenge(verifier) {
  return base64url(createHash('sha256').update(String(verifier)).digest());
}

/**
 * The redirect URI, which must match one registered with the provider EXACTLY.
 *
 * Derived from the request host rather than pinned to a configured URL, so that
 * `vercel dev` on localhost and production each produce the URI they have
 * registered. Pinning to SITE_URL alone would mean local sign-in could never
 * work.
 *
 * SITE_URL is an OPTIONAL tightening, not a requirement. When it is set, a host
 * that does not match it is overridden rather than trusted; when it is unset we
 * fall back to the request host over https. Requiring it would mean one missing
 * environment variable silently takes out every social login button — a bad
 * trade for a check that is already belt-and-braces:
 *
 *   - Vercel only routes a request to this project if the Host is one of the
 *     project's own domains, so an arbitrary Host does not arrive here; and
 *   - a redirect URI the provider does not have on file is refused outright,
 *     so a forged host breaks the attacker's own flow and nobody else's.
 */
export function redirectUriFor(req) {
  const host = String(req?.headers?.host || '').trim().toLowerCase();
  if (!host) throw new Error('cannot build a redirect URI: the request has no Host header');

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}${CALLBACK_PATH}`;

  const siteUrl = String(process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  let siteHost = '';
  try { siteHost = new URL(siteUrl).host.toLowerCase(); } catch { /* unset or malformed */ }

  // Configured and disagrees with the request → trust the configuration.
  if (siteHost && host !== siteHost) return `${siteUrl}${CALLBACK_PATH}`;

  return `https://${host}${CALLBACK_PATH}`;
}

/** The URL to send the browser to. */
export function buildAuthorizeUrl({ provider, state, nonce, challenge, redirectUri }) {
  const { clientId } = credentials(provider);

  const params = {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: provider.scope,
    state,
    ...(provider.supportsNonce !== false && nonce ? { nonce } : {}),
    ...(provider.supportsPkce !== false && challenge
      ? { code_challenge: challenge, code_challenge_method: 'S256' }
      : {}),
    ...(provider.extra || {}),
  };

  const url = new URL(provider.authorizeUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/** Trade the authorization code for tokens. */
export async function exchangeCode({ provider, code, verifier, redirectUri }) {
  const { clientId, clientSecret } = credentials(provider);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (provider.supportsPkce !== false && verifier) body.set('code_verifier', verifier);

  const label = `${provider.id} token exchange`;
  const res = await fetchWithTimeout(provider.tokenUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  }, { label, timeoutMs: TOKEN_TIMEOUT_MS });

  if (!res.ok) throw await httpError(label, res);
  return res.json();
}

// ---------------------------------------------------------------------------
// ID token verification
//
// OIDC Core §3.1.3.7 permits skipping the signature check when the token came
// straight from the token endpoint over TLS, which is exactly our case. We check
// it anyway: it is a cached fetch and forty lines, and "the transport already
// guaranteed it" is the kind of reasoning that stops being true after a refactor
// nobody re-audited.
// ---------------------------------------------------------------------------

const jwksCache = new Map(); // provider.id -> { keys, fetchedAt }

async function jwks(provider, { force = false } = {}) {
  const hit = jwksCache.get(provider.id);
  if (!force && hit && Date.now() - hit.fetchedAt < JWKS_TTL_MS) return hit.keys;

  const label = `${provider.id} JWKS`;
  const res = await fetchWithTimeout(provider.jwksUrl(), {
    headers: { Accept: 'application/json' },
  }, { label, timeoutMs: JWKS_TIMEOUT_MS });

  if (!res.ok) throw await httpError(label, res);

  const body = await res.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  jwksCache.set(provider.id, { keys, fetchedAt: Date.now() });
  return keys;
}

// All three providers sign with RSA. An unexpected `alg` is refused rather than
// guessed at — this is the lookup that stops an attacker naming their own
// algorithm, the classic JWT confusion bug.
const ALGORITHMS = {
  RS256: 'RSA-SHA256',
  RS384: 'RSA-SHA384',
  RS512: 'RSA-SHA512',
};

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

/**
 * Verify an ID token and return its claims.
 *
 * Throws on every failure rather than returning a flag: there is no partially
 * valid identity token, and a caller that forgets to check a boolean would sign
 * somebody in.
 *
 * @returns {Promise<object>} the verified claims
 */
export async function verifyIdToken({ provider, idToken, nonce }) {
  const fail = (why) => { throw new Error(`${provider.id} id_token: ${why}`); };

  if (typeof idToken !== 'string' || !idToken) fail('missing from the token response');

  const parts = idToken.split('.');
  if (parts.length !== 3) fail('malformed');

  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  let claims;
  try {
    header = decodeSegment(headerB64);
    claims = decodeSegment(payloadB64);
  } catch {
    fail('unreadable');
  }

  const nodeAlg = ALGORITHMS[header.alg];
  if (!nodeAlg) fail(`unsupported alg ${header.alg}`);

  // An unknown kid means the provider rotated its keys, so refetch once before
  // giving up. Without this, a rotation is a full outage until the cache ages.
  let keys = await jwks(provider);
  let key = keys.find((k) => k.kid === header.kid);
  if (!key) {
    keys = await jwks(provider, { force: true });
    key = keys.find((k) => k.kid === header.kid);
  }
  if (!key) fail(`no signing key for kid ${header.kid}`);

  const verifier = createVerify(nodeAlg);
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  if (!verifier.verify(createPublicKey({ key, format: 'jwk' }),
    Buffer.from(signatureB64, 'base64url'))) {
    fail('signature check failed');
  }

  const { clientId } = credentials(provider);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(clientId)) fail('audience mismatch');
  // With several audiences the spec requires azp to name us specifically.
  if (audience.length > 1 && claims.azp && claims.azp !== clientId) fail('azp mismatch');

  if (!provider.checkIssuer(String(claims.iss || ''), claims)) fail('issuer mismatch');

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_S < now) fail('expired');
  if (Number.isFinite(claims.nbf) && claims.nbf - CLOCK_SKEW_S > now) fail('not yet valid');
  if (Number.isFinite(claims.iat) && claims.iat - CLOCK_SKEW_S > now) fail('issued in the future');

  // Binds the token to the authorize request this browser actually started, so
  // one captured elsewhere cannot be replayed here.
  if (provider.supportsNonce !== false && (!nonce || claims.nonce !== nonce)) {
    fail('nonce mismatch');
  }

  return claims;
}

/**
 * Reduce provider claims to the four things the account layer needs.
 *
 * `subject` is the identity — stable, provider-scoped, and unaffected by the
 * person changing their email upstream. `email` is only ever used to LINK to an
 * existing account, and only when `emailVerified` is true. See the resolution
 * order in auth_oauth_login (migration 004).
 *
 * @returns {{ subject: string, email: string, emailVerified: boolean, name: string }}
 */
export function claimsToIdentity(provider, claims) {
  return {
    subject: String(claims?.sub || '').trim(),
    email: normalizeEmail(claims?.email),
    emailVerified: !!provider.isEmailVerified(claims || {}),
    name: String(claims?.name || '').trim().slice(0, LIMITS.name),
  };
}

/**
 * Fetch the userinfo endpoint, for providers that do not put the profile in
 * the ID token.
 *
 * @returns {Promise<object>} the claims, or {} if anything goes wrong — the
 *   caller already has an identity and only wants to enrich it, so a failure
 *   here must not take down a sign-in that has otherwise succeeded.
 */
async function fetchUserinfo(provider, accessToken) {
  if (typeof provider.userinfoUrl !== 'function' || !accessToken) return {};
  const label = `${provider.id} userinfo`;
  try {
    const res = await fetchWithTimeout(provider.userinfoUrl(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }, { label, timeoutMs: TOKEN_TIMEOUT_MS });
    if (!res.ok) {
      console.error('%s → HTTP %s', label, res.status);
      return {};
    }
    return await res.json();
  } catch (err) {
    console.error('%s failed: %s', label, err.message);
    return {};
  }
}

/**
 * The identity behind a completed token exchange.
 *
 * Google and Microsoft put everything in the ID token, so one verified token
 * is the whole answer. LinkedIn documents its ID token as carrying only
 * iss/sub/aud/iat/exp and expects a call to /v2/userinfo for the rest, so the
 * second call is made ONLY when something is actually missing — a sign-in that
 * already has what it needs never pays for the extra round trip.
 *
 * The ID token always wins where the two disagree: it is signature-verified,
 * and the userinfo response is just a bearer-authenticated JSON body.
 *
 * @returns {Promise<{ subject, email, emailVerified, name }>}
 */
export async function resolveIdentity({ provider, claims, accessToken }) {
  const fromToken = claimsToIdentity(provider, claims);
  if (fromToken.email && fromToken.name) return fromToken;

  const extra = await fetchUserinfo(provider, accessToken);
  if (!extra || typeof extra !== 'object') return fromToken;

  // sub is the identity and comes only from the verified token — never take it
  // from an unsigned response body.
  const merged = { ...extra, ...claims, sub: claims?.sub };
  for (const key of ['email', 'email_verified', 'name']) {
    if (claims?.[key] === undefined && extra[key] !== undefined) merged[key] = extra[key];
  }
  return claimsToIdentity(provider, merged);
}
