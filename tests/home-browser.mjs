// Browser checks for the public home page: the live hero pipeline, colour meanings,
// accessibility and overflow, in English and Arabic.
// Usage: node tests/home-browser.mjs http://127.0.0.1:5199
// All non-local requests are aborted; the API is never called.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let count = 0;

async function open(path, width, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  await page.goto(base + path);
  await page.locator('.pipeline').waitFor();
  return { page, context, errors };
}
const activeLabel = page => page.locator('.pipeline-step[data-state=active] .pipeline-node-label').textContent();
const serious = async page => (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.length}`);

try {
  for (const [lang, path, first, record] of [['en', '/en', 'A customer asks', 'Need'], ['ar', '/', 'العميل يسأل', 'الاحتياج']]) {
    // The pipeline cycles on its own, one step every few seconds.
    const { page, context, errors } = await open(path, 1440);
    assert.equal(await activeLabel(page), first); count++;
    await page.waitForFunction(f => document.querySelector('.pipeline-step[data-state=active] .pipeline-node-label')?.textContent !== f, first, { timeout: 6000 });
    count++;
    // Picking a step shows its example and stops the cycle.
    await page.mouse.move(0, 0);
    const fourth = page.locator('.pipeline-node').nth(3);
    await fourth.click();
    assert.equal(await fourth.getAttribute('aria-pressed'), 'true'); count++;
    assert.equal(await page.locator('.pipeline-record li').count(), 4, `${lang}: the record example shows four details`); count++;
    assert.match(await page.locator('.pipeline-record').textContent(), new RegExp(record)); count++;
    await page.mouse.move(0, 0);
    await page.waitForTimeout(3200);
    assert.equal(await page.locator('.pipeline-node').nth(3).getAttribute('aria-pressed'), 'true', 'a picked step stays'); count++;
    // Each section underlines in its own colour, and plans show their status in colour.
    const markColour = id => page.locator(`#${id} .mark`).first().evaluate(el => getComputedStyle(el).textDecorationColor);
    assert.equal(await markColour('tiers'), 'rgb(81, 164, 123)'); count++;
    assert.equal(await markColour('about'), 'rgb(92, 149, 198)'); count++;
    assert.equal(await page.locator('.tier-status.is-available').count(), 2, 'Catalyst and Ascend are available'); count++;
    assert.notEqual(await page.locator('[data-tier="catalyst"] .tier-status').evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('[data-tier="apex"] .tier-status').evaluate(el => getComputedStyle(el).backgroundColor)); count++;
    const teamImage = page.locator('.about-art img');
    await teamImage.scrollIntoViewIfNeeded();
    await teamImage.waitFor({ state: 'visible' });
    assert.equal(await teamImage.evaluate(img => img.complete && img.naturalWidth > 0 && new URL(img.currentSrc).origin === location.origin), true, `${lang}: responsive team image loads locally`); count++;
    // The served format (AVIF first) must keep its transparency: a lost alpha
    // channel renders the background black with colour noise.
    assert.equal(await teamImage.evaluate(img => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(2, 2, 1, 1).data[3]; }), 0, `${lang}: team image background is transparent`); count++;
    const expectedFont = lang === 'ar' ? 'IBM Plex Sans Arabic' : 'Poppins';
    assert.equal(await page.evaluate(font => document.fonts.check(`16px "${font}"`), expectedFont), true, `${lang}: local font is available`); count++;
    assert.deepEqual(await serious(page), [], `${lang} 1440 accessibility`); count++;
    assert.deepEqual(errors, []); count++;
    await context.close();

    // Reduced motion: nothing cycles; the visitor clicks through.
    const still = await open(path, 375, 'reduce');
    await still.page.waitForTimeout(3200);
    assert.equal(await activeLabel(still.page), first, `${lang}: no cycle under reduced motion`); count++;
    await still.page.locator('.pipeline-node').nth(1).click();
    assert.equal(await still.page.locator('.pipeline-bubble.is-out').count(), 1); count++;
    for (const width of [320, 375, 768, 1024]) {
      await still.page.setViewportSize({ width, height: 900 });
      assert.equal(await still.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${lang} ${width}: no horizontal overflow`); count++;
    }
    assert.deepEqual(await serious(still.page), [], `${lang} 375 accessibility`); count++;
    await still.context.close();
  }
  // Signed in, the name opens a menu: who is signed in, Settings, and Sign out, which clears
  // the session with the CSRF token and comes back signed out. Desktop dropdown, mobile panel.
  for (const [lang, path] of [['en', '/en'], ['ar', '/']]) {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      let signedIn = true; const deletes = [];
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(base).origin) return route.abort();
        if (url.pathname !== '/api/auth-session') return route.continue();
        if (route.request().method() === 'DELETE') { deletes.push(route.request().headers()['x-csrf-token']); signedIn = false; return route.fulfill({ json: { ok: true } }); }
        return route.fulfill({ json: { ok: true, csrfToken: 'c'.repeat(64), account: signedIn ? { id: 'a1', email: 'sara@example.com', name: 'Sara Al Balushi', profileComplete: true } : null } });
      });
      await page.goto(base + path);
      const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
      if (width < 769) await page.locator('.hamburger').click();
      const toggle = page.getByRole('button', { name: t('Your account: Sara', 'حسابك: Sara') });
      await toggle.waitFor();
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true', `${lang} ${width}: the name opens the menu`); count++;
      const settings = page.getByRole('menuitem', { name: t('Settings', 'الإعدادات') });
      await settings.waitFor({ state: 'visible' });
      assert.equal(await settings.getAttribute('href'), `${ar ? '' : '/en'}/layla/dashboard?tab=settings`); count++;
      assert.equal(await page.locator('.account-menu-email').textContent(), 'sara@example.com'); count++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${lang} ${width}: no horizontal overflow with the menu open`); count++;
      assert.deepEqual(await serious(page), [], `${lang} ${width}: account menu accessibility`); count++;
      if (width > 768) {
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false', `${lang}: Escape closes the menu`); count++;
        await toggle.click();
      }
      await page.getByRole('menuitem', { name: t('Sign out', 'تسجيل الخروج') }).click();
      await page.getByRole('link', { name: t('Sign in', 'تسجيل الدخول'), exact: true }).first().waitFor();
      assert.deepEqual(deletes, ['c'.repeat(64)], `${lang} ${width}: one sign-out with the CSRF token`); count++;
      assert.equal(new URL(page.url()).pathname, ar ? '/' : '/en', `${lang}: back on the home page, signed out`); count++;
      await context.close();
    }
  }
  console.log(`${count} home page checks passed (live pipeline, colour meanings, reduced motion, EN/AR, 320–1440).`);
} finally {
  await browser.close();
}
