// Cookie handling for the Vercel functions: parsing what arrives, and building
// Set-Cookie headers with the security attributes already applied.
//
// Kept separate from the client helper (src/lib/cookies.js) because the two
// cannot share defaults. Only the server can set HttpOnly, and only the server
// should ever mint a session or CSRF value — a token the client can generate is
// a token an attacker can generate.
//
// Nothing here reads secrets or touches the network, matching guard.js.

import { randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'bf_session';
export const CSRF_COOKIE = 'bf_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const OAUTH_COOKIE = 'bf_oauth';

// Lifetimes, in seconds.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Long enough to read a consent screen and pick an account, short enough that an
// abandoned attempt is not still replayable an hour later.
export const OAUTH_MAX_AGE = 60 * 10; // 10 minutes

// 32 bytes of CSPRNG output — 256 bits, well beyond guessing range, and short
// enough as hex to sit comfortably inside the 4KB per-cookie limit.
const TOKEN_BYTES = 32;

/**
 * Parse the request's Cookie header into a plain object.
 * Malformed pairs are skipped rather than throwing: a single bad cookie set by
 * some other tool must not take down the whole request.
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string,string>}
 */
export function parseCookies(req) {
  const header = req?.headers?.cookie;
  if (!header) return {};

  const out = {};
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue; // no name, or no '=' at all
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name) continue;
    try {
      out[decodeURIComponent(name)] = decodeURIComponent(value);
    } catch (_) {
      out[name] = value; // not percent-encoded; keep the raw value
    }
  }
  return out;
}

/**
 * Build one Set-Cookie header value.
 *
 * `secure` defaults to true. Vercel serves every deployment over HTTPS, so the
 * only environment this would break is a plain-http local server, which is the
 * caller's business to opt out of.
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge?: number, path?: string, sameSite?: 'Lax'|'Strict'|'None',
 *           httpOnly?: boolean, secure?: boolean }} [options]
 * @returns {string}
 */
export function serializeCookie(name, value, options = {}) {
  const {
    maxAge,
    path = '/',
    sameSite = 'Lax',
    httpOnly = false,
    secure = true,
  } = options;

  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${maxAge}`);
  parts.push(`SameSite=${sameSite}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Append a Set-Cookie header without clobbering any already queued.
 * res.setHeader replaces, so setting two cookies naively loses the first.
 * @param {import('http').ServerResponse} res
 * @param {string} cookie a value from serializeCookie
 */
export function appendCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) res.setHeader('Set-Cookie', [cookie]);
  else if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, cookie]);
  else res.setHeader('Set-Cookie', [String(existing), cookie]);
}

/** A URL-safe random token, for session ids and CSRF tokens. */
export function randomToken() {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Constant-time string comparison.
 *
 * Lives here rather than in auth.js so the modules that need a secret compare
 * are not forced to pull in the industry and country lists auth.js imports.
 *
 * A plain `===` on secrets leaks their contents through timing. timingSafeEqual
 * does not, but it throws on unequal lengths, so the length check comes first —
 * and that check is not itself secret, since both sides here are fixed-width hex.
 */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Queue the session cookie. HttpOnly so no script can read it — this is the
 * cookie that will identify a logged-in account, and it must survive an XSS
 * that manages to run script on the page.
 */
export function setSessionCookie(res, sessionId, maxAge = SESSION_MAX_AGE) {
  appendCookie(res, serializeCookie(SESSION_COOKIE, sessionId, {
    maxAge, httpOnly: true, sameSite: 'Lax',
  }));
}

/** Clear the session cookie. Max-Age=0 with matching attributes. */
export function clearSessionCookie(res) {
  appendCookie(res, serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0, httpOnly: true, sameSite: 'Lax',
  }));
}

/**
 * Queue a CSRF token cookie and return the token.
 *
 * HttpOnly, which the textbook double-submit pattern usually cannot be. It works
 * here because the page never reads the cookie: `issueCsrfToken` RETURNS the
 * token, GET /api/auth-session puts it in the JSON body, and the page echoes
 * that value back in CSRF_HEADER. So the browser still proves it holds the
 * cookie, while no script can read it — which removes the token as an XSS prize.
 *
 * (This was previously not HttpOnly, justified by "the page's own script has to
 * read it back". It never did.)
 *
 * The defence itself rests on the same-origin policy: a cross-site page can
 * cause the cookie to be SENT but cannot read it to build the matching header.
 */
export function issueCsrfToken(res) {
  const token = randomToken();
  appendCookie(res, serializeCookie(CSRF_COOKIE, token, {
    maxAge: SESSION_MAX_AGE, httpOnly: true, sameSite: 'Lax',
  }));
  return token;
}

/**
 * Stash the in-flight OAuth attempt: provider, state, nonce, PKCE verifier and
 * the language to return to.
 *
 * SameSite=Lax is correct and sufficient here. The provider sends the browser
 * back with a top-level GET navigation, which Lax allows; the cross-site POST
 * that Lax would block is a shape none of Google, Microsoft or LinkedIn use.
 * (Sign in with Apple does, via response_mode=form_post — worth knowing if it is
 * ever added, because this cookie would silently stop arriving.)
 *
 * Deliberately NOT signed or encrypted. HttpOnly already keeps page script out,
 * and an HMAC would not help against the one attack that matters — an attacker
 * overwriting this cookie to force a login as themselves — because they could
 * simply get a validly-signed cookie from this very endpoint. What actually
 * stops that is Secure plus the HSTS preload in vercel.json, which leaves no
 * plaintext channel to inject a cookie over.
 */
export function setOauthCookie(res, payload) {
  const value = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  appendCookie(res, serializeCookie(OAUTH_COOKIE, value, {
    maxAge: OAUTH_MAX_AGE, httpOnly: true, sameSite: 'Lax',
  }));
}

/** Read the in-flight OAuth attempt, or null when absent or unreadable. */
export function readOauthCookie(req) {
  const raw = parseCookies(req)[OAUTH_COOKIE];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null; // truncated or tampered — treat exactly like "no attempt"
  }
}

/** Clear the OAuth cookie. Single-use: the callback drops it before anything else. */
export function clearOauthCookie(res) {
  appendCookie(res, serializeCookie(OAUTH_COOKIE, '', {
    maxAge: 0, httpOnly: true, sameSite: 'Lax',
  }));
}

/**
 * Verify the CSRF header against the cookie, in constant time.
 *
 * The comparison goes through `safeEqual` above rather than being inlined. Two
 * copies of a constant-time compare is how one of them eventually becomes a
 * `===` during a refactor, with only one of the two reviewed for it.
 * @returns {boolean}
 */
export function verifyCsrf(req) {
  const cookies = parseCookies(req);
  const fromCookie = cookies[CSRF_COOKIE];
  const h = req?.headers || {};
  const fromHeader = h[CSRF_HEADER] ?? h[CSRF_HEADER.toLowerCase()];

  // Both must be present. safeEqual('', '') is true, so an absent pair would
  // otherwise pass — the one case where constant-time comparison is the wrong
  // question to be asking.
  if (!fromCookie || !fromHeader) return false;
  return safeEqual(fromCookie, fromHeader);
}
