// Client-side cookie access, with the security attributes applied by default
// rather than left to each call site to remember.
//
// SSR-SAFE: every function no-ops when `document` is undefined. The site is
// prerendered by vite-react-ssg, so this module is imported and executed during
// the build, where there is no document — the same reason the reveal and
// analytics helpers guard on `window`.
//
// SCOPE: only strictly-necessary cookies belong here. Anything for analytics,
// advertising or personalisation must wait for a consent decision — see
// COOKIES.md for the registry and the categories.

// Attribute defaults, applied unless a call overrides them.
//
// SameSite=Lax is the deliberate choice over Strict: Strict withholds the
// cookie on inbound top-level navigations, so a visitor arriving from a Google
// result or a WhatsApp link would land as if they had no preference at all.
// Lax still blocks the cross-site POST that CSRF depends on.
const DEFAULT_PATH = '/';
const DEFAULT_SAME_SITE = 'Lax';

// Lifetimes, in seconds.
export const ONE_YEAR = 60 * 60 * 24 * 365;
export const ONE_MONTH = 60 * 60 * 24 * 30;

// The cookies this site sets. Named here so the registry, the call sites and a
// future consent banner all agree on the strings.
export const COOKIE = {
  LOCALE: 'bf_locale',
};

const canUseCookies = () => typeof document !== 'undefined';

/**
 * Read one cookie.
 * @param {string} name
 * @returns {string|null} decoded value, or null when absent or unreadable
 */
export function getCookie(name) {
  if (!canUseCookies()) return null;
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const hit = document.cookie
      .split('; ')
      .find((part) => part.startsWith(prefix));
    return hit ? decodeURIComponent(hit.slice(prefix.length)) : null;
  } catch (_) {
    // document.cookie throws outright in some privacy modes — the caller gets
    // "no preference" and renders its default, which is always a valid state.
    return null;
  }
}

/**
 * Write one cookie. `Secure` is set on HTTPS only, so localhost development
 * still works — browsers reject Secure cookies over plain http.
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge?: number, path?: string, sameSite?: 'Lax'|'Strict'|'None' }} [options]
 * @returns {boolean} whether the write was accepted
 */
export function setCookie(name, value, options = {}) {
  if (!canUseCookies()) return false;
  const {
    maxAge = ONE_YEAR,
    path = DEFAULT_PATH,
    sameSite = DEFAULT_SAME_SITE,
  } = options;

  try {
    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `Path=${path}`,
      `Max-Age=${maxAge}`,
      `SameSite=${sameSite}`,
    ];
    if (location.protocol === 'https:') parts.push('Secure');
    document.cookie = parts.join('; ');
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Delete one cookie. Must match the path the cookie was written with, or the
 * browser treats it as a different cookie and the original survives.
 * @param {string} name
 * @param {{ path?: string }} [options]
 */
export function removeCookie(name, options = {}) {
  if (!canUseCookies()) return;
  const { path = DEFAULT_PATH } = options;
  try {
    document.cookie =
      `${encodeURIComponent(name)}=; Path=${path}; Max-Age=0; SameSite=${DEFAULT_SAME_SITE}`;
  } catch (_) { /* storage blocked — nothing to clear */ }
}
