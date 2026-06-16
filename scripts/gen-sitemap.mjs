// Generates public/sitemap.xml from the canonical route manifest.
// One <url> per locale (en + /ar), each carrying reciprocal xhtml:link
// alternates (en / ar / x-default). Deterministic lastmod (no new Date()).
// Run via `npm run gen:sitemap` (part of the build).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SITE, LOCALES, PAGES, urlFor } from '../src/routes-manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/sitemap.xml');

const xmlEscape = (s) => s.replace(/&/g, '&amp;');

function alternates(path) {
  const links = [
    `      <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(urlFor(path, 'en'))}" />`,
    `      <xhtml:link rel="alternate" hreflang="ar" href="${xmlEscape(urlFor(path, 'ar'))}" />`,
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(urlFor(path, 'en'))}" />`,
  ];
  return links.join('\n');
}

const urls = [];
for (const page of PAGES) {
  for (const lang of LOCALES) {
    urls.push(
      [
        '  <url>',
        `    <loc>${xmlEscape(urlFor(page.path, lang))}</loc>`,
        `    <lastmod>${page.lastmod}T00:00:00+00:00</lastmod>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority.toFixed(1)}</priority>`,
        alternates(page.path),
        '  </url>',
      ].join('\n'),
    );
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

writeFileSync(OUT, xml);
console.log(`[gen:sitemap] wrote ${PAGES.length * LOCALES.length} URLs → public/sitemap.xml (SITE=${SITE})`);
