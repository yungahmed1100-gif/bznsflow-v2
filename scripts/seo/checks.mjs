// Judgement layer: turns collected page facts into findings.
// Every check returns findings; nothing here touches the network.

import {
  SEVERITY, TITLE_MIN, TITLE_MAX, DESC_MIN, DESC_MAX,
  LCP_MS, CLS, FCP_MS, IMAGE_OVERSIZE_RATIO, REQUIRED_SCHEMA_PROPS,
} from './rules.mjs';

const finding = (severity, code, message) => ({ severity, code, message });
const { ERROR, WARN, INFO } = SEVERITY;

// Strip a trailing slash so '/en' and '/en/' compare equal.
const norm = (u) => (u ? u.replace(/\/$/, '') || '/' : u);

function checkTitle({ title }) {
  if (!title) return [finding(ERROR, 'title-missing', 'No <title>')];
  const n = title.length;
  if (n < TITLE_MIN) return [finding(WARN, 'title-short', `Title ${n} chars (min ${TITLE_MIN}): "${title}"`)];
  if (n > TITLE_MAX) return [finding(WARN, 'title-long', `Title ${n} chars (max ${TITLE_MAX}) — will truncate in SERP: "${title}"`)];
  return [];
}

function checkDescription({ description }) {
  if (!description) return [finding(ERROR, 'desc-missing', 'No meta description')];
  const n = description.length;
  if (n < DESC_MIN) return [finding(WARN, 'desc-short', `Meta description ${n} chars (min ${DESC_MIN})`)];
  if (n > DESC_MAX) return [finding(WARN, 'desc-long', `Meta description ${n} chars (max ${DESC_MAX}) — will truncate`)];
  return [];
}

function checkKeywords({ keywords }) {
  if (!keywords) return [];
  const count = keywords.split(',').length;
  return [finding(WARN, 'meta-keywords',
    `meta keywords present (${count} terms). Google ignores it; large lists read as spam. Remove.`)];
}

function checkHeadings({ headings }) {
  const out = [];
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) out.push(finding(ERROR, 'h1-missing', 'No <h1>'));
  if (h1s.length > 1) out.push(finding(ERROR, 'h1-multiple', `${h1s.length} <h1> elements: ${h1s.map((h) => `"${h.text}"`).join(', ')}`));

  let prev = 0;
  for (const h of headings) {
    if (prev && h.level > prev + 1) {
      out.push(finding(WARN, 'heading-skip', `Heading jumps h${prev} → h${h.level} at "${h.text}"`));
    }
    prev = h.level;
  }
  return out;
}

function checkCanonical({ canonical, finalUrl }) {
  if (!canonical) return [finding(ERROR, 'canonical-missing', 'No canonical link')];
  if (!/^https?:\/\//.test(canonical)) return [finding(ERROR, 'canonical-relative', `Canonical is not absolute: ${canonical}`)];
  if (norm(canonical) !== norm(finalUrl)) {
    return [finding(INFO, 'canonical-cross', `Canonical points elsewhere: ${canonical} (page is ${finalUrl})`)];
  }
  return [];
}

function checkRobotsMeta({ robots }) {
  if (robots && /noindex/i.test(robots)) {
    return [finding(ERROR, 'noindex', `Page is noindex: "${robots}"`)];
  }
  return [];
}

function checkContent({ textLength }) {
  if (textLength < 300) {
    return [finding(ERROR, 'thin-content',
      `Only ${textLength} chars of rendered text — likely not server-rendered, or genuinely thin`)];
  }
  return [];
}

function checkImages({ images }) {
  const out = [];

  // The same asset often appears several times at different sizes. Judge each
  // source once, against its LARGEST render box — an avatar that is 36px in a
  // list but 74px in a card must still look sharp in the card. The allowance is
  // 2x the CSS size, which is what a retina display actually needs, so only
  // genuinely wasteful assets are reported.
  const bySrc = new Map();
  for (const img of images) {
    if (img.alt === null) out.push(finding(ERROR, 'img-alt-missing', `Image has no alt attribute: ${img.src}`));
    if (!img.hasDimensions && img.renderWidth > 0) {
      out.push(finding(WARN, 'img-no-dimensions', `Image lacks width/height (CLS risk): ${img.src}`));
    }
    if (img.renderWidth <= 0) continue;
    const prev = bySrc.get(img.src);
    if (!prev || img.renderWidth > prev.renderWidth) bySrc.set(img.src, img);
  }

  for (const [src, img] of bySrc) {
    const budget = img.renderWidth * IMAGE_OVERSIZE_RATIO;
    if (img.naturalWidth > budget) {
      const waste = (img.naturalWidth / img.renderWidth).toFixed(1);
      out.push(finding(WARN, 'img-oversized',
        `Served ${img.naturalWidth}px for a ${img.renderWidth}px box (${waste}x, budget ${budget}px): ${src}`));
    }
  }
  return out;
}

function checkJsonLd({ jsonLd }) {
  const out = [];
  for (const block of jsonLd) {
    if (!block.ok) {
      out.push(finding(ERROR, 'jsonld-invalid', `JSON-LD block ${block.index} does not parse: ${block.error}`));
      continue;
    }
    const nodes = Array.isArray(block.data) ? block.data : [block.data];
    for (const node of nodes) {
      const type = node?.['@type'];
      if (!type) {
        out.push(finding(WARN, 'jsonld-no-type', `JSON-LD block ${block.index} has no @type`));
        continue;
      }
      const required = REQUIRED_SCHEMA_PROPS[type];
      if (!required) continue;
      for (const prop of required) {
        if (node[prop] === undefined) {
          out.push(finding(WARN, 'jsonld-missing-prop', `${type} is missing required property "${prop}"`));
        }
      }
    }
  }
  return out;
}

function checkOpenGraph({ og }) {
  const out = [];
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!og[key]) out.push(finding(WARN, 'og-missing', `Missing ${key}`));
  }
  return out;
}

function checkRedirects({ redirects, status }) {
  const out = [];
  if (status >= 400) out.push(finding(ERROR, 'http-error', `HTTP ${status}`));
  if (redirects.length > 1) {
    out.push(finding(WARN, 'redirect-chain',
      `${redirects.length}-hop redirect chain: ${redirects.map((r) => r.from).join(' → ')}`));
  }
  return out;
}

function checkVitals({ vitals }) {
  const out = [];
  if (vitals.lcp !== null && vitals.lcp > LCP_MS) {
    out.push(finding(WARN, 'lcp', `LCP ${vitals.lcp}ms exceeds ${LCP_MS}ms`));
  }
  if (vitals.cls > CLS) out.push(finding(WARN, 'cls', `CLS ${vitals.cls} exceeds ${CLS}`));
  if (vitals.fcp !== null && vitals.fcp > FCP_MS) {
    out.push(finding(WARN, 'fcp', `FCP ${vitals.fcp}ms exceeds ${FCP_MS}ms`));
  }
  return out;
}

// ── Per-page ────────────────────────────────────────────────────────────────
export function checkPage(page) {
  if (page.error) return [finding(ERROR, 'load-failed', `Could not load: ${page.error}`)];
  return [
    ...checkRedirects(page),
    ...checkTitle(page),
    ...checkDescription(page),
    ...checkKeywords(page),
    ...checkHeadings(page),
    ...checkCanonical(page),
    ...checkRobotsMeta(page),
    ...checkContent(page),
    ...checkImages(page),
    ...checkJsonLd(page),
    ...checkOpenGraph(page),
    ...checkVitals(page),
  ];
}

// ── Cross-page ──────────────────────────────────────────────────────────────
// Uniqueness, hreflang reciprocity and internal-link integrity can only be
// judged once every page is in hand.
export function checkSite(pages, { sitemapUrls }) {
  const out = [];
  const live = pages.filter((p) => !p.error);
  const known = new Set(live.map((p) => norm(p.finalUrl)));

  for (const field of ['title', 'description']) {
    const seen = new Map();
    for (const p of live) {
      const value = p[field];
      if (!value) continue;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push(p.finalUrl);
    }
    for (const [value, urls] of seen) {
      if (urls.length > 1) {
        out.push(finding(ERROR, `duplicate-${field}`,
          `${urls.length} pages share the same ${field} ("${String(value).slice(0, 60)}…"): ${urls.join(', ')}`));
      }
    }
  }

  // hreflang must be reciprocal and must include x-default.
  for (const p of live) {
    if (p.hreflang.length === 0) continue;
    const langs = p.hreflang.map((h) => h.lang);
    if (!langs.includes('x-default')) {
      out.push(finding(WARN, 'hreflang-no-xdefault', `${p.finalUrl} declares hreflang but no x-default`));
    }
    const selfDeclared = p.hreflang.some((h) => norm(h.href) === norm(p.finalUrl));
    if (!selfDeclared) {
      out.push(finding(ERROR, 'hreflang-no-self', `${p.finalUrl} does not list itself in its own hreflang set`));
    }
    for (const alt of p.hreflang) {
      if (alt.lang === 'x-default') continue;
      const target = live.find((q) => norm(q.finalUrl) === norm(alt.href));
      if (!target) continue; // outside the crawl — reported by the link check
      const reciprocal = target.hreflang.some((h) => norm(h.href) === norm(p.finalUrl));
      if (!reciprocal) {
        out.push(finding(ERROR, 'hreflang-not-reciprocal',
          `${p.finalUrl} → ${alt.href} (${alt.lang}) is not returned by the target`));
      }
    }
  }

  // Internal links that point at URLs the sitemap never declares.
  const origin = live[0] ? new URL(live[0].finalUrl).origin : null;
  if (origin) {
    const orphaned = new Set();
    for (const p of live) {
      for (const link of p.links) {
        if (!link.href.startsWith(origin)) continue;
        const clean = norm(link.href.split('#')[0].split('?')[0]);
        if (!known.has(clean) && !sitemapUrls.has(clean)) orphaned.add(clean);
      }
    }
    for (const url of orphaned) {
      out.push(finding(INFO, 'link-outside-sitemap', `Internal link to a URL not in the sitemap: ${url}`));
    }
  }

  // Sitemap ↔ crawl agreement.
  for (const url of sitemapUrls) {
    if (!known.has(norm(url))) {
      out.push(finding(WARN, 'sitemap-unreachable', `Sitemap lists a URL the crawl could not confirm: ${url}`));
    }
  }

  return out;
}
