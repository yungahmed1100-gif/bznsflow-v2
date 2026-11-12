// The sitemap and hreflang view of the pages listed in src/lib/route-table.js.
// Read by the sitemap generator (scripts/gen-sitemap.mjs) and <Seo>.
//
// Arabic is the canonical/primary language (unprefixed). The English mirror is
// the same path under /en. The old /ar URLs 301-redirect to / (vercel.json).

import { SEO_PAGES } from './lib/route-table.js';
import { localePath } from './lib/paths.js';

export const SITE = 'https://www.bznsflowai.com';
export const LOCALES = ['ar', 'en'];

// The sitemap's pages by canonical (Arabic, unprefixed) path; /en is derived.
// lastmod is explicit and deterministic so rebuilds don't churn the sitemap.
export const PAGES = SEO_PAGES;

// Build the absolute URL for a given canonical path + locale.
export const urlFor = (path, lang) => `${SITE}${localePath(lang, path)}`;
