// Single source of truth for the site's prerendered routes.
// Read by: the SSG route table (src/routes.jsx), the sitemap generator
// (scripts/gen-sitemap.mjs), and the <Seo> hreflang logic.
//
// English is the canonical path (unprefixed). The Arabic mirror is the same
// path under /ar. nl/de/es are intentionally NOT prerendered (client-side soft
// switch only) — excluded from routing, sitemap, and hreflang.

export const SITE = 'https://www.bznsflowai.com';
export const LOCALES = ['en', 'ar'];

// Each page lists its English (canonical) path. The /ar mirror is derived.
// lastmod is explicit + deterministic so rebuilds don't churn the sitemap.
export const PAGES = [
  { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-06-28' },
  // Phase 2 adds: /pricing, /real-estate-lead-automation,
  // /whatsapp-automation-real-estate, /speed-to-lead, /how-it-works, /blog, ...
];

// Build the absolute URL for a given English path + locale.
export function urlFor(path, lang) {
  const prefix = lang === 'ar' ? '/ar' : '';
  if (path === '/') return `${SITE}${prefix || '/'}`;
  return `${SITE}${prefix}${path}`;
}
