// Loads one URL in Playwright and extracts every SEO-relevant fact about it.
// Pure collection — no judgement. The checks module decides what is wrong.

import { NAV_TIMEOUT_MS } from './rules.mjs';

// Everything the audit needs from a single page, gathered in one DOM pass.
const EXTRACT = () => {
  const abs = (href) => {
    try { return new URL(href, location.href).href; } catch { return null; }
  };

  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((el, index) => {
      try { return { index, ok: true, data: JSON.parse(el.textContent) }; }
      catch (err) { return { index, ok: false, error: String(err.message), data: null }; }
    });

  return {
    title: document.title || null,
    description:
      document.querySelector('meta[name="description"]')?.content?.trim() || null,
    robots: document.querySelector('meta[name="robots"]')?.content?.trim() || null,
    keywords: document.querySelector('meta[name="keywords"]')?.content?.trim() || null,
    canonical: abs(document.querySelector('link[rel="canonical"]')?.href || ''),
    htmlLang: document.documentElement.lang || null,
    htmlDir: document.documentElement.dir || null,

    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((el) => ({
      lang: el.getAttribute('hreflang'),
      href: abs(el.getAttribute('href')),
    })),

    headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => ({
      level: Number(el.tagName[1]),
      text: el.textContent.trim().slice(0, 120),
    })),

    og: Object.fromEntries(
      [...document.querySelectorAll('meta[property^="og:"]')]
        .map((el) => [el.getAttribute('property'), el.content]),
    ),

    images: [...document.querySelectorAll('img')].map((el) => ({
      src: abs(el.getAttribute('src') || ''),
      alt: el.getAttribute('alt'),
      hasDimensions: Boolean(el.getAttribute('width') && el.getAttribute('height')),
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      renderWidth: Math.round(el.getBoundingClientRect().width),
      renderHeight: Math.round(el.getBoundingClientRect().height),
      loading: el.getAttribute('loading'),
    })),

    links: [...document.querySelectorAll('a[href]')].map((el) => ({
      href: abs(el.getAttribute('href')),
      raw: el.getAttribute('href'),
      text: el.textContent.trim().slice(0, 80),
      rel: el.getAttribute('rel'),
    })).filter((l) => l.href),

    jsonLd,
    // Rendered text length tells us whether SSG actually baked content in.
    textLength: document.body.innerText.replace(/\s+/g, ' ').trim().length,
  };
};

// Web-vitals style metrics from the real navigation, measured in-page.
const VITALS = () => new Promise((resolve) => {
  const out = { lcp: null, cls: 0, fcp: null, ttfb: null };

  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) out.ttfb = Math.round(nav.responseStart);

  const paint = performance.getEntriesByName('first-contentful-paint')[0];
  if (paint) out.fcp = Math.round(paint.startTime);

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      out.lcp = Math.round(entries[entries.length - 1].startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) out.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* unsupported — leave nulls */ }

  setTimeout(() => resolve({ ...out, cls: Number(out.cls.toFixed(4)) }), 1200);
});

export async function collectPage(context, url) {
  const page = await context.newPage();
  const redirects = [];
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: NAV_TIMEOUT_MS,
    });
    if (!response) return { url, error: 'no response' };

    // Walk the redirect chain back to the requested URL.
    let req = response.request().redirectedFrom();
    while (req) {
      redirects.unshift({ from: req.url(), status: req.response()?.status() ?? null });
      req = req.redirectedFrom();
    }

    const data = await page.evaluate(EXTRACT);
    const vitals = await page.evaluate(VITALS);

    return {
      url,
      finalUrl: page.url(),
      status: response.status(),
      redirects,
      ...data,
      vitals,
    };
  } catch (err) {
    return { url, error: String(err.message || err) };
  } finally {
    await page.close();
  }
}
