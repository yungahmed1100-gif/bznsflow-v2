// The site's pages, listed once. src/routes.ts (what the app renders),
// react-router.config.ts (what is prerendered: Vercel serves no SPA fallback,
// so a page that is not prerendered is a live 404) and src/routes-manifest.js
// (the sitemap and hreflang) are all built from this list.
//
// Each page is listed by its Arabic path. Arabic is the primary language and
// has no prefix; the English twin is the same path under /en. The route module
// is src/route-modules/<module>.jsx, and en-<module>.jsx for English.
//
// Kept free of imports: routes-manifest.js reaches the browser bundle on every
// page through <Seo>, so nothing heavy may come in through here.

/** The sector packs with an owner preview page; tests/route-parity.test.mjs checks it against config/hasib-packs.js. */
export const PREVIEW_PACKS = [
  'retail',
  'retail-tech',
  'dental',
  'real-estate',
  'construction',
  'automotive',
  'fitness',
  'media',
  'hvac',
];

/**
 * @typedef {{ changefreq: string, priority: number, lastmod: string }} Seo
 * @typedef {{ path: string, module: string, englishModule?: string, seo?: Seo,
 *             params?: Record<string, string[]>, developmentOnly?: boolean }} Page
 * @type {Page[]}
 */
export const PAGES = [
  // In the sitemap, in this order.
  { path: '/contact', module: 'contact', seo: { changefreq: 'monthly', priority: 0.5, lastmod: '2026-10-12' } },
  { path: '/services', module: 'services', seo: { changefreq: 'monthly', priority: 0.8, lastmod: '2026-10-12' } },
  { path: '/support', module: 'support', seo: { changefreq: 'monthly', priority: 0.5, lastmod: '2026-10-12' } },
  { path: '/refund', module: 'refund', seo: { changefreq: 'yearly', priority: 0.3, lastmod: '2026-10-12' } },
  {
    path: '/',
    module: 'home',
    englishModule: 'en',
    seo: { changefreq: 'weekly', priority: 1.0, lastmod: '2026-10-12' },
  },
  // Low priority and rarely changed, but indexable on purpose: Google's and
  // LinkedIn's consent screens link to it, and a privacy policy that hides from
  // search looks like it has something to hide.
  { path: '/privacy', module: 'privacy', seo: { changefreq: 'yearly', priority: 0.3, lastmod: '2026-10-31' } },
  // Linked from Meta's consent and app settings, like the privacy policy.
  { path: '/terms', module: 'terms', seo: { changefreq: 'yearly', priority: 0.3, lastmod: '2026-10-12' } },
  {
    path: '/data-deletion',
    module: 'data-deletion',
    seo: { changefreq: 'yearly', priority: 0.3, lastmod: '2026-09-23' },
  },
  // The free-audit booking page every audit button opens (2026-10-24).
  { path: '/audit', module: 'audit', seo: { changefreq: 'weekly', priority: 0.9, lastmod: '2026-10-24' } },
  // Apex: custom enterprise solutions by request (2026-10-27).
  { path: '/apex', module: 'apex', seo: { changefreq: 'monthly', priority: 0.7, lastmod: '2026-10-27' } },
  // The lead magnet's own page, where the ad campaign lands.
  { path: '/playbook', module: 'playbook', seo: { changefreq: 'monthly', priority: 0.8, lastmod: '2026-09-11' } },

  // Not in the sitemap: accounts, setup and administration.
  { path: '/mcp', module: 'mcp' },
  { path: '/signin', module: 'signin' },
  { path: '/catalyst/setup', module: 'catalyst-setup' },
  { path: '/layla/dashboard', module: 'layla-dashboard' },
  { path: '/owner', module: 'owner' },
  { path: '/owner/access', module: 'owner-access' },
  { path: '/owner/websites', module: 'owner-websites' },
  { path: '/owner/apex', module: 'owner-apex' },
  { path: '/owner/preview/:packId', module: 'owner-preview-packId', params: { packId: PREVIEW_PACKS } },
  // A synthetic product draft, served only by the local development server.
  { path: '/owner/ascend-draft', module: 'owner-ascend-draft', developmentOnly: true },
];

/** The English twin of an Arabic path. */
export const englishPath = path => (path === '/' ? '/en' : `/en${path}`);

/** Route entries for src/routes.ts, Arabic then English for each page. */
export function routeEntries({ development = false } = {}) {
  return PAGES.filter(page => development || !page.developmentOnly).flatMap(page => {
    const arabic = { file: `route-modules/${page.module}.jsx` };
    const english = { file: `route-modules/${page.englishModule || `en-${page.module}`}.jsx` };
    return page.path === '/'
      ? [
          { ...arabic, index: true },
          { ...english, path: 'en' },
        ]
      : [
          { ...arabic, path: page.path.slice(1) },
          { ...english, path: englishPath(page.path).slice(1) },
        ];
  });
}

/** Fills a page's :params with each listed value. */
function expand(page) {
  return Object.entries(page.params || {}).reduce(
    (paths, [name, values]) => paths.flatMap(path => values.map(value => path.replace(`:${name}`, value))),
    [page.path],
  );
}

/** Every path to prerender, in both languages. */
export function prerenderPaths() {
  return PAGES.filter(page => !page.developmentOnly)
    .flatMap(expand)
    .flatMap(path => [path, englishPath(path)]);
}

/** The sitemap's pages: { path, changefreq, priority, lastmod } by Arabic path. */
export const SEO_PAGES = PAGES.filter(page => page.seo).map(({ path, seo }) => ({ path, ...seo }));
