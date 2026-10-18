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
  // A signed-in account without a plan: the work is saved and the next step is choosing a Catalyst plan, never "Sign in" again.
  for (const lang of ['en', 'ar']) {
    const page = await browser.newPage();
    await page.route('**/api/**', route => route.fulfill(new URL(route.request().url()).pathname === '/api/product-setup'
      ? { status: 403, json: { ok: false, reason: 'access_required' } } : { json: { ok: true, csrfToken: 'a'.repeat(64), account: { email: 'owner@example.test' } } }));
    await page.goto(`${base}${lang === 'en' ? '/en' : ''}/catalyst/setup`);
    const box = page.locator('.setup-error');
    await box.waitFor();
    assert.match(await box.innerText(), lang === 'en' ? /Your setup is saved\. Choose a Catalyst plan to switch Layla on\./ : /تم حفظ إعدادك/, `${lang}: the saved-work message`);
    const plans = box.getByRole('link', { name: lang === 'en' ? 'Choose a plan' : 'اختر خطة' });
    assert.equal(await plans.count(), 1, `${lang}: one next action, choosing a plan`);
    assert.equal(await plans.getAttribute('href'), lang === 'en' ? '/en' : '/', `${lang}: the plan cards`);
    assert.equal(await box.getByRole('link', { name: /^(Sign in|تسجيل الدخول)$/ }).count(), 0, `${lang}: no Sign in link for someone already signed in`);
    checks++; await page.close();
  }
  // Signing in part-way keeps the owner where they were: one setup, never rebuilt from step 1, no page load.
  for (const lang of ['en', 'ar']) {
    const en = lang === 'en';
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let signedIn = false, claimed = false, loads = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) loads++; });
    const customer = () => ({ ok: true, csrfToken: 'a'.repeat(64), available: true, accountSaveAvailable: true, journeyStep: 4, profileVersion: 1,
      profile: { businessName: 'Blue Studio', sector: 'other', reviewed: true, humanContact: 'team@example.test' }, savedToAccount: claimed,
      account: signedIn ? { email: 'owner@example.test', industry: 'other' } : null, status: 'business_saved', integration: null,
      bzns: { markdown: '---\nname: Blue Studio\nsector: other\n---\n', version: 1, publishedRevision: 1, unpublishedChanges: false } });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), body = route.request().postDataJSON();
      if (url.pathname === '/api/product-setup') return route.fulfill(signedIn
        ? { json: { ok: true, csrfToken: 'a'.repeat(64), progress: { product: 'catalyst', step: 1, completed: false, version: 1 }, settings: null, workspaceReady: claimed } }
        : { status: 401, json: { ok: false, reason: 'sign_in_required' } });
      if (url.pathname === '/api/auth-code') return route.fulfill({ json: { ok: true } });
      if (url.pathname === '/api/auth-session') { if (route.request().method() === 'POST') signedIn = true; return route.fulfill({ json: { ok: true, csrfToken: 'b'.repeat(64) } }); }
      if (url.searchParams.get('surface') === 'customer') { if (body?.action === 'claim_draft') claimed = true; return route.fulfill({ json: customer() }); }
      return route.fulfill({ json: { ok: true, csrfToken: 'a'.repeat(64), available: false } });
    });
    await page.goto(`${base}${en ? '/en' : ''}/catalyst/setup`);
    const panel = page.getByRole('heading', { name: en ? 'Save your setup to connect channels' : 'احفظ إعدادك لربط القنوات' });
    await panel.waitFor();
    // Mark the mounted setup and watch for the loading line, so a rebuild cannot pass unnoticed.
    await page.evaluate(() => {
      document.querySelector('.layla-customer').dataset.mounted = 'first';
      window.__loadingSeen = false;
      new MutationObserver(() => { if (/Loading saved setup|جارٍ تحميل الإعداد المحفوظ/.test(document.body.innerText)) window.__loadingSeen = true; }).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    const loadsBefore = loads;
    await page.getByLabel(en ? 'Email address' : 'البريد الإلكتروني').fill('owner@example.test');
    await page.getByRole('button', { name: en ? 'Email me a sign-in code' : 'أرسل رمز الدخول إلى بريدي' }).click();
    await page.getByLabel(en ? 'Six-digit email sign-in code' : 'رمز الدخول من البريد — ستة أرقام').fill('123456');
    await page.getByRole('button', { name: en ? 'Verify and save' : 'تحقق واحفظ' }).click();
    await panel.waitFor({ state: 'detached' });
    await page.getByText(en ? 'Saved to your account' : 'محفوظ في حسابك').first().waitFor();
    assert.equal(claimed, true, `${lang}: the browser draft is attached to the account`);
    assert.equal(await page.getByRole('heading', { name: en ? 'Connect a channel' : 'اربط قناة', level: 2 }).count(), 1, `${lang}: still on the channels step`);
    assert.equal(await page.locator('.layla-customer').getAttribute('data-mounted'), 'first', `${lang}: the setup was not rebuilt`);
    assert.equal(await page.evaluate(() => window.__loadingSeen), false, `${lang}: no loading screen after signing in`);
    assert.equal(loads, loadsBefore, `${lang}: signing in did not load the page again`);
    assert.deepEqual(errors, []);
    checks++; await context.close();
  }
  console.log(`${checks} setup locale/viewport cases passed, including noindex, focus, overflow, accessibility, no Ascend setup page, the no-grant next step and signing in without a rebuild.`);
} finally { await browser.close(); }
