// Single source of truth for the site's prerendered routes.
// Read by: the React Router config (src/routes.ts), the sitemap generator
// (scripts/gen-sitemap.mjs), and the <Seo> hreflang logic.
//
// Arabic is the canonical/primary language (unprefixed). The English mirror is
// the same path under /en. The old /ar URLs 301-redirect to / (vercel.json).

export const SITE = 'https://www.bznsflowai.com';
export const LOCALES = ['ar', 'en'];

// Each page lists its canonical (Arabic, unprefixed) path. /en is derived.
// lastmod is explicit + deterministic so rebuilds don't churn the sitemap.
export const PAGES = [
  { path: '/contact', changefreq: 'monthly', priority: 0.5, lastmod: '2026-10-12' },
  { path: '/services', changefreq: 'monthly', priority: 0.8, lastmod: '2026-10-12' },
  { path: '/support', changefreq: 'monthly', priority: 0.5, lastmod: '2026-10-12' },

  { path: '/refund', changefreq: 'yearly', priority: 0.3, lastmod: '2026-10-12' },
  { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-10-12' },
  // Low priority, rarely changes — but indexable and in the sitemap on
  // purpose: it is linked from Google's and LinkedIn's consent screens, and a
  // privacy policy that hides from search looks like it has something to hide.
  { path: '/privacy', changefreq: 'yearly', priority: 0.3, lastmod: '2026-09-10' },
  // Linked from Meta's consent and app settings, like the privacy policy.
  { path: '/terms', changefreq: 'yearly', priority: 0.3, lastmod: '2026-10-12' },
  { path: '/data-deletion', changefreq: 'yearly', priority: 0.3, lastmod: '2026-09-23' },
  // The lead magnet's own page — where the ad campaign lands, and the only
  // URL that offers the playbook. Ranks second only to the home page because
  // it is the page most likely to be linked to from outside.
  // The free-audit booking page every "Book the free audit" button opens (2026-10-24).
  { path: '/audit', changefreq: 'weekly', priority: 0.9, lastmod: '2026-10-24' },
  { path: '/playbook', changefreq: 'monthly', priority: 0.8, lastmod: '2026-09-11' },
];

// Build the absolute URL for a given canonical path + locale.
export function urlFor(path, lang) {
  const prefix = lang === 'en' ? '/en' : '';
  if (path === '/') return `${SITE}${prefix || '/'}`;
  return `${SITE}${prefix}${path}`;
}
