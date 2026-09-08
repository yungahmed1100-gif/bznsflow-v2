// Thresholds and severities for the SEO audit. Single source of truth so the
// checks read declaratively and nothing is a magic number.

export const SEVERITY = {
  ERROR: 'error',   // blocks the build — actively costs rankings
  WARN: 'warn',     // should fix — measurable but not fatal
  INFO: 'info',     // worth knowing
};

export const TITLE_MIN = 30;
export const TITLE_MAX = 60;
export const DESC_MIN = 120;
export const DESC_MAX = 160;

// Core Web Vitals targets — mirrors ~/.claude/rules/web/performance.md.
export const LCP_MS = 2500;
export const CLS = 0.1;
export const FCP_MS = 1500;

// An image served more than this many times its rendered area is wasted bytes.
export const IMAGE_OVERSIZE_RATIO = 2;

export const NAV_TIMEOUT_MS = 30_000;

// Schema.org types we expect to parse, with the properties Google actually reads.
export const REQUIRED_SCHEMA_PROPS = {
  Organization: ['name', 'url'],
  WebSite: ['name', 'url'],
  Service: ['name'],
  FAQPage: ['mainEntity'],
  SoftwareApplication: ['name'],
  BreadcrumbList: ['itemListElement'],
  Article: ['headline'],
  Offer: ['price', 'priceCurrency'],
};
