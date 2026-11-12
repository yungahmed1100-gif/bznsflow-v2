// Where a link may lead, for tests/nav-crawl-browser.mjs.
//
// Internal links must reach a prerendered page in the page's own language
// (Vercel serves no SPA fallback, so anything else is a 404). The only link
// that may change language is the switch to the same page's twin.
// External links must go to a reviewed host and open safely.

/** Hosts a page links to today, each for a stated reason. Add a host only with its reason. */
export const EXTERNAL_HOSTS = {
  'wa.me': 'WhatsApp chat with BznsFlow support',
  'business.facebook.com': 'Meta Business settings the owner is sent to',
  'developers.facebook.com': 'Meta platform terms and docs',
  'www.instagram.com': 'BznsFlow on Instagram',
  'www.linkedin.com': 'BznsFlow on LinkedIn',
  'support.claude.com': 'Claude connector help',
  'help.openai.com': 'ChatGPT connector help',
  'apps.apple.com': 'WhatsApp Business app download',
  'play.google.com': 'WhatsApp Business app download',
};

const SCHEMES = new Set(['mailto:', 'tel:']);

/** The other language's twin of a path, or null. */
export function twinOf(pathname) {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname === '/' ? '/en' : `/en${pathname}`;
}

export const languageOf = pathname => (pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ar');

/**
 * Classifies one link found on `from` (a URL) against the prerendered paths.
 * Returns { kind, problem? } where kind is internal | anchor | external | scheme.
 */
export function classifyLink({ href, target, rel }, from, prerendered) {
  const url = new URL(href, from);
  if (SCHEMES.has(url.protocol)) return { kind: 'scheme' };
  if (url.origin !== new URL(from).origin) {
    if (!(url.hostname in EXTERNAL_HOSTS))
      return { kind: 'external', problem: `unreviewed external host ${url.hostname}` };
    if (target === '_blank' && !/\bnoopener\b|\bnoreferrer\b/.test(rel || ''))
      return { kind: 'external', problem: `opens ${url.hostname} in a new tab without rel=noopener` };
    return { kind: 'external' };
  }
  const path = url.pathname.replace(/\/$/, '') || '/';
  const here = new URL(from);
  const herePath = here.pathname.replace(/\/$/, '') || '/';
  if (path === herePath && url.hash && url.search === here.search) return { kind: 'anchor', path, hash: url.hash };
  if (!prerendered.has(path)) return { kind: 'internal', path, problem: `leads to ${path}, which is not a page` };
  if (languageOf(path) !== languageOf(herePath) && path !== twinOf(herePath))
    return {
      kind: 'internal',
      path,
      problem: `switches language to ${path} (expected the same language or ${twinOf(herePath)})`,
    };
  return { kind: 'internal', path, hash: url.hash, search: url.search };
}
