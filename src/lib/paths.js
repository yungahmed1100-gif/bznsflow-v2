// Every link to a page of this site is built here, so a page always links
// within its own language and every button that means the same thing leads to
// the same place. Arabic has no prefix; English is the same path under /en.
// tests/paths.test.mjs keeps hand-built language prefixes out of src/.

/** @typedef {'ar'|'en'} Lang */

/**
 * A site path in `lang`.
 * @param {Lang|string} lang
 * @param {string} [path] the Arabic path, starting with '/'
 * @returns {string}
 */
export function localePath(lang, path = '/') {
  if (lang !== 'en') return path;
  return path === '/' ? '/en' : `/en${path}`;
}

/**
 * The same page in the other language, for the language switch.
 * @param {Lang|string} lang the page's own language
 * @param {string} path the page's Arabic path, with its query if it keeps one
 */
export const otherLanguagePath = (lang, path) => localePath(lang === 'en' ? 'ar' : 'en', path);

const withQuery = (path, params) => {
  const query = new URLSearchParams(params || {}).toString();
  return query ? `${path}?${query}` : path;
};

/** The home page. */
export const homePath = lang => localePath(lang, '/');

/** The plans on the home page: every "choose a plan" link. */
export const plansPath = lang => `${homePath(lang)}#tiers`;

/** The free-audit booking page: every audit call to action. WhatsApp is support, not booking. */
export const auditPath = lang => localePath(lang, '/audit');

/** Catalyst setup. `next` is the setup page's own return hint ('dashboard'), not a path. */
export const setupPath = (lang, next) => withQuery(localePath(lang, '/catalyst/setup'), next ? { next } : null);

/**
 * The dashboard, optionally on a tab and view.
 * @param {Lang|string} lang
 * @param {Record<string, string>|URLSearchParams} [params] e.g. { tab: 'settings', view: 'business' }
 */
export const dashboardPath = (lang, params) => withQuery(localePath(lang, '/layla/dashboard'), params);

/**
 * Sign-in, coming back to `next` afterwards (config/signin-destination.js decides which paths may be resumed).
 * @param {Lang|string} lang
 * @param {string} [next] a path of this site, already in `lang`
 */
export const signInPath = (lang, next) => withQuery(localePath(lang, '/signin'), next ? { next } : null);
