import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { HASIB_LIVE_PACKS } from '../config/hasib-packs.js';
import { hasibPreviewResponse, dashboardPreviewResponse } from '../api/_lib/hasib/preview.js';

const base = process.argv[2] || 'http://127.0.0.1:5199';
const browser = await chromium.launch();
let checked = 0;
async function open(path, width, access = 200) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], writes = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: status === 200, csrfToken: 'a'.repeat(64), ...data }) });
    if (url.pathname === '/api/access-admin') {
      if (req.method() === 'POST') { writes.push(req.postDataJSON()); return reply({ email: req.postDataJSON().email, plan: req.postDataJSON().plan, status: 'active', hasAccount: false }); }
      // The 2026-10-07 mix-up: the signed-in address revoked, a near-identical one with no account granted.
      return reply(access === 200 ? { grants: [{ email: 'owner1100@example.com', plan: 'ascend', status: 'active', grantedAt: 1, packId: 'real-estate', note: '', hasAccount: false }],
        revoked: [{ email: 'owner@example.com', plan: 'catalyst', status: 'revoked', grantedAt: 1, revokedAt: 2, note: '', hasAccount: true }] } : { reason: access === 401 ? 'sign_in_required' : 'admin_required' }, access);
    }
    if (url.pathname === '/api/auth-session') return reply({ account: access === 401 ? null : { email: access === 200 ? ' AHMED@BZNSFLOWAI.COM ' : 'other@example.com' } });
    const body = req.postDataJSON(), surface = url.searchParams.get('surface');
    const pack = body?.previewIndustry || url.searchParams.get('previewIndustry');
    if (!pack) return reply({ reason: 'setup_required' }, 409);
    try {
      return reply(surface === 'hasib' ? hasibPreviewResponse(pack, body?.action || 'overview') : dashboardPreviewResponse(pack, body?.action || 'overview'));
    } catch (e) { writes.push(body?.action); return reply({ reason: e.code }, e.status); }
  });
  await page.goto(base + path);
  return { page, context, errors, writes };
}
try {
  for (const status of [401, 403, 503]) for (const path of ['/en/owner', '/en/owner/access']) {
    const { page, context } = await open(path, 320, status);
    await page.getByRole('status').filter({ hasText: /Sign in|cannot|Could not/ }).waitFor();
    assert.equal(await page.locator('form').count(), 0);
    assert.equal(await page.locator('a[href*="/owner/preview/"]').count(), 0);
    await context.close(); checked++;
  }
  // The Arabic access page is right-to-left with Arabic labels.
  {
    const { page, context, errors } = await open('/owner/access', 375);
    await page.getByRole('heading', { name: 'صلاحيات المنتجات' }).waitFor();
    assert.equal(await page.locator('main').getAttribute('dir'), 'rtl');
    await page.getByText('لا يوجد حساب بهذا البريد بعد').waitFor();
    assert.deepEqual(errors, []); await context.close(); checked++;
  }
  // Access page: an address nobody signs in with is flagged, and a revoked address stays one press away.
  for (const width of [320, 1280]) {
    const { page, context, errors, writes } = await open('/en/owner/access', width);
    await page.getByText('No account with this email yet').waitFor();
    await page.getByRole('heading', { name: 'Revoked' }).waitFor();
    await page.getByRole('button', { name: 'Grant again' }).click();
    await page.getByText(/no account uses this address yet/).waitFor();
    assert.deepEqual(writes.at(-1), { email: 'owner@example.com', plan: 'catalyst' });
    const issues = (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact));
    assert.deepEqual(issues.map(v => v.id), [], `access page ${width} accessibility`);
    assert.deepEqual(errors, []); await context.close(); checked++;
  }
  for (const lang of ['en', 'ar']) {
    const prefix = lang === 'en' ? '/en' : '';
    const home = await open(`${prefix}/owner`, 320);
    await home.page.locator('.owner-cards a').first().waitFor();
    assert.equal(await home.page.locator('.owner-cards a').count(), 6);
    assert.equal(await home.page.locator('a[href*="clinic"]').count(), 0);
    assert.equal(await home.page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow');
    assert.deepEqual(home.errors, []); await home.context.close(); checked++;
    for (const pack of HASIB_LIVE_PACKS) for (const width of [320, 768, 1440]) {
      const { page, context, errors, writes } = await open(`${prefix}/owner/preview/${pack}?tab=today`, width);
      await page.locator('.hb-preview-banner').waitFor();
      await page.locator('.ld-main .ld-state[role="status"]').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${pack} ${lang} ${width} overflow`);
      const issues = (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['serious','critical'].includes(v.impact));
      assert.deepEqual(issues.map(v => v.id), [], `${pack} ${lang} ${width} accessibility`);
      for (const tab of ['orders', 'stock', 'money', 'team', 'settings']) {
        const link = page.locator(`.ld-nav a[href*="tab=${tab}"]`);
        if (!(await link.count())) continue;
        if (width <= 768) await page.locator('.ld-nav-trigger').click();
        await page.locator(`.ld-nav a[href*="tab=${tab}"]:visible`).click(); await page.waitForTimeout(100);
        await page.locator('.ld-main .ld-state[role="status"]').waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${pack} ${lang} ${width} ${tab} overflow`);
      }
      assert.deepEqual(errors, [], `${pack} ${lang} ${width} errors`);
      assert.deepEqual(writes, [], `${pack} ${lang} ${width} unexpected preview operation`);
      await context.close(); checked++;
    }
  }
  console.log(`Owner browser: ${checked} authorization and bilingual viewport cases passed`);
} finally { await browser.close(); }
