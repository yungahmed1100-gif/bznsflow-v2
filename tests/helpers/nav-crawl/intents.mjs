// What particular links are for, so the crawl checks the right destination
// and not just a working one. Each rule names the intent and where it must lead.
import { languageOf } from './links.mjs';

const home = lang => (lang === 'en' ? '/en' : '/');
const local = (lang, path) => (lang === 'en' ? `/en${path}` : path);

export const INTENTS = [
  {
    name: 'free audit',
    matches: link => /\baudit\b|تدقيق/i.test(link.text),
    expect: (url, lang) =>
      url.pathname === local(lang, '/audit') || `opens ${url.host === '' ? url.pathname : url.href}`,
  },
  {
    name: 'choose a plan',
    matches: link => /choose a plan|see plans|اختر خطة|اطّلع على الباقات/i.test(link.text),
    expect: (url, lang) =>
      (url.pathname === home(lang) && url.hash === '#tiers') || `opens ${url.pathname}${url.hash} instead of the plans`,
  },
  {
    name: 'dashboard logo',
    matches: link => link.className?.includes('ld-brand'),
    expect: (url, lang) =>
      url.pathname === local(lang, '/layla/dashboard') || `opens ${url.pathname} instead of the dashboard`,
  },
  {
    name: 'sign in from an owner page',
    matches: (link, from) => /\/owner(\/|$)/.test(from.pathname) && /\/signin$/.test(new URL(link.href).pathname),
    expect: (url, _lang, from) =>
      url.searchParams.get('next') === from.pathname || `loses the way back (next=${url.searchParams.get('next')})`,
  },
];

/** Where an internal link leads, the same in both languages: its path without /en. */
export const destinationOf = url => url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';

/**
 * Problems with a link's intended destination: { key, text }. The key names the
 * root cause the same way on every page and in both languages.
 */
export function intentProblems(link, fromUrl) {
  const from = new URL(fromUrl);
  const url = new URL(link.href, from);
  const lang = languageOf(from.pathname);
  return INTENTS.filter(intent => intent.matches(link, from))
    .map(intent => [intent, intent.expect(url, lang, from)])
    .filter(([, verdict]) => verdict !== true)
    .map(([intent, verdict]) => ({
      key: `${intent.name} link leads to ${url.origin === from.origin ? destinationOf(url) : url.host}`,
      text: `${intent.name} link ${verdict}`,
    }));
}
