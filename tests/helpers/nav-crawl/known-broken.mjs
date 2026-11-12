// Navigation problems tests/nav-crawl-browser.mjs finds today, one entry per
// root cause, each with the fix that removes it. The crawl fails on anything
// not listed here, and on any entry it no longer finds, so this list only ever
// shrinks.
export const KNOWN_BROKEN = new Map([
  [
    'free audit link leads to wa.me',
    'Phase 2: every audit call to action opens the /audit booking page (Ahmed, 12 Nov 2026); ' +
      'the Arabic hero and About buttons still open WhatsApp.',
  ],
  [
    'sign in from an owner page link leads to /signin',
    'Phase 2: owner and admin sign-in links carry ?next= back to the page, and config/signin-destination.js allows /owner.',
  ],
  [
    'dashboard logo link leads to /catalyst/setup',
    'Phase 2: the dashboard logo opens the dashboard home, not Catalyst setup.',
  ],
]);
