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
        body: JSON.stringify({
          ok: true,
          csrfToken: 'a'.repeat(64),
          providers: ['google', 'microsoft', 'linkedin'],
          account: null,
        }) });
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

  // ── Social sign-in buttons ────────────────────────────────────────────────
  const providers = page.locator('.auth-provider');
  chk('renders one button per configured provider', await providers.count() === 3,
      `got ${await providers.count()}`);

  // Real links, not scripted buttons: an OAuth redirect cannot happen inside
  // fetch, and an anchor also works before hydration.
  const hrefs = await providers.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  chk('each button links to the start endpoint with its provider and language',
      hrefs.every((h, i) => h === `/api/auth-oauth?provider=${['google', 'microsoft', 'linkedin'][i]}&lang=${lang}`),
      hrefs.join(' | '));

  // The label has to survive translation; an icon-only button would be
  // unusable with a screen reader.
  const labels = await providers.evaluateAll((els) => els.map((e) => e.textContent.trim()));
  chk('every button has a visible label', labels.every((l) => l.length > 3), labels.join(' | '));
  chk('brand names stay in Latin script even in Arabic',
      labels.some((l) => l.includes('Google')), labels.join(' | '));

  // The buttons and the divider must not force the card wider than the screen.
  const providerOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth);
  chk('provider buttons do not cause horizontal overflow', !providerOverflow);

  chk('the "or" divider is present', await page.locator('.auth-or').count() === 1);
  await page.screenshot({ path: `${OUT}/${lang}-1b-providers.png`, fullPage: true });

  // A failed round trip reports through ?e=, and must not leave the code in the
  // URL for a refresh to re-show.
  await page.goto(`${BASE}${path}?e=cancelled`, { waitUntil: 'networkidle' });
  chk('a cancelled sign-in shows a message', await page.locator('.auth-error').count() === 1);
  chk('the ?e= code is stripped from the address bar',
      !page.url().includes('e=cancelled'), page.url());
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });

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
