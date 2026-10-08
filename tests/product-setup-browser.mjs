// Synthetic UI evidence only; real grant checks live in product-setup.test.mjs.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let checks = 0;
try {
  const product = 'catalyst';
  for (const lang of ['en', 'ar']) for (const width of [320, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let progress = { product, step: 0, completed: false, version: 0 };
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), body = route.request().postDataJSON();
      let value = { ok: true, csrfToken: 'a'.repeat(64) };
      if (url.pathname === '/api/product-setup') { if (body) progress = { ...progress, step: body.step, version: progress.version + 1 }; value = { ...value, progress, settings: null }; }
      else if (url.pathname === '/api/knowledge') value = { ...value, sources: [], drafts: [] };
      else value = { ...value, available: true, account: { email: 'sample@example.test' }, savedToAccount: true, journeyStep: 0, profileVersion: 1, bzns: { markdown: null, version: 0, publishedRevision: 0, unpublishedChanges: false },
        ...(body?.action === 'brain_state' ? { brain: { behaviour: { tone: 'informative', askName: true, ask: [], appointmentPreferences: false, handoffNote: '', version: 0, legacy: true }, askable: [], sectorId: 'other', brainStep: 0, proposals: [], total: 0, counts: {} } } : {}),
        ...(body?.action === 'catalog_list' ? { catalog: { entries: [], cursor: null, total: 0 } } : {}) };
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}${lang === 'en' ? '/en' : ''}/${product}/setup`);
    await page.getByRole('heading', { name: lang === 'en' ? 'Set up your workspace' : 'إعداد مساحة عملك' }).waitFor();
    // Wait for the lazily loaded step content, not a fixed delay: axe must scan the settled page.
    await page.locator('.brain-setup').first().waitFor();
    // Ascend is set up in its dashboard: the Catalyst page no longer points to an Ascend setup.
    assert.equal(await page.getByText(/Ascend/).count(), 0, `${lang}/${width} Ascend link`);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content').then(x => x.includes('noindex')), true);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${product}/${lang}/${width} overflow`);
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), [], `${product}/${lang}/${width} accessibility`);
    assert.deepEqual(errors, []);
    await page.keyboard.press('Tab'); assert(await page.evaluate(() => document.activeElement !== document.body));
    checks++; await context.close();
  }
  // The Ascend setup pages are gone (production redirects them to the dashboard in vercel.json).
  for (const path of ['/ascend/setup', '/en/ascend/setup']) {
    const page = await browser.newPage();
    await page.route('**/api/**', route => route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } }));
    await page.goto(`${base}${path}`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('heading', { name: /Set up your workspace|إعداد مساحة عملك/ }).count(), 0, `${path} still renders a setup page`);
    assert.equal(await page.getByText(/Live sector|القطاع المتاح/).count(), 0, `${path} still shows the Ascend wizard`);
    checks++; await page.close();
  }
  console.log(`${checks} setup locale/viewport cases passed, including noindex, focus, overflow, accessibility, and no Ascend setup page.`);
} finally { await browser.close(); }
