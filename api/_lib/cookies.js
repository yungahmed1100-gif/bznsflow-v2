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

// Lifetimes, in seconds.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const ONE_YEAR = 60 * 60 * 24 * 365;

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
 * Deliberately NOT HttpOnly: this is the double-submit pattern, so the page's
 * own script has to read the value back and echo it in the CSRF_HEADER. The
 * defence does not rest on the cookie being secret — it rests on the same-origin
 * policy stopping a cross-site page from reading it to build the header.
 */
export function issueCsrfToken(res) {
  const token = randomToken();
  appendCookie(res, serializeCookie(CSRF_COOKIE, token, {
    maxAge: SESSION_MAX_AGE, httpOnly: false, sameSite: 'Lax',
  }));
  return token;
}

/**
 * Verify the CSRF header against the cookie, in constant time.
 *
 * A plain `===` on secrets leaks their contents through timing; timingSafeEqual
 * does not, and it requires equal-length buffers, so the length check comes
 * first and is itself not secret (both sides are fixed-width hex).
 * @returns {boolean}
 */
export function verifyCsrf(req) {
  const cookies = parseCookies(req);
  const fromCookie = cookies[CSRF_COOKIE];
  const h = req?.headers || {};
  const fromHeader = h[CSRF_HEADER] ?? h[CSRF_HEADER.toLowerCase()];

  if (!fromCookie || !fromHeader) return false;
  const a = Buffer.from(String(fromCookie));
  const b = Buffer.from(String(fromHeader));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
