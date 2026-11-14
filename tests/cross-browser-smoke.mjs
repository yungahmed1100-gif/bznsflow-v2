import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('work/playwright-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('work/playwright-browsers');
const { firefox, webkit } = await import('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5199';
const output = 'work/cross-browser';
await mkdir(output, { recursive: true });
let checks = 0;
for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const [lang, path] of [['en', '/en'], ['ar', '/']]) for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => localStorage.setItem('bf_playbook_seen', '1'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(base).origin) return route.abort();
        if (url.pathname.startsWith('/_vercel/')) return route.fulfill({ contentType: 'application/javascript', body: '' });
        if (url.pathname === '/api/auth-session') return route.fulfill({ json: { ok: true, account: null } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
        return route.continue();
      });
      await page.goto(base + path);
      await page.locator('.inquiry-story').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true); checks++;
      for (const index of [0, 3, 4, 1]) {
        await page.locator('.pipeline-step').nth(index).evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(index => document.querySelector('.inquiry-story').dataset.activeStep === String(index), index);
        assert.equal(await page.locator('.pipeline-node').nth(index).getAttribute('aria-pressed'), 'true'); checks++;
      }
      await page.locator('.story-control').nth(3).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.inquiry-story').dataset.activeStep === '3');
      assert.equal(await page.locator('.pipeline-record li').count(), 4); checks++;
      await page.screenshot({ path: `${output}/${name}-${lang}-${width}-story.png` });
      await page.goto(`${base}${lang === 'ar' ? '' : '/en'}/privacy`);
      await page.locator('.legal-doc').waitFor();
      for (const region of await page.locator('.legal-table-wrap').all()) {
        assert.equal(await region.getAttribute('tabindex'), '0'); checks++;
        assert.ok(await region.getAttribute('aria-label')); checks++;
        const scrollable = await region.evaluate(el => el.scrollWidth > el.clientWidth);
        if (scrollable) {
          await region.focus();
          await region.press(lang === 'ar' ? 'ArrowLeft' : 'ArrowRight');
          await page.waitForFunction(el => Math.abs(el.scrollLeft) > 0, await region.elementHandle()); checks++;
        }
      }
      await page.goto(`${base}${lang === 'ar' ? '' : '/en'}/signin`);
      const email = page.locator('input[type=email]');
      await email.waitFor();
      await email.fill('synthetic@example.test');
      assert.equal(await email.inputValue(), 'synthetic@example.test'); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true); checks++;
      await page.goto(`${base}${lang === 'ar' ? '' : '/en'}/layla/dashboard`);
      await page.waitForURL(/\/catalyst\/setup\?next=dashboard$/); checks++;
      assert.equal(await page.locator('.ld-conversation').count(), 0); checks++;
      assert.deepEqual(errors, [], `${name} ${lang} ${width}: page errors`); checks++;
      await context.close();
    }
    console.log(`${name}: critical EN/AR desktop/mobile journeys passed`);
  } finally { await browser.close(); }
}
console.log(`${checks} Firefox/WebKit smoke checks passed. Synthetic APIs; no external effects.`);
