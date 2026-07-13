// Single source of truth for the site's prerendered routes.
// Read by: the SSG route table (src/routes.jsx), the sitemap generator
// (scripts/gen-sitemap.mjs), and the <Seo> hreflang logic.
//
// Arabic is the canonical/primary language (unprefixed). The English mirror is
// the same path under /en. The old /ar URLs 301-redirect to / (vercel.json).

export const SITE = 'https://www.bznsflowai.com';
export const LOCALES = ['ar', 'en'];

// Each page lists its canonical (Arabic, unprefixed) path. /en is derived.
// lastmod is explicit + deterministic so rebuilds don't churn the sitemap.
export const PAGES = [
  { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-07-13' },
];

// Build the absolute URL for a given canonical path + locale.
export function urlFor(path, lang) {
  const prefix = lang === 'en' ? '/en' : '';
  if (path === '/') return `${SITE}${prefix || '/'}`;
  return `${SITE}${prefix}${path}`;
}
