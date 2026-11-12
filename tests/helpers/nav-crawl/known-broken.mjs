// Navigation problems tests/nav-crawl-browser.mjs finds today, one entry per
// root cause, each with the fix that removes it. The crawl fails on anything
// not listed here, and on any entry it no longer finds, so this list only ever
// shrinks.
//
// Empty since refactor Phase 2 (12 Nov 2026): the audit buttons open /audit,
// owner sign-in links come back to their page, and the dashboard logo opens the
// dashboard. Add an entry only with the fix that will remove it.
export const KNOWN_BROKEN = new Map();
