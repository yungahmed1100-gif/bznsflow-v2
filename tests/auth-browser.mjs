// Visual + interaction smoke for the sign-in page.
//
// The API is stubbed with page.route, so this walks all four states without a
// database, a mailbox or a deployed Apps Script. It asserts the things a
// screenshot cannot: that the flow advances, that RTL does not overflow, and
// that the code field keeps exactly the six digits it should.
//
// Run against `npm run dev`:  node tests/auth-browser.mjs [baseUrl]

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = 'work/auth-browser';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const chk = (name, cond, extra = '') => {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, extra); fail++; }
};

const browser = await chromium.launch();

for (const [lang, path, width] of [['ar', '/signin', 390], ['en', '/en/signin', 1440]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();

  let needsProfile = true;
  await page.route('**/api/auth-code', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route('**/api/auth-session', (r) => {
    const m = r.request().method();
    if (m === 'GET') {
      return r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, csrfToken: 'a'.repeat(64), account: null }) });
    }
    if (m === 'POST') {
      return r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, needsProfile, account: { email: 'test@example.com' } }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, account: { email: 'test@example.com', name: 'Test' } }) });
  });

  console.log(`\n${lang} @ ${width}px`);
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });

  chk('renders the right direction', await page.getAttribute('html', 'dir') === (lang === 'ar' ? 'rtl' : 'ltr'));
  await page.screenshot({ path: `${OUT}/${lang}-1-email.png`, fullPage: true });

  // Step 1 -> 2
  await page.fill('#auth-email', 'test@example.com');
  await page.click('button[type=submit]');
  await page.waitForSelector('#auth-code', { timeout: 5000 });
  chk('email step advances to the code step', true);
  await page.screenshot({ path: `${OUT}/${lang}-2-code.png`, fullPage: true });

  // A pasted code keeps all six digits: this is what maxLength={6} used to
  // break, by truncating "123 456" to "123 45" before the strip ran.
  await page.fill('#auth-code', '123 456');
  chk('a spaced paste keeps all six digits', await page.inputValue('#auth-code') === '123456',
      `got "${await page.inputValue('#auth-code')}"`);
  await page.fill('#auth-code', 'abc123456789');
  chk('letters are refused and the value caps at six',
      await page.inputValue('#auth-code') === '123456',
      `got "${await page.inputValue('#auth-code')}"`);

  const resend = page.locator('.auth-link', { hasText: /\d+/ }).first();
  chk('resend is disabled during the countdown', await resend.isDisabled().catch(() => false));

  // Step 2 -> 3
  await page.click('button[type=submit]');
  await page.waitForSelector('#auth-industry', { timeout: 5000 });
  chk('code step advances to the profile step', true);
  chk('the dial code is shown for the default country',
      (await page.textContent('.auth-dial'))?.includes('+971'));
  await page.screenshot({ path: `${OUT}/${lang}-3-profile.png`, fullPage: true });

  // Step 3 -> done
  await page.fill('#auth-name', 'Test Person');
  await page.fill('#auth-phone', '501234567');
  await page.selectOption('#auth-industry', 'cafe');
  await page.click('button[type=submit]');
  await page.waitForSelector('.auth-done', { timeout: 5000 });
  chk('profile step reaches the confirmation', true);
  await page.screenshot({ path: `${OUT}/${lang}-4-done.png`, fullPage: true });

  // No horizontal overflow in any state — the check that actually catches RTL bugs.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  chk('no horizontal overflow', !overflow);

  await ctx.close();
}

await browser.close();
console.log(`\n${fail ? '✗' : '✓'} auth-browser: ${pass} passed, ${fail} failed`);
console.log(`screenshots in ${OUT}/`);
process.exit(fail ? 1 : 0);
