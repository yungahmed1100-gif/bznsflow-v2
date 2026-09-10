// Accessibility check against the WCAG 2.2 AA target recorded in PRODUCT.md.
//
//   node scripts/a11y.mjs
//
// Runs axe-core over both languages at desktop and phone widths. RTL is
// checked as its own page, not by flipping a class, because the Arabic route
// is what actually sets dir="rtl".

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE || 'http://localhost:5173';

// A signed-in visitor sees a navbar the signed-out passes below never render:
// the account link, its initial mark, and its own colour. Stubbing the session
// response is the only way to audit it from a dev server, which has no database
// behind it — and the shape here is the one api/auth-session.js returns.
const SESSION = {
  ok: true,
  csrfToken: 'a11y',
  providers: [],
  needsProfile: false,
  account: { id: 'a11y', email: 'ahmed@example.com', name: 'Ahmed Al Rawahi' },
};

const TARGETS = [
  { lang: 'ar', path: '/', width: 1440 },
  { lang: 'ar', path: '/', width: 390 },
  { lang: 'en', path: '/en', width: 1440 },
  { lang: 'en', path: '/en', width: 390 },
  { lang: 'ar', path: '/', width: 1440, signedIn: true },
  { lang: 'en', path: '/en', width: 390, signedIn: true },
];

const browser = await chromium.launch();
let total = 0;

for (const t of TARGETS) {
  // axe-core requires a page from an explicit context, not browser.newPage().
  const context = await browser.newContext({ viewport: { width: t.width, height: 900 } });
  const page = await context.newPage();
  if (t.signedIn) {
    await page.route('**/api/auth-session', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(SESSION),
    }));
  }
  await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle' });

  // Reveal-gated content is opacity:0 until scrolled into view, and axe skips
  // what it cannot see. Force it visible so the whole page is actually audited.
  //
  // Transitions have to die with it: axe samples the *computed* colour, so an
  // element caught mid-fade reports the blend of foreground and background
  // rather than either real value, and every reading comes out wrong.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
      [data-reveal] { opacity: 1 !important; transform: none !important; }
    `,
  });
  await page.waitForTimeout(300);

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const who = t.signedIn ? ' signed in' : '';
  console.log(`\n${t.lang} @ ${t.width}px${who} — ${violations.length} violation(s)`);
  for (const v of violations) {
    total += v.nodes.length;
    console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`      ${node.target.join(' ')}`);
      const detail = (node.failureSummary || '').split('\n').filter(Boolean).pop();
      if (detail) console.log(`      ${detail.trim()}`);
    }
  }
  await page.close();
  await context.close();
}

await browser.close();
console.log(`\ntotal failing nodes: ${total}`);
process.exit(total > 0 ? 1 : 0);
