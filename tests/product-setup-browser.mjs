// Synthetic UI evidence only; real grant checks live in product-setup.test.mjs.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let checks = 0;
try {
  for (const lang of ['en', 'ar']) for (const product of ['ascend', 'catalyst']) for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let progress = { product, step: 0, completed: false, version: 0 };
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), body = route.request().postDataJSON();
      let value = { ok: true, csrfToken: 'a'.repeat(64) };
      if (url.pathname === '/api/product-setup') { if (body) progress = { ...progress, step: body.step, version: progress.version + 1 }; value = { ...value, progress, settings: null }; }
      else if (url.pathname === '/api/knowledge') value = { ...value, sources: [], drafts: [] };
      else value = { ...value, available: true, account: { email: 'sample@example.test' }, savedToAccount: true, journeyStep: 0, profileVersion: 1 };
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}${lang === 'en' ? '/en' : ''}/${product}/setup`);
    await page.getByRole('heading', { name: lang === 'en' ? 'Set up your workspace' : 'إعداد مساحة عملك' }).waitFor();
    // Wait for the lazily loaded step content, not a fixed delay: axe must scan the settled page.
    await page.locator(product === 'catalyst' ? '.bzns-start, .bzns-editor' : '.setup-content form, .setup-content h2').first().waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content').then(x => x.includes('noindex')), true);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${product}/${lang}/${width} overflow`);
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), [], `${product}/${lang}/${width} accessibility`);
    assert.deepEqual(errors, []);
    await page.keyboard.press('Tab'); assert(await page.evaluate(() => document.activeElement !== document.body));
    if (product === 'ascend') {
      await page.getByRole('combobox', { name: lang === 'en' ? 'Sector' : 'القطاع', exact: true }).selectOption('retail');
      await page.getByRole('button', { name: lang === 'en' ? 'Save and continue' : 'احفظ وتابع', exact: true }).click();
      await page.waitForURL(/step=1/); await page.reload();
      await page.getByRole('heading', { name: lang === 'en' ? 'Initial business data' : 'بيانات النشاط الأولية', exact: true }).waitFor();
    }
    checks++; await context.close();
  }
  console.log(`${checks} setup locale/viewport cases passed, including noindex, focus, overflow, accessibility and Ascend reload.`);
} finally { await browser.close(); }
