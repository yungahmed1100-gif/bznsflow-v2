// Scenario rehearsal for Layla's switches, in English and Arabic on a phone and a desktop.
// Synthetic API only: every request is answered here and nothing leaves the machine.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = 'work/layla-switch-browser';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let checks = 0;
const ok = () => { checks++; };

// One business's channels, as the server would hold them.
function world({ whatsapp = null, instagram = null, role = 'manager', refuse = {}, unhealthy = false } = {}) {
  const w = { whatsapp, instagram, role, refuse, calls: [], slowNextOverview: false };
  const reply = ch => ch ? { available: ch.available !== false, active: !!ch.active, reason: ch.active ? '' : (ch.reason || 'owner_paused') } : null;
  w.overview = () => ({
    connected: true, business: { name: 'Qurum Coast' }, plan: 'catalyst', workspaceRole: w.role, timezone: 'Asia/Muscat',
    capabilities: { chats: true, customers: true, broadcasts: true, imports: true },
    qualification: { fields: [] }, handoffsOpen: 0, migrationPending: false,
    integration: w.whatsapp ? { sender: '96890000000', path: 'coexistence', status: 'connected', checks: { routing: !unhealthy, registered: true, path: true }, checkedAt: Date.now() } : null,
    messaging: reply(w.whatsapp) || { available: true, active: false, reason: 'not_activated' },
    instagram: w.instagram ? { channel: 'instagram', username: 'qurum.coast', status: 'connected' } : null,
    instagramMessaging: reply(w.instagram),
  });
  w.reply = reply;
  return w;
}

async function open(w, { lang, width, path }) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== BASE) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const surface = url.searchParams.get('surface'), body = route.request().postDataJSON() || {};
    const json = value => route.fulfill({ json: { ok: true, csrfToken: 'a'.repeat(64), ...value } });
    if (url.pathname !== '/api/layla-meta') return route.fulfill({ status: 404, json: { ok: false } });
    if (surface === 'dashboard') {
      if (body.action) return json({ items: [], cursor: null });
      // Snapshot now: a slow poll answers with the state from when it left, like a real one.
      const snapshot = w.overview();
      if (w.slowNextOverview) { w.slowNextOverview = false; await new Promise(r => setTimeout(r, 1500)); }
      return json(snapshot);
    }
    if (surface === 'messaging') {
      const id = body.channel === 'instagram' || url.searchParams.get('channel') === 'instagram' ? 'instagram' : 'whatsapp';
      const channel = w[id];
      if (route.request().method() === 'POST') {
        w.calls.push({ action: body.action, channel: id });
        if (body.action === 'activate' && w.refuse[id]) return route.fulfill({ status: 409, json: { ok: false, reason: w.refuse[id] } });
        if (channel && channel.available !== false) channel.active = body.action === 'activate';
      }
      return json(w.reply(channel) || {});
    }
    if (surface === 'instagram') {
      const channel = w.instagram;
      return json({ connection: channel ? { username: 'qurum.coast', status: 'connected' } : null, pendingSignIn: false,
        active: !!channel?.active, reason: channel ? w.reply(channel).reason : null, sendingEnabled: channel?.available !== false });
    }
    return json({});
  });
  await page.goto(`${BASE}${lang === 'en' ? '/en' : ''}${path}`);
  return { context, page, errors };
}

async function settled(page, label, include = '.ld') {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal overflow`); ok();
  const violations = (await new AxeBuilder({ page }).include(include).analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact));
  assert.deepEqual(violations.map(v => v.id), [], `${label}: accessibility`); ok();
}

const T = (lang, en, ar) => (lang === 'en' ? en : ar);
const header = page => page.locator('.ld-header');

try {
  for (const lang of ['en', 'ar']) for (const width of [375, 1280]) {
    const tag = `${lang}-${width}`;

    // 1. Instagram-only owner: the header has a real switch, and the card agrees with it.
    {
      const w = world({ instagram: { active: false } });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard?tab=settings&view=channels' });
      const master = header(page).getByRole('switch');
      await master.waitFor();
      assert.equal(await master.isChecked(), false, `${tag}: paused at start`); ok();
      assert.equal(await header(page).getByText(T(lang, 'Connect a channel', 'اربط قناة')).count(), 0, `${tag}: no connect prompt`); ok();
      await master.click();
      const card = page.locator('section[aria-label="Instagram"]').getByRole('switch');
      await page.waitForFunction(() => document.querySelector('section[aria-label="Instagram"] [role=switch]')?.checked === true);
      assert.equal(await master.isChecked(), true); ok();
      assert.equal(await card.isChecked(), true, `${tag}: card follows the header`); ok();
      assert.deepEqual(w.calls.at(-1), { action: 'activate', channel: 'instagram' }); ok();
      await settled(page, `${tag} instagram-only`);
      await page.screenshot({ path: `${OUT}/${tag}-instagram-only.png` });
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 2. Both channels, one paused: the header says so, and the master switch turns both off.
    {
      const w = world({ whatsapp: { active: false, reason: 'owner_paused' }, instagram: { active: true } });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard' });
      const master = header(page).getByRole('switch');
      await master.waitFor();
      if (width >= 768) { await header(page).getByText(T(lang, 'On for Instagram · paused on WhatsApp', 'تعمل على إنستغرام · متوقفة على واتساب')).waitFor(); ok(); }
      assert.equal(await master.isChecked(), true); ok();
      await master.click();
      await page.waitForFunction(() => document.querySelector('.ld-header [role=switch]')?.checked === false);
      assert.deepEqual(w.calls.map(c => `${c.action}:${c.channel}`).sort(), ['pause:instagram', 'pause:whatsapp']); ok();
      await page.screenshot({ path: `${OUT}/${tag}-mixed-off.png` });
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 3. Instagram refuses: the knob returns and the reason is Instagram's, not WhatsApp's.
    {
      const w = world({ instagram: { active: false }, refuse: { instagram: 'instagram_rate_limited' } });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard?tab=settings&view=channels' });
      const card = page.locator('section[aria-label="Instagram"]');
      await card.getByRole('switch').click();
      await card.getByText(T(lang, 'Meta is limiting how often BznsFlow can check Instagram', 'تحدّ Meta من عدد مرات فحص إنستغرام'), { exact: false }).waitFor(); ok();
      assert.equal(await card.getByRole('switch').isChecked(), false, `${tag}: knob moved back`); ok();
      assert.equal(await page.getByText(T(lang, 'WhatsApp connection needs attention', 'اتصال واتساب يحتاج مراجعة'), { exact: false }).count(), 0); ok();
      // The master switch names the channel that refused, too.
      await header(page).getByRole('switch').click();
      await header(page).getByText(T(lang, 'Meta is limiting how often BznsFlow can check Instagram', 'تحدّ Meta من عدد مرات فحص إنستغرام'), { exact: false }).waitFor(); ok();
      await settled(page, `${tag} refused`);
      await page.screenshot({ path: `${OUT}/${tag}-instagram-refused.png` });
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 4. Messaging switched off for everyone: nothing to toggle, and the reason is shown.
    {
      const w = world({ whatsapp: { active: false, available: false, reason: 'messaging_unavailable' }, instagram: { active: false, available: false, reason: 'messaging_unavailable' } });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard?tab=settings&view=channels' });
      const master = header(page).getByRole('switch');
      await master.waitFor();
      assert.equal(await master.isDisabled(), true, `${tag}: master disabled`); ok();
      for (const name of ['WhatsApp', 'Instagram']) { assert.equal(await page.locator(`section[aria-label="${name}"]`).getByRole('switch').isDisabled(), true, `${tag}: ${name} disabled`); ok(); }
      assert.ok(await header(page).locator('.ld-switch-note').count() >= 1, `${tag}: reason shown`); ok();
      assert.equal(await page.getByText(T(lang, 'needs attention', 'يحتاج مراجعة'), { exact: false }).count(), 0, `${tag}: no false alarm`); ok();
      await page.screenshot({ path: `${OUT}/${tag}-unavailable.png` });
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 5. A poll that left before the toggle must not win: the knob ends on the server's new state.
    {
      const w = world({ whatsapp: { active: true } });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard' });
      const master = header(page).getByRole('switch');
      await master.waitFor();
      w.slowNextOverview = true;
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await page.waitForTimeout(100);
      await master.click();
      await page.waitForTimeout(2500);
      assert.equal(await master.isChecked(), false, `${tag}: no snap back to the stale state`); ok();
      assert.equal(w.whatsapp.active, false); ok();
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 6. The health signal opens Settings → Channels inside the app, without reloading it.
    //    Phones hide the all-clear to save room, so they are tested with a problem, which always shows.
    {
      const w = world({ whatsapp: { active: true }, unhealthy: width < 1024 });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard' });
      await header(page).getByRole('switch').waitFor();
      await page.evaluate(() => { window.__sameDocument = true; });
      if (width < 1024) { await header(page).getByText(T(lang, 'WhatsApp needs attention', 'واتساب يحتاج مراجعة')).waitFor(); ok(); }
      await header(page).locator('a.ld-health').click();
      await page.locator('section[aria-label="WhatsApp"]').getByRole('switch').waitFor(); ok();
      assert.match(page.url(), /tab=settings/); assert.match(page.url(), /view=channels/); ok();
      assert.equal(await page.evaluate(() => window.__sameDocument === true), true, `${tag}: no full reload`); ok();
      assert.deepEqual(errors, []); ok();
      await context.close();
    }

    // 7. An employee sees whether Layla is replying but cannot switch her.
    {
      const w = world({ whatsapp: { active: true }, role: 'employee' });
      const { context, page, errors } = await open(w, { lang, width, path: '/layla/dashboard' });
      await header(page).locator('.ld-layla.is-on').getByText(T(lang, 'Layla is replying', 'ليلى ترد الآن')).waitFor(); ok();
      assert.equal(await header(page).getByRole('switch').count(), 0); ok();
      assert.equal(await header(page).locator('a.ld-health').count(), 0, `${tag}: health is text`); ok();
      assert.deepEqual(errors, []); ok();
      await context.close();
    }
  }

  // 8. Opening setup never rewrites saved progress before the saved setup has loaded.
  for (const lang of ['en', 'ar']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    let progress = { product: 'catalyst', step: 1, completed: false, version: 3 };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const body = route.request().postDataJSON();
      const json = value => route.fulfill({ json: { ok: true, csrfToken: 'a'.repeat(64), ...value } });
      if (url.pathname === '/api/product-setup') {
        if (body) { writes.push(body.step); progress = { ...progress, step: body.step, version: progress.version + 1 }; }
        return json({ progress, settings: null, workspaceReady: true });
      }
      const surface = url.searchParams.get('surface');
      if (surface === 'customer') {
        await new Promise(r => setTimeout(r, 800)); // the saved setup arrives after the shell
        return json({ available: true, account: { email: 'owner@example.test' }, savedToAccount: true, accountSaveAvailable: true, journeyStep: 1, profileVersion: 1,
          status: 'business_saved', integration: null, profile: { businessName: 'Qurum Coast', sector: 'Real estate', services: 'Rentals', prices: '', hours: '', location: '', humanContact: '', handoffMode: 'inbox', faqs: [], reviewed: true } });
      }
      if (surface === 'instagram') return json({ connection: null, pendingSignIn: false, active: false, sendingEnabled: true });
      return json({});
    });
    await page.goto(`${BASE}${lang === 'en' ? '/en' : ''}/catalyst/setup`);
    await page.getByRole('heading', { name: T(lang, 'Connect a channel', 'اربط قناة'), level: 2 }).waitFor(); ok();
    await page.waitForTimeout(800);
    assert.deepEqual(writes, [], `${lang}: no progress write on load (got ${JSON.stringify(writes)})`); ok();
    assert.equal(await page.locator('.setup-steps li[aria-current=step]').innerText().then(t => t.includes(T(lang, 'Connect a channel', 'اربط قناة'))), true); ok();
    assert.deepEqual(errors, []); ok();
    await context.close();
  }
  console.log(`Layla switch browser: ${checks} scenario checks passed (Instagram-only, mixed, refused, unavailable, stale poll, health link, employee, setup load; English/Arabic, 375/1280).`);
} finally { await browser.close(); }
