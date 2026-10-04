import React from 'react';
import { SITE, urlFor } from '../../routes-manifest';

export function Seo({
  lang = 'en',
  path = '/',
  title,
  description,
  ogImage = `${SITE}/og-image.jpg`,
  jsonLd = [],
  noindex = false,
}) {
  const canonical = urlFor(path, lang);
  const enUrl = urlFor(path, 'en');
  const arUrl = urlFor(path, 'ar');
  const ogLocale = lang === 'ar' ? 'ar_AE' : 'en_US';
  const ogLocaleAlt = lang === 'ar' ? 'en_US' : 'ar_AE';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {/* Always emitted, never conditional. Helmet can only dedupe tags it
          manages, so an "only when noindex" tag left the indexable pages with
          no robots directive at all once the copy in index.html was removed. */}
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex, follow'
            : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
        }
      />

      {/* Reciprocal hreflang — English is the primary/default language
          (worldwide English-first targeting); Arabic is the alternate. */}
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
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
    </>
  );
}
