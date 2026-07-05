import React from 'react';
import { Head } from 'vite-react-ssg';
import { SITE, urlFor } from '../../routes-manifest';

// Per-page head: title, description, canonical, reciprocal hreflang (en/ar/
// x-default), OpenGraph/Twitter, and optional JSON-LD. Rendered into the static
// HTML at build time via vite-react-ssg's <Head>. Global tags (favicons, fonts,
// Organization/WebSite JSON-LD) stay in index.html and are copied to every page.
//
// Props:
//   lang     — 'en' | 'ar' (the locale of THIS prerendered page)
//   path     — the English/canonical path, e.g. '/' or '/pricing'
//   title, description — page-specific copy
//   ogImage  — absolute or root-relative image (defaults to og-image.jpg)
//   jsonLd   — array of schema.org objects to embed
//   noindex  — set true to keep a page out of the index
export function Seo({
  lang = 'en',
  path = '/',
  title,
  description,
  ogImage = `${SITE}/og-image.jpg`,
  jsonLd = [],
  noindex = false,
}) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const canonical = urlFor(path, lang);
  const enUrl = urlFor(path, 'en');
  const arUrl = urlFor(path, 'ar');
  const ogLocale = lang === 'ar' ? 'ar_AE' : 'en_US';
  const ogLocaleAlt = lang === 'ar' ? 'en_US' : 'ar_AE';

  return (
    <Head>
      <html lang={lang} dir={dir} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Reciprocal hreflang — en/ar only (nl/de/es are not prerendered). */}
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      {/* OpenGraph */}
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlt} />

      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Head>
  );
}
