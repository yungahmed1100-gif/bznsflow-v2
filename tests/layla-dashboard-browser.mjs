// Browser checks for the owner dashboard and activation hand-off.
// Usage: npm run dev -- --port 5199 & node tests/layla-dashboard-browser.mjs http://127.0.0.1:5199
// All API responses are synthetic and every non-local request is aborted.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { hasibPack, industryCatalog, visibleModules } from '../config/hasib-packs.js';
import { capabilitiesFor } from '../convex/hasib/capabilities.js';
import { resolveParameters, recipientValueMap } from '../config/layla-templates.js';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = process.env.LAYLA_BROWSER_OUT || 'work/layla-dashboard-browser';
await mkdir(OUT, { recursive: true });
const HOUR = 3600000, now = Date.now();
const pack = { id: 'real-estate', archetype: 'project', sensitive: false, fields: [
  { key: 'need', kind: 'enum', en: 'Need', ar: 'الاحتياج', required: true, options: [{ id: 'rent', en: 'Rent', ar: 'إيجار' }, { id: 'buy', en: 'Buy', ar: 'شراء' }] },
  { key: 'area', kind: 'area', en: 'Area', ar: 'المنطقة', required: true, options: [] },
  { key: 'budget', kind: 'budget', en: 'Budget', ar: 'الميزانية', required: true, options: [] }] };

function fixture() {
  const contact = (id, name, number, extra = {}) => ({ id, name, nameSource: name.startsWith('+') ? 'number' : 'whatsapp', number, ownerName: '', customerName: '', profileName: name, source: 'inbound', sectorId: 'real-estate',
    fields: [{ key: 'need', value: 'rent', source: 'customer', confidence: 0.9, at: now }], qualificationStatus: 'in_progress', qualificationOverride: null, status: 'in_progress',
    consent: { status: 'unknown', source: '', date: '', purpose: '' }, optout: false, lastActivityAt: now - HOUR, lastInboundAt: now - HOUR, takeover: false, conversationId: `c-${id}`, windowOpenUntil: now + 23 * HOUR, ...extra });
  const contacts = [
    contact('k1', 'Aisha Al Balushi', '96891234567'),
    contact('k2', 'محمد الحارثي', '96892345678', { lastInboundAt: now - 30 * HOUR, windowOpenUntil: now - 6 * HOUR, consent: { status: 'granted', source: 'Store form', date: '2026-09-01', purpose: 'Offers' } }),
    contact('k3', '+971501234567', '971501234567', { nameSource: 'number', status: 'qualified', qualificationStatus: 'qualified', optout: true }),
  ];
  const messages = {
    'c-k1': [{ id: 'm1', direction: 'in', text: 'Do you have villas for rent in Seeb?', status: 'received', at: now - 2 * HOUR }, { id: 'm2', direction: 'out', text: 'Yes — villas from 500 OMR.\n\nTo help you further, could you share your approximate budget?', status: 'read', at: now - 2 * HOUR + 5000 },
      { id: 'm3', direction: 'in', text: null, textExpired: true, status: 'received', at: now - 40 * 86400000 }],
    'c-k2': [{ id: 'm4', direction: 'in', text: 'كم سعر الشقة في الموالح؟', status: 'received', at: now - 30 * HOUR }, { id: 'm5', direction: 'template', templateName: 'autumn_offer', text: 'Hello محمد, enjoy 10% off.', status: 'failed', errorCode: 131049, at: now - 29 * HOUR }],
    'c-k3': [{ id: 'm6', direction: 'in', text: 'stop', status: 'received', at: now - 3 * HOUR }],
  };
  return { contacts, messages, campaigns: [], calls: [], bodies: [], takeover: {}, imported: new Map() };
}

function api(state, { overviewStatus = 200, overviewReason, founderPreview = false, broadcastEnabled = true, plan = 'ascend', connected = true } = {}) {
  // The real overview always carries the plan's capabilities (convex/blueDashboardState.js); this owner is on Ascend unless a test says otherwise.
  const overview = { ok: true, csrfToken: 'a'.repeat(64), account: { email: 'owner@example.test' }, plan, workspaceRole: 'manager', capabilities: capabilitiesFor(plan), dashboardAvailable: true, broadcastEnabled, connected,
    founderPreview,
    business: { name: 'Blue Studio Properties', sector: 'Real estate', sectorId: 'real-estate' }, integration: { sender: '96890000000', path: 'new_number', status: 'connected', checks: { routing: true, registered: true, path: true }, checkedAt: now },
    messaging: { available: true, active: true, reason: '', broadcastAvailable: true, limits: { perMinute: 10, perDay: 100, usedToday: 7 } }, timezone: 'Asia/Muscat', migrationPending: false, qualification: pack };
  const template = { id: '111', name: 'autumn_offer', language: 'en', category: 'MARKETING', status: 'APPROVED', parameterFormat: 'positional', header: null, body: 'Hello {{1}}, enjoy {{2}} off this week.', footer: 'Tap Stop promotions to opt out',
    buttons: [], variables: [{ key: '1', component: 'body', example: 'Sara' }, { key: '2', component: 'body', example: '10%' }], sendable: true, unsupportedReason: null, syncedAt: now };
  const item = c => ({ id: c.conversationId, contact: { ...c, takeover: !!state.takeover[c.conversationId] }, lastMessage: (m => m && { direction: m.direction, text: m.text, status: m.status, at: m.at })(state.messages[c.conversationId].filter(x => x.text).at(-1)),
    updatedAt: c.lastActivityAt, takeover: !!state.takeover[c.conversationId], optout: c.optout, windowOpenUntil: c.windowOpenUntil });
  return async (surface, method, body) => {
    state.calls.push({ surface, method, action: body?.action });
    if (body?.action) state.bodies.push(body);
    const ok = value => ({ status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), ...value } });
    if (surface === 'dashboard' && method === 'GET') return overviewStatus === 200 ? { status: 200, json: overview } : { status: overviewStatus, json: { ok: false, reason: overviewReason } };
    if (surface === 'messaging') {
      if (['takeover', 'resume_conversation'].includes(body?.action)) state.takeover[body.conversationId] = body.action === 'takeover';
      return ok({ available: true, active: true, reason: '', limits: { usedToday: 7 } });
    }
    switch (body?.action) {
      case 'takeover_handoff': state.takeover[body.conversationId] = true; return ok({});
      case 'return_handoff': state.takeover[body.conversationId] = false; return ok({});
      case 'resolve_handoff': return ok({});
      case 'handoffs': return ok({ items: [], cursor: null });
      case 'conversations': return ok({ items: state.contacts.filter(c => !body.search || c.name.includes(body.search) || c.number.includes(body.search)).map(item), cursor: null });
      case 'thread': { const c = state.contacts.find(x => x.conversationId === body.conversationId);
        return ok({ contact: c, conversation: { id: c.conversationId, takeover: !!state.takeover[c.conversationId], optout: c.optout, windowOpenUntil: c.windowOpenUntil }, messages: state.messages[c.conversationId], before: null }); }
      case 'contacts': return ok({ items: state.contacts.map(c => ({ ...c, takeover: !!state.takeover[c.conversationId] })), cursor: null, migrationPending: false, qualification: pack });
      case 'templates': return ok({ templates: [template], syncedAt: now, broadcastAvailable: true });
      case 'campaigns': return ok({ items: state.campaigns, cursor: null });
      case 'campaign_detail': return ok({ campaign: state.campaigns.find(c => c.id === body.campaignId) });
      case 'import_contacts': {
        // Imported numbers become consented contacts; the wizard maps them back by number.
        const contacts = body.rows.map(r => ({ id: `n${r.waId}`, number: r.waId, name: r.name || `+${r.waId}`, consent: { status: body.consent?.attested ? 'granted' : 'unknown' } }));
        for (const c of contacts) state.imported.set(c.id, c);
        return ok({ created: contacts.length, updated: 0, contacts });
      }
      case 'campaign_preview': {
        // The same resolver Convex uses, so the per-contact preview is what would be frozen.
        const own = recipientValueMap(body.values);
        const known = id => state.imported.get(id) || state.contacts.find(c => c.id === id);
        const eligible = [], excluded = [];
        for (const id of body.contactIds) {
          const c = known(id), granted = c?.consent?.status === 'granted' && !c.optout;
          const { parameters, missing } = resolveParameters(template, body.mapping, c, own.get(id));
          if (!granted || missing.length) excluded.push({ contactId: id, name: c?.name || '', number: c ? `+${c.number}` : '', reason: granted ? 'missing_variable' : 'consent_unknown' });
          else eligible.push({ contactId: id, name: c.name, number: `+${c.number}`, parameters });
        }
        return ok({ eligible, excluded, cap: 100, allowance: 250, maxRecipients: 100, sendingAvailable: broadcastEnabled });
      }
      case 'campaign_create': state.campaigns.push({ id: 'camp1', name: 'autumn_offer', origin: 'broadcast', status: 'scheduled', reason: null, template: { name: 'autumn_offer', language: 'en', body: template.body }, scheduledAt: now + HOUR, timezone: 'Asia/Muscat', recipientCount: 1, createdAt: now, counts: { submitted: 0, sent: 0, delivered: 0, read: 0, failed: 0 } });
        return ok({ campaign: state.campaigns[0] });
      default: return { status: 400, json: { ok: false, reason: 'invalid_action' } };
    }
  };
}

function hasibOverview(packId, preview = false) {
  const value = hasibPack(packId), industry = industryCatalog().find(row => row.id === packId);
  return { ok: true, csrfToken: 'a'.repeat(64), preview, readOnly: preview, synthetic: preview, setupRequired: false, selectedIndustryId: packId, industry,
    pack: { id: value.id, archetype: value.archetype, version: value.version, ownerUi: value.ownerUi, todayMetrics: value.todayMetrics, thresholds: value.thresholds,
      variantOptions: value.variantOptions, orderFields: value.orderFields, expenseCategories: value.expenseCategories, modules: value.modules },
    livePacks: industryCatalog().filter(row => row.live), industries: industryCatalog(), modules: visibleModules(value),
    settings: { currency: 'OMR', vatRegistered: false, vatRateBps: 500, pricesIncludeVat: false, stockPolicy: 'warn', unsoldDays: 60, absenceDays: 14 },
    workspaceRole: packId === 'real-estate' ? 'manager' : undefined,
    teamSummary: packId === 'real-estate' ? { members: 0, pending: 0, limit: 5 } : undefined,
    capabilities: packId === 'real-estate' ? { hasib: true, realEstate: true, money: true, insights: true, approvals: true, team: true, settings: true, imports: true, exports: true } : undefined,
    counts: { pendingOrders: 0, lowStock: 0, laylaWaiting: 0, laylaOverdue: 0 } };
}

async function openPage(browser, { width, lang = 'en', path, handler, extra, authEmail = null, authAccount = null }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let resolveAuthSession;
  const authSessionDone = new Promise(resolve => { resolveAuthSession = resolve; });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (url.pathname === '/api/layla-meta') {
      const surface = url.searchParams.get('surface');
      const response = extra?.(surface, route.request()) || await handler(surface, route.request().method(), route.request().postDataJSON());
      return route.fulfill({ status: response.status, json: response.json });
    }
    if (url.pathname === '/api/auth-session') {
      await route.fulfill({ status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), account: authAccount || (authEmail ? { email: authEmail } : null) } });
      resolveAuthSession();
      return;
    }
    if (url.pathname === '/api/product-setup' || url.pathname === '/api/knowledge') return route.fulfill({ status: 401, json: { reason: 'sign_in_required' } });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}${path}`);
  return { page, context, authSessionDone };
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async page => (await new AxeBuilder({ page }).include('.ld').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

const browser = await chromium.launch();
let count = 0;
try {
  // A Catalyst workspace with no channel yet says what to do instead of loading forever.
  for (const lang of ['en', 'ar']) {
    const { page, context } = await openPage(browser, { width: 1280, lang, path: '/layla/dashboard', handler: api(fixture(), { plan: 'catalyst', connected: false }) });
    const empty = page.locator('.ld-empty-channel');
    await empty.waitFor();
    assert.equal(await empty.getByRole('link', { name: lang === 'en' ? 'Connect a channel' : 'اربط قناة' }).getAttribute('href'), lang === 'en' ? '/en/catalyst/setup' : '/catalyst/setup'); count++;
    assert.equal(await page.locator('.ld-main [role=status]', { hasText: /^(Loading…|جارٍ التحميل…)$/ }).count(), 0, `${lang}: no endless loading line`); count++;
    await context.close();
  }
  // An empty inbox shows the one thing to try now.
  {
    const { page, context } = await openPage(browser, { width: 1280, path: '/layla/dashboard', handler: api({ ...fixture(), contacts: [], messages: {} }, { plan: 'catalyst' }) });
    await page.getByText('Try it now: send your number a message from another phone to see Layla answer.', { exact: false }).waitFor(); count++;
    await context.close();
  }

  // Direct visits: unsigned owners go through sign-in, accounts without a number go to setup.
  for (const [reason, expected] of [['sign_in_required', /\/en\/catalyst\/setup\?next=dashboard$/], ['setup_required', /\/en\/catalyst\/setup$/]]) {
    const { page, context } = await openPage(browser, { width: 1280, path: '/layla/dashboard', handler: api(fixture(), { overviewStatus: reason === 'sign_in_required' ? 401 : 409, overviewReason: reason }) });
    await page.waitForURL(expected); count++;
    if (reason === 'sign_in_required') {
      // A returning owner can sign in straight back to the dashboard.
      const signIn = page.locator('.setup-signin a');
      await signIn.waitFor();
      assert.equal(await signIn.getAttribute('href'), `/en/signin?next=${encodeURIComponent('/en/layla/dashboard')}`); count++;
    }
    await context.close();
  }

  // The owner access shortcut is rendered only for Ahmed's authenticated account.
  for (const [email, expected] of [['Ahmed@BznsFlowAI.com', 1], ['other@example.test', 0], [null, 0]]) {
    const { page, context, authSessionDone } = await openPage(browser, { width: 1280, path: '/layla/dashboard', handler: api(fixture()), authEmail: email });
    await page.waitForSelector('.ld-top .ld-brand');
    await authSessionDone;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const shortcut = page.locator('.ld-owner-access');
    assert.equal(await shortcut.count(), expected);
    if (expected) assert.equal(await shortcut.getAttribute('href'), '/en/owner');
    count++;
    await context.close();
  }

  // The founder-only selector includes live and preview-only built dashboards.
  // Pending packs are disabled and preview responses contain no customer data.
  for (const lang of ['en', 'ar']) {
    const state = fixture(), handler = api(state, { founderPreview: true });
    const { page, context } = await openPage(browser, { width: 320, lang, path: '/layla/dashboard', handler, extra: (surface, request) => {
      if (surface !== 'hasib') return null;
      const previewId = new URL(request.url()).searchParams.get('previewIndustry');
      if (request.method() === 'GET') return { status: 200, json: hasibOverview(previewId || state.livePack || 'retail', !!previewId) };
      const body = request.postDataJSON();
      if (body.action === 'settings_update') { state.livePack = body.packId; return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), settings: {} } }; }
      if (body.action === 'today') { const packId = body.previewIndustry || state.livePack || 'retail'; return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), synthetic: !!body.previewIndustry, date: '2026-09-28', needsYou: { ordersCount: 0, orders: [], chats: 0, lowStockCount: 0, lowStock: [], repairsReady: 0 }, industryActions: [], industryMetrics: hasibPack(packId).todayMetrics.map(metric => ({ id: metric.id, value: 0, format: 'number', detail: '' })), setup: { products: false, photos: false, services: false } } }; }
      return { status: 403, json: { ok: false, reason: 'preview_read_only' } };
    } });
    const ar = lang === 'ar';
    const selector = page.locator('.hb-founder-preview select');
    await selector.waitFor();
    assert.equal(await selector.locator('option[value="retail-tech"]').count(), 1); count++;
    assert.equal(await selector.locator('option[value="dental"]').count(), 1); count++;
    assert.match(await selector.locator('option[value="retail-tech"]').textContent(), ar ? /مباشر/ : /Live/); count++;
    assert.match(await selector.locator('option[value="dental"]').textContent(), ar ? /مباشر/ : /Live/); count++;
    assert.match(await selector.locator('option[value=""]').textContent(), ar ? /بيانات حقيقية/ : /real data/); count++;
    assert.notEqual(await selector.locator('option[value="travel"]').getAttribute('disabled'), null); count++;
    await selector.selectOption('retail-tech');
    await page.waitForFunction(() => document.querySelector('.hb-founder-preview select')?.value === 'retail-tech');
    await page.getByText(ar ? /معاينة للقراءة فقط/ : /Read-only preview/).first().waitFor(); assert.equal(state.livePack, undefined, 'preview does not change the live sector'); count++;
    await selector.selectOption('dental');
    await page.waitForFunction(() => document.querySelector('.hb-founder-preview select')?.value === 'dental');
    await page.getByText(ar ? /معاينة للقراءة فقط/ : /Read-only preview/).first().waitFor(); assert.equal(state.livePack, undefined, 'preview does not change the live sector'); count++;
    await selector.selectOption('beauty');
    await page.getByText(ar ? /معاينة للقراءة فقط/ : /Read-only preview/).first().waitFor(); count++;
    assert.equal(await noOverflow(page), true); count++;
    await context.close();
  }

  // Every released industry opens its six-tab Work from an old Today link, bilingual, at phone, tablet and desktop sizes.
  for (const packId of ['retail', 'retail-tech', 'dental', 'real-estate', 'construction', 'automotive']) for (const lang of ['en', 'ar']) for (const width of [320, 768, 1440]) {
    const state = fixture(), handler = api(state);
    const { page, context } = await openPage(browser, { width, lang, path: '/layla/dashboard?tab=today', handler, extra: (surface, request) => {
      if (surface !== 'hasib') return null;
      if (request.method() === 'GET') return { status: 200, json: hasibOverview(packId) };
      const body = request.postDataJSON();
      if (body.action === 'today') return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), date: '2026-09-29', needsYou: { ordersCount: 0, orders: [], chats: 0, lowStockCount: 0, lowStock: [], repairsReady: 0 }, industryActions: [], industryMetrics: hasibPack(packId).todayMetrics.map(metric => ({ id: metric.id, value: 0, format: 'number', detail: '' })), setup: { products: false, photos: false, services: false } } };
      if (body.action === 'real_estate_overview') return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), workspaceRole: 'manager', counts: { opportunities: 0, unassigned: 0, slaBreaches: 0, staleListings: 0, todayViewings: 0, tasks: 0 }, pipeline: { new: 0, contacted: 0, qualified: 0, viewing: 0, offer: 0, won: 0, lost: 0 }, listings: { available: 0, reserved: 0, unavailable: 0, verifiedFresh: 0, stale: 0 }, viewings: { today: 0, upcoming: 0, outcomeMissing: 0 }, offers: { draft: 0, approvalPending: 0, active: 0, accepted: 0 }, approvals: { offers: 0, drafts: 0, total: 0 }, tasks: [] } };
      if (body.action === 'real_estate_tasks') return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), items: [] } };
      return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), items: [], members: [], cursor: null, limit: 5 } };
    } });
    if (packId === 'real-estate') {
      // Real Estate is six tabs: an old Today link opens Deals, with what needs attention above the board.
      await page.locator('.hb-attention').waitFor();
      assert.equal(await page.locator('.ld-section-tabs a').count(), 4, `real-estate ${lang} Deals views at ${width}`); count++;
      assert.equal(await page.locator('.ld').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr'); count++;
      assert.equal(await noOverflow(page), true, `real-estate ${lang} no overflow at ${width}`); count++;
      assert.deepEqual(await axe(page), [], `real-estate ${lang} axe at ${width}`); count++;
      await page.getByRole('button', { name: lang === 'ar' ? 'استفسار جديد' : 'New inquiry' }).first().click();
      await page.locator('.hb-action-fields').waitFor(); count++;
      if (width === 320 || width === 1440) await page.screenshot({ path: `${OUT}/live-${packId}-${lang}-${width}.png`, fullPage: true });
      await context.close();
      continue;
    }
    if (packId !== 'real-estate' && packId !== 'dental') {
      // Six tabs since Releases A and B: an old Today link opens Work (Workshop, Projects, Orders or Store & repairs) on its first view.
      const container = { automotive: '.hb-automotive-six', construction: '.hb-construction-six', retail: '.hb-store-six', 'retail-tech': '.hb-store-six' }[packId];
      await page.locator(container).first().waitFor();
      assert.equal(await page.locator('.ld-section-tabs a').count(), packId === 'construction' ? 3 : 4, `${packId} ${lang} Work views at ${width}`); count++;
      assert.equal(await page.locator('.ld').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr'); count++;
      assert.equal(await noOverflow(page), true, `${packId} ${lang} no overflow at ${width}`); count++;
      assert.deepEqual(await axe(page), [], `${packId} ${lang} axe at ${width}`); count++;
      if (width === 320 || width === 1440) await page.screenshot({ path: `${OUT}/live-${packId}-${lang}-${width}.png`, fullPage: true });
      await context.close();
      continue;
    }
    if (packId === 'dental') {
      // Dental is six tabs too: an old Today link opens the Visits day schedule.
      await page.locator('.hb-day-nav').waitFor();
      assert.equal(await page.locator('.ld-section-tabs a').count(), 4, `dental ${lang} Visits views at ${width}`); count++;
      assert.equal(await page.locator('.ld').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr'); count++;
      assert.equal(await noOverflow(page), true, `dental ${lang} no overflow at ${width}`); count++;
      assert.deepEqual(await axe(page), [], `dental ${lang} axe at ${width}`); count++;
      await page.getByRole('button', { name: lang === 'ar' ? 'إضافة زيارة' : 'Add visit' }).first().click();
      await page.locator('.hb-action-fields').waitFor(); count++;
      if (width === 320 || width === 1440) await page.screenshot({ path: `${OUT}/live-${packId}-${lang}-${width}.png`, fullPage: true });
      await context.close();
      continue;
    }
    await context.close();
  }

  for (const width of [1440, 1024, 768, 375, 320]) {
    const state = fixture();
    const { page, context } = await openPage(browser, { width, path: '/layla/dashboard', handler: api(state) });
    await page.getByRole('heading', { name: 'Chats', exact: true }).waitFor();
    assert.equal(await page.locator('.ld-desktop-nav a').allTextContents().then(t => t.join('|')), 'Chats|Customers|Settings'); count++;
    assert.equal(await page.locator('.ld-desktop-nav a[href*="tab=chats"]').getAttribute('aria-current'), 'page'); count++;
    await page.getByRole('button', { name: /Aisha Al Balushi/ }).click();
    await page.getByRole('heading', { name: 'Aisha Al Balushi' }).waitFor();
    const listVisible = await page.locator('.ld-list').isVisible();
    assert.equal(listVisible, width > 768, `list beside thread at ${width}`); count++;
    assert.match(await page.locator('.ld-messages').textContent(), /Text removed after 30 days/); count++;
    await page.getByRole('switch', { name: /Layla is live in this chat/ }).click();
    await page.getByRole('switch', { name: /Layla is stopped in this chat/ }).waitFor();
    assert.ok(state.calls.some(c => c.action === 'takeover_handoff')); count++;
    assert.equal(await noOverflow(page), true, `no horizontal overflow at ${width}`); count++;
    assert.deepEqual(await axe(page), [], `axe at ${width}`); count++;
    await page.screenshot({ path: `${OUT}/chats-en-${width}.png` });
    if (width <= 768) { await page.getByRole('button', { name: 'Back' }).click(); await page.locator('.ld-list').waitFor(); count++; }
    await context.close();
  }

  // Arabic: RTL mirroring, 24-hour window blocking, template action.
  for (const width of [1280, 375]) {
    const state = fixture();
    const { page, context } = await openPage(browser, { width, lang: 'ar', path: '/layla/dashboard?tab=chats&chat=c-k2', handler: api(state) });
    await page.getByRole('heading', { name: 'محمد الحارثي' }).waitFor();
    assert.equal(await page.locator('.ld').getAttribute('dir'), 'rtl'); count++;
    if (width > 768) { const nav = await page.locator('.ld-nav').boundingBox(); assert.ok(nav.x > width / 2, 'rail on the right in RTL'); count++; }
    assert.equal(await page.locator('#ld-reply').count(), 0, 'composer disabled outside 24h'); count++;
    assert.match(await page.locator('.ld-window-closed').textContent(), /انتهت نافذة الرد/); count++;
    assert.match(await page.locator('.ld-messages').textContent(), /131049/); count++;
    assert.deepEqual(await axe(page), []); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/chats-ar-${width}.png` });
    await page.getByRole('button', { name: 'إرسال قالب' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: /autumn_offer/ }).check(); count++;
    await context.close();
  }

  // Contacts and Broadcast wizard.
  {
    const state = fixture();
    const { page, context } = await openPage(browser, { width: 1280, path: '/layla/dashboard?tab=contacts', handler: api(state) });
    await page.getByRole('heading', { name: 'Contacts', exact: true }).waitFor();
    assert.equal(await page.locator('.ld-table tbody tr').count(), 3); count++;
    assert.match(await page.locator('.ld-table').textContent(), /Opted out/); count++;
    assert.deepEqual(await axe(page), []); count++;
    await page.screenshot({ path: `${OUT}/contacts-en-1280.png`, fullPage: true });
    // Contacts and Broadcast now sit under Customers as two views.
    await page.getByRole('navigation', { name: 'Views in this section' }).getByRole('link', { name: 'Message many' }).click();
    await page.getByRole('heading', { name: 'Broadcast', exact: true }).waitFor();
    // No broadcast delivered yet: how to add the Meta payment method, and that BznsFlow doesn't charge for messages.
    const fees = page.getByRole('region', { name: 'Before your first broadcast: add a payment method in Meta' });
    await fees.waitFor(); count++;
    assert.match(await fees.textContent(), /BznsFlow doesn’t charge for messages/); count++;
    for (const [name, href] of [['Open Meta Billing & payments', 'https://business.facebook.com/billing_hub/accounts'], ['Meta’s message prices', 'https://developers.facebook.com/docs/whatsapp/pricing']]) {
      const a = fees.getByRole('link', { name });
      assert.deepEqual([await a.getAttribute('href'), await a.getAttribute('target'), await a.getAttribute('rel')], [href, '_blank', 'noopener noreferrer']); count++;
    }
    await page.getByRole('button', { name: 'New broadcast' }).click();
    const dialog = page.getByRole('dialog');
    // Step 1: template, with its variables shown.
    await dialog.getByRole('radio', { name: /autumn_offer/ }).check();
    assert.equal(await dialog.locator('.ld-var').count(), 2); count++;
    await dialog.getByRole('button', { name: 'Continue' }).click();
    // Step 2: type a number, upload a list, pick a saved contact; each row has its own {{2}}.
    await dialog.getByLabel('Phone number').fill('9111 2222');
    await dialog.getByLabel('Name (optional)').fill('Salim');
    await dialog.getByRole('button', { name: 'Add number' }).click();
    await dialog.getByRole('textbox', { name: '{{2}} · Salim' }).fill('20%');
    await dialog.getByRole('tab', { name: 'Upload list' }).click();
    await dialog.locator('input[type=file]').setInputFiles({ name: 'list.csv', mimeType: 'text/csv', buffer: Buffer.from('phone,name,{{2}}\n+968 9333 4444,Huda,15%\n') });
    await dialog.getByRole('button', { name: 'Add 1 to the list' }).click();
    assert.equal(await dialog.getByRole('textbox', { name: '{{2}} · Huda' }).inputValue(), '15%', 'the {{2}} column fills that variable'); count++;
    await dialog.getByRole('tab', { name: 'Saved contacts' }).click();
    assert.equal(await dialog.getByRole('checkbox', { name: /Aisha/ }).isDisabled(), true, 'no consent → not selectable'); count++;
    await dialog.getByRole('checkbox', { name: /محمد/ }).check();
    await dialog.getByText('1 rows have an empty variable').waitFor(); count++;
    assert.equal(await dialog.getByRole('button', { name: 'Continue' }).isDisabled(), true, 'an empty variable blocks sending'); count++;
    await dialog.getByRole('textbox', { name: '{{2}} · محمد الحارثي' }).fill('10%');
    assert.equal(await dialog.getByRole('button', { name: 'Continue' }).isDisabled(), true, 'new numbers need the consent record'); count++;
    await dialog.getByLabel('How did they agree?').selectOption('store');
    await dialog.getByRole('checkbox', { name: /I confirm each of these customers/ }).check();
    assert.deepEqual(await axe(page), []); count++;
    await page.screenshot({ path: `${OUT}/broadcast-numbers-1280.png` });
    await dialog.getByRole('button', { name: 'Continue' }).click();
    // Step 3: every customer's own message, then send.
    await dialog.getByText('3 will receive it').waitFor(); count++;
    await dialog.getByText('Meta bills your WhatsApp Business account for each delivered message. BznsFlow adds no charge.').waitFor(); count++;
    const shown = [];
    for (let i = 0; i < 3; i++) {
      shown.push(await dialog.locator('.ld-per-contact p').textContent());
      if (i < 2) await dialog.getByRole('button', { name: 'Next customer' }).click();
    }
    assert.deepEqual(shown, ['Hello Salim, enjoy 20% off this week.', 'Hello Huda, enjoy 15% off this week.', 'Hello محمد الحارثي, enjoy 10% off this week.'].map(t => `${t}\n\nTap Stop promotions to opt out`)); count++;
    assert.deepEqual(await axe(page), []); count++;
    await page.screenshot({ path: `${OUT}/broadcast-send-1280.png` });
    await dialog.getByRole('button', { name: 'Send to 3 now' }).click();
    await dialog.getByText('Broadcast saved.').waitFor(); count++;
    const sent = state.bodies.find(b => b.action === 'campaign_create');
    assert.deepEqual(sent.values.map(v => v.values.find(x => x.key === 'body:2').text), ['20%', '15%', '10%']); count++;
    assert.equal(state.bodies.find(b => b.action === 'import_contacts').consent.source, 'They signed up in store'); count++;
    await context.close();
  }

  // Sending off: a broadcast can be built and checked, but Send stays disabled. Arabic, phone width.
  {
    const state = fixture();
    const { page, context } = await openPage(browser, { width: 375, lang: 'ar', path: '/layla/dashboard?tab=customers&view=broadcast', handler: api(state, { broadcastEnabled: false }) });
    await page.getByRole('button', { name: 'رفع قائمة' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /autumn_offer/ }).check();
    await dialog.getByRole('button', { name: 'متابعة' }).click();
    assert.equal(await dialog.getByRole('tab', { name: 'رفع قائمة' }).getAttribute('aria-selected'), 'true', 'Upload list opens on its tab'); count++;
    await dialog.getByRole('tab', { name: 'جهات محفوظة' }).click();
    await dialog.getByRole('checkbox', { name: /محمد/ }).check();
    await dialog.getByRole('textbox', { name: '{{2}} · محمد الحارثي' }).fill('١٠٪');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'numbers step fits 375'); count++;
    await dialog.locator('.ld-recipient-table').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/broadcast-numbers-ar-375.png` });
    await dialog.getByRole('button', { name: 'متابعة' }).click();
    await dialog.getByText('الإرسال غير مفعّل بعد').waitFor(); count++;
    await dialog.getByText('لا تضيف BznsFlow أي رسوم', { exact: false }).waitFor(); count++;
    assert.equal(await dialog.getByRole('button', { name: /إرسال إلى 1 الآن/ }).isDisabled(), true); count++;
    assert.equal(await page.locator('.ld').getAttribute('dir'), 'rtl'); count++;
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'no page overflow at 375'); count++;
    assert.deepEqual(await axe(page), []); count++;
    await page.screenshot({ path: `${OUT}/broadcast-off-ar-375.png`, fullPage: true });
    await context.close();
  }

  // Meta stopped a broadcast for billing (131042): the coral alert repeats the steps, and the stop reason and
  // each failure code are in words. Once a later broadcast is delivered, the card shrinks to one line.
  for (const [width, lang] of [[1280, 'en'], [375, 'ar']]) {
    const state = fixture();
    const counts = { submitted: 0, sent: 0, delivered: 0, read: 0, failed: 2, blocked: 1 };
    state.campaigns = [{ id: 'camp9', name: 'marketing_ar', origin: 'broadcast', status: 'blocked', reason: 'payment_method_required', template: { name: 'marketing_ar', language: 'ar', body: 'Hello {{1}}' },
      scheduledAt: Date.now() - HOUR, timezone: 'Asia/Muscat', recipientCount: 3, createdAt: Date.now() - HOUR, counts,
      recipients: [{ name: 'Huda', number: '+968 9333 4444', status: 'failed', reason: 'provider_delivery_failed', errorCode: 131042 }, { name: 'Salim', number: '+968 9111 2222', status: 'failed', reason: 'provider_delivery_failed', errorCode: 131026 }, { name: 'Aisha', number: '+968 9555 6666', status: 'blocked', reason: 'payment_method_required', errorCode: null }] }];
    const { page, context } = await openPage(browser, { width, lang, path: '/layla/dashboard?tab=customers&view=broadcast', handler: api(state) });
    const ar = lang === 'ar';
    const alert = page.getByRole('alert').filter({ hasText: ar ? 'أوقفت Meta رسالتك الجماعية' : 'Meta stopped your broadcast' });
    await alert.waitFor(); count++;
    assert.equal(await alert.locator('ol li').count(), 3); count++;
    await page.getByText(ar ? 'توقفت: تحتاج Meta إلى وسيلة دفع صالحة في حساب واتساب للأعمال.' : 'Stopped: Meta needs a working payment method on your WhatsApp Business account.').waitFor(); count++;
    await page.getByRole('button', { name: ar ? 'التفاصيل' : 'Details' }).click();
    const table = page.locator('.ld-campaign .ld-table');
    await table.waitFor();
    assert.match(await table.textContent(), ar ? /مشكلة دفع لدى Meta \(131042\)/ : /Meta payment issue \(131042\)/); count++;
    assert.match(await table.textContent(), ar ? /لا يستقبل رسائل واتساب \(131026\)/ : /Can’t receive WhatsApp messages \(131026\)/); count++;
    assert.equal(await noOverflow(page), true, `stopped ${lang} ${width} overflow`); count++;
    assert.deepEqual(await axe(page), [], `stopped ${lang} ${width} axe`); count++;
    await page.screenshot({ path: `${OUT}/broadcast-payment-stopped-${lang}-${width}.png`, fullPage: true });
    await context.close();
  }
  {
    const state = fixture();
    state.campaigns = [{ id: 'camp10', name: 'autumn_offer', origin: 'broadcast', status: 'completed', reason: null, template: { name: 'autumn_offer', language: 'en', body: 'Hello {{1}}' },
      scheduledAt: Date.now() - HOUR, timezone: 'Asia/Muscat', recipientCount: 2, createdAt: Date.now() - HOUR, counts: { submitted: 0, sent: 0, delivered: 1, read: 1, failed: 0 } }];
    const { page, context } = await openPage(browser, { width: 1280, path: '/layla/dashboard?tab=customers&view=broadcast', handler: api(state) });
    await page.getByText('Meta bills broadcast messages to your WhatsApp Business account. BznsFlow doesn’t charge for messages.').waitFor(); count++;
    assert.equal(await page.locator('.ld-fees').count(), 0, 'the full card is gone once a broadcast was delivered'); count++;
    await context.close();
  }

  // Rasil on Ascend: its own Email tab, the same in every industry (Retail here, a six-tab dashboard). It opens on
  // Domain & form until the domain is ready; then subscribers with consent, then a campaign drafted, previewed and sent.
  for (const [width, lang] of [[1280, 'en'], [375, 'ar']]) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const rs = { domain: null, subscribers: [], campaigns: [], calls: [] };
    const records = status => [{ type: 'TXT', name: 'resend._domainkey', value: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC', status }, { type: 'MX', name: 'send', value: 'feedback-smtp.eu-west-1.amazonses.com', priority: 10, status }, { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none;', status: 'recommended' }];
    const counts = () => ({ subscribed: rs.subscribers.length, pending: 0, unsubscribed: 0, suppressed: 0 });
    const state = () => ({ ok: true, csrfToken: 'a'.repeat(64), domain: rs.domain, business: { name: 'Blue Studio Properties', address: 'Al Khuwair, Muscat' }, subscribers: counts(), usage: { month: 0, cap: 2000, today: 0, reserved: 0 } });
    const reply = value => ({ status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), ...value } });
    const rasilApi = (method, body) => {
      if (method === 'GET') return state();
      rs.calls.push(body);
      switch (body.action) {
        case 'domain_connect': rs.domain = { domain: 'daralrayan.om', status: 'pending', records: records('not_started'), fromName: '', fromLocal: '', replyTo: '', formKey: 'fk_0123456789abcdefghij', verifiedAt: null, dailyLimit: 0, ready: false }; return { domain: rs.domain };
        case 'domain_check': rs.domain = { ...rs.domain, status: 'verified', records: records('verified'), dailyLimit: 50 }; return { domain: rs.domain };
        case 'sender_save': rs.domain = { ...rs.domain, fromName: body.fromName, fromLocal: body.fromLocal, replyTo: body.replyTo, ready: true }; return { domain: rs.domain };
        case 'subscribers_import': rs.subscribers.push(...body.rows); return { added: body.rows.length, updated: 0, kept: 0, invalid: 0 };
        case 'subscribers': return { items: rs.subscribers.map((r, i) => ({ id: `sub${i}`, email: r.email, name: r.name || '', status: 'subscribed', source: 'manual', reason: null, consentDate: '2026-10-01', createdAt: now })), cursor: null };
        case 'campaigns': return { items: rs.campaigns, cursor: null };
        case 'draft': return { draft: { subject: t('New flats in Al Khuwair', 'شقق جديدة في الخوير'), body: t('Hello {{name}},\n\nOur new two-bedroom flats are ready from 900 OMR.\nSee them at https://daralrayan.om/flats', 'أهلاً {{name}}،\n\nشققنا الجديدة بغرفتين جاهزة من 900 ر.ع.'), untracedPrice: '900 OMR' } };
        case 'campaign_preview': return { eligible: rs.subscribers.length, remaining: 2000, cap: 2000, dailyLimit: 50, ready: true, reason: null, business: { name: 'Blue Studio Properties' }, sample: { name: rs.subscribers[0]?.name || '' } };
        case 'campaign_create': rs.campaigns.unshift({ id: 'ec1', name: body.name || body.subject, subject: body.subject, body: body.body, lang: body.lang, status: 'scheduled', reason: null,
          sender: { domain: 'daralrayan.om', fromName: rs.domain.fromName, fromLocal: rs.domain.fromLocal }, scheduledAt: now, timezone: 'Asia/Muscat', recipientCount: rs.subscribers.length, counts: { pending: rs.subscribers.length }, createdAt: now });
          return { campaign: rs.campaigns[0] };
        default: return null;
      }
    };
    const base = api(fixture());
    const handler = async (surface, method, body) => {
      const out = await base(surface, method, body);
      if (surface === 'dashboard' && method === 'GET' && out.json?.ok) return { ...out, json: { ...out.json, rasilEnabled: true } };
      return out;
    };
    const extra = (surface, request) => {
      if (surface !== 'rasil') return null;
      const value = rasilApi(request.method(), request.method() === 'POST' ? request.postDataJSON() : null);
      return value ? reply(value) : { status: 400, json: { ok: false, reason: 'invalid_action' } };
    };
    const { page, context } = await openPage(browser, { width, lang, path: '/layla/dashboard?tab=email', handler, extra });
    await page.getByRole('heading', { name: t('Your sending domain', 'نطاق الإرسال') }).waitFor(); count++;
    assert.equal(await page.locator('.ld-nav a[data-section="email"]').first().getAttribute('aria-current'), 'page', 'Email is its own tab'); count++;
    assert.match(page.url(), /tab=email&view=setup/, 'no domain yet: it opens on Domain & form'); count++;
    assert.equal(await page.locator('.ld-section-tabs a').count(), 3, 'Campaigns, Subscribers, Domain & form'); count++;
    await page.getByLabel(t('Your domain', 'نطاقك')).fill('daralrayan.om');
    await page.getByRole('button', { name: t('Connect domain', 'ربط النطاق') }).click();
    await page.getByText('resend._domainkey').waitFor(); count++;
    assert.equal(await page.locator('.ld-records tbody tr').count(), 3, 'DKIM, the return path and DMARC'); count++;
    await page.getByRole('button', { name: t('Check records', 'فحص السجلات') }).click();
    await page.getByText(t('Verified', 'موثّق'), { exact: true }).first().waitFor(); count++;
    await page.getByLabel(t('Sender name', 'اسم المُرسِل'), { exact: true }).fill('Blue Studio');
    await page.getByRole('button', { name: t('Save sender', 'حفظ المُرسِل') }).click();
    await page.getByText(t('Saved.', 'حُفظ.')).waitFor(); count++;
    assert.deepEqual(rs.calls.find(c => c.action === 'sender_save'), { action: 'sender_save', fromName: 'Blue Studio', fromLocal: 'news', replyTo: '' }); count++;
    // The website form carries this owner's key and the hidden bot trap.
    const snippet = await page.locator('.ld-code').textContent();
    assert.match(snippet, /action="http:\/\/127\.0\.0\.1:\d+\/email\/subscribe"/); count++;
    assert.match(snippet, /name="k" value="fk_0123456789abcdefghij"/); count++;
    assert.match(snippet, /name="website"/); count++;
    await page.screenshot({ path: `${OUT}/email-setup-${lang}-${width}.png`, fullPage: true });
    // Subscribers need a consent record before they can be added.
    await page.locator('.ld-section-tabs a').nth(1).click();
    await page.getByRole('button', { name: t('Add subscribers', 'إضافة مشتركين') }).click();
    await page.getByLabel(t('Email addresses', 'عناوين البريد')).fill('huda@example.om, Huda\nsalim@example.om');
    const addTwo = page.getByRole('button', { name: t('Add 2', 'إضافة 2') });
    assert.equal(await addTwo.isDisabled(), true, 'no consent record yet'); count++;
    await page.getByLabel(t('How they agreed', 'كيف وافقوا'), { exact: false }).first().fill(t('Signed up in store', 'اشتركوا في المعرض'));
    await page.getByLabel(t('What they agreed to receive', 'ما الذي وافقوا على استلامه'), { exact: false }).fill(t('Monthly offers', 'العروض الشهرية'));
    await page.getByRole('checkbox', { name: t(/marketing emails/, /بالبريد الإلكتروني/) }).check();
    await addTwo.click();
    await page.getByText(t('Added 2, updated 0.', 'أُضيف 2، وحُدّث 0.'), { exact: false }).waitFor(); count++;
    assert.deepEqual(rs.calls.find(c => c.action === 'subscribers_import').rows, [{ email: 'huda@example.om', name: 'Huda' }, { email: 'salim@example.om' }]); count++;
    assert.deepEqual(await axe(page), [], `email subscribers ${lang} ${width}`); count++;
    await page.screenshot({ path: `${OUT}/email-subscribers-${lang}-${width}.png`, fullPage: true });
    await page.locator('.ld-section-tabs a').nth(0).click();
    // A campaign: Adiba drafts, a price that is not in the catalog is flagged, the preview is the real email.
    await page.getByRole('button', { name: t('New email campaign', 'حملة بريد جديدة') }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: t('Write a draft', 'اكتب مسودة') }).click();
    await dialog.getByText(t('900 OMR is not in your services', '900 OMR غير موجود في خدماتك')).waitFor(); count++;
    const frame = dialog.frameLocator('iframe');
    await frame.getByText(t('Hello Huda,', 'أهلاً Huda،')).waitFor(); count++;
    await frame.getByText(t('Unsubscribe', 'إلغاء الاشتراك')).waitFor(); count++;
    await dialog.getByText(t('2 subscribers will receive it.', 'سيستلمها 2 مشترك.')).waitFor(); count++;
    assert.equal(await noOverflow(page), true, `email compose ${lang} ${width}`); count++;
    assert.deepEqual(await axe(page), [], `email compose ${lang} ${width}`); count++;
    await page.screenshot({ path: `${OUT}/email-compose-${lang}-${width}.png` });
    await dialog.getByRole('button', { name: t('Send to 2 now', 'إرسال إلى 2 الآن') }).click();
    await page.locator('.ld-campaign').filter({ hasText: t('New flats in Al Khuwair', 'شقق جديدة في الخوير') }).waitFor(); count++;
    const created = rs.calls.find(c => c.action === 'campaign_create');
    assert.deepEqual([created.confirm, created.lang, created.schedule.mode, created.schedule.timezone], [true, lang, 'now', 'Asia/Muscat']); count++;
    assert.match(created.requestId, /^[a-f0-9-]{36}$/); count++;
    assert.equal(await noOverflow(page), true, `email ${lang} ${width}`); count++;
    assert.deepEqual(await axe(page), [], `email ${lang} ${width}`); count++;
    await page.screenshot({ path: `${OUT}/email-${lang}-${width}.png`, fullPage: true });
    // Broadcasts is WhatsApp again, with no email inside it.
    await page.goto(`${BASE}${ar ? '' : '/en'}/layla/dashboard?tab=customers&view=broadcast`);
    await page.locator('.ld-broadcast h1').waitFor(); count++;
    assert.equal(await page.getByText(t('Your sending domain', 'نطاق الإرسال')).count(), 0); count++;
    await context.close();
  }

  // Every tab at narrow widths in both languages: no overflow, no serious accessibility issues.
  for (const [width, lang] of [[375, 'ar'], [768, 'en'], [320, 'en']]) {
    for (const tab of ['contacts', 'broadcast']) {
      const { page, context } = await openPage(browser, { width, lang, path: `/layla/dashboard?tab=${tab}`, handler: api(fixture()) });
      await page.locator('.ld-main h1').waitFor();
      await page.waitForFunction(() => !document.querySelector('.ld-main [role=status]')?.textContent.match(/Loading|جارٍ التحميل/));
      assert.equal(await noOverflow(page), true, `${tab} ${lang} ${width} overflow`); count++;
      assert.deepEqual(await axe(page), [], `${tab} ${lang} ${width} axe`); count++;
      await page.screenshot({ path: `${OUT}/${tab}-${lang}-${width}.png`, fullPage: true });
      await context.close();
    }
  }

  // Account recovery: a dashboard visitor sent to sign-in returns once their connected account is restored.
  {
    const saved = { ok: true, csrfToken: 'a'.repeat(64), available: true, status: 'connected', profile: { businessName: 'Blue Studio Properties', sector: 'Real estate', services: 'Villas', prices: '', hours: '', location: '', humanContact: 'team@example.com', faqs: [], reviewed: true },
      journeyStep: 3, profileVersion: 1, capabilities: {}, integration: { id: 'i1', sender: '96890000000', path: 'new_number', status: 'connected' }, account: { email: 'owner@example.test' }, savedToAccount: true, accountSaveAvailable: true, catalog: { entries: [], cursor: null } };
    const { page, context } = await openPage(browser, { width: 390, path: '/catalyst/setup?next=dashboard', handler: api(fixture()), extra: surface => surface === 'customer' ? { status: 200, json: saved } : null });
    await page.waitForURL(/\/en\/layla\/dashboard$/); count++;
    await context.close();
    const signedOut = { ...saved, account: null, savedToAccount: false, integration: null, status: 'business_saved' };
    const second = await openPage(browser, { width: 390, path: '/catalyst/setup?next=dashboard', handler: api(fixture()), extra: surface => surface === 'customer' ? { status: 200, json: signedOut } : surface === 'messaging' ? { status: 401, json: { ok: false, reason: 'sign_in_required' } } : null });
    await second.page.getByRole('region', { name: 'Save your setup' }).waitFor(); count++;
    await second.context.close();
  }

  // Setup with a connected number: the WhatsApp switch turns Layla on and the page says she is live.
  {
    const setup = { ok: true, csrfToken: 'a'.repeat(64), review: false, available: true, status: 'connected', profile: { businessName: 'Blue Studio Properties', sector: 'Real estate', services: 'Villas', prices: '', hours: '', location: '', humanContact: 'team@example.com', faqs: [], reviewed: true },
      journeyStep: 3, profileVersion: 1, capabilities: {}, integration: { id: 'i1', sender: '96890000000', path: 'new_number', status: 'connected' }, account: { email: 'owner@example.test' }, savedToAccount: true, accountSaveAvailable: true };
    let active = false;
    const handler = api(fixture());
    const { page, context } = await openPage(browser, { width: 1280, path: '/catalyst/setup', handler, extra: (surface, request) => {
      if (surface === 'customer') return { status: 200, json: { ...setup, catalog: { entries: [], cursor: null, total: 0 } } };
      if (surface === 'messaging') { if (request.method() === 'POST') active = true; return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), available: true, active, reason: active ? '' : 'not_activated', limits: { usedToday: 0 } } }; }
      return null;
    } });
    const toggle = page.locator('.layla-channel-card--whatsapp').getByRole('switch');
    assert.equal(await toggle.isChecked(), false, 'already connected before this visit, so nothing switched on by itself'); count++;
    await toggle.click();
    await page.getByRole('heading', { name: 'Layla is live' }).waitFor(); count++;
    assert.equal(await page.getByRole('link', { name: 'Open your inbox' }).getAttribute('href'), '/en/layla/dashboard'); count++;
    assert.equal(await page.getByRole('button', { name: /Activate/ }).count(), 0, 'no separate Activate buttons remain'); count++;
    await page.screenshot({ path: `${OUT}/setup-live-1280.png` });
    await context.close();
  }
  // Dashboard → Business: an existing customer converts saved details into bzns.md, edits and publishes.
  for (const [lang, width] of [['en', 1280], ['ar', 375]]) {
    const writes = [];
    const bzns = { markdown: null, version: 0, publishedRevision: 0, publishedAt: null, unpublishedChanges: false };
    let setup = { ok: true, csrfToken: 'a'.repeat(64), available: true, status: 'connected', savedToAccount: true, profileVersion: 3, bzns,
      profile: { businessName: 'Blue Studio', sector: 'Photography', services: 'Portraits', prices: '', hours: '', location: '', humanContact: 'team@example.test', faqs: [], reviewed: true } };
    const { page, context } = await openPage(browser, { width, lang, path: '/layla/dashboard?tab=business', handler: api(fixture()), extra: (surface, request) => {
      if (surface !== 'customer') return null;
      const body = request.method() === 'POST' ? request.postDataJSON() : {};
      if (body.action === 'bzns_publish') { writes.push(body); setup = { ...setup, profileVersion: 4, bzns: { markdown: body.markdown, version: body.version + 1, publishedRevision: 1, publishedAt: now, unpublishedChanges: false } }; }
      if (body.action === 'catalog_list') return { status: 200, json: { ...setup, catalog: { entries: [], cursor: null } } };
      if (body.operation || body.action === 'list') return { status: 200, json: { ...setup, sources: [], drafts: [] } };
      return { status: 200, json: setup };
    } });
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    await page.getByRole('heading', { name: t('Your business', 'نشاطك التجاري'), exact: true }).waitFor(); count++;
    await page.getByRole('heading', { name: t('Add information', 'إضافة معلومات') }).waitFor(); count++; // older accounts keep their Q&A until bzns.md is published
    await page.getByRole('button', { name: t('Start from my saved details', 'ابدأ من معلوماتي المحفوظة') }).click();
    const doc = page.locator('.bzns-field textarea');
    assert.match(await doc.inputValue(), /name: Blue Studio[\s\S]*Portraits/, `${lang}: saved details become the starting document`); count++;
    await doc.fill((await doc.inputValue()).replace('Portraits', t('Portraits and weddings', 'صور شخصية وحفلات زفاف')));
    const publish = page.getByRole('button', { name: t('Publish and continue', 'انشر وتابع') });
    assert.equal(await publish.isDisabled(), true, `${lang}: publishing needs the owner's confirmation`); count++;
    await page.getByLabel(t('I checked these business details', 'راجعت معلومات النشاط هذه')).check();
    await publish.click();
    await page.getByText(t('Published. Layla now answers from this version.', 'تم النشر. تجيب ليلى الآن من هذه النسخة.')).waitFor(); count++;
    assert.equal(await page.getByRole('heading', { name: t('Add information', 'إضافة معلومات') }).count(), 0, `${lang}: the legacy Q&A panel retires once bzns.md is published`); count++;
    assert.equal(writes.length, 1); assert.match(writes[0].markdown, new RegExp(t('Portraits and weddings', 'صور شخصية وحفلات زفاف'))); count += 2;
    assert.equal(await noOverflow(page), true, `${lang} ${width}: no horizontal overflow`); count++;
    await context.close();
  }
  // Ascend's free website: the reminder leads to the brief in Business details, the form asks for what
  // Ahmed needs, and one submit sends the brief (emailed server-side). Prefilled from confirmed details.
  for (const [lang, width] of [['en', 1280], ['ar', 375]]) {
    const submits = [];
    const brief = { account: { email: 'owner@example.test', name: 'Sara' }, version: 0, fields: { nameEn: 'Blue Studio', phone: '+968 9000 0000' }, submittedAt: null, emailedAt: null, logo: null, photos: [] };
    const setup = { ok: true, csrfToken: 'a'.repeat(64), available: true, status: 'connected', savedToAccount: true, profileVersion: 3,
      bzns: { markdown: '# Blue Studio', version: 1, publishedRevision: 1, publishedAt: now, unpublishedChanges: false },
      profile: { businessName: 'Blue Studio', sector: 'Photography', services: 'Portraits', prices: '', hours: '', location: '', humanContact: 'team@example.test', faqs: [], reviewed: true } };
    const { page, context } = await openPage(browser, { width, lang, path: '/layla/dashboard?tab=chats', handler: api(fixture()),
      authAccount: { id: 'a1', email: 'owner@example.test', accessPlan: 'ascend', profileComplete: true },
      extra: (surface, request) => {
        if (surface === 'website-brief') {
          const body = request.method() === 'POST' ? request.postDataJSON() : null;
          if (!body) return { status: 200, json: { ok: true, csrfToken: 'a'.repeat(64), brief } };
          submits.push(body);
          return { status: 200, json: { ok: true, version: 1, emailed: true } };
        }
        if (surface !== 'customer') return null;
        const body = request.method() === 'POST' ? request.postDataJSON() : {};
        if (body.action === 'catalog_list') return { status: 200, json: { ...setup, catalog: { entries: [], cursor: null } } };
        if (body.operation || body.action === 'list') return { status: 200, json: { ...setup, sources: [], drafts: [] } };
        return { status: 200, json: setup };
      } });
    const ar = lang === 'ar', t = (en, arabic) => ar ? arabic : en;
    await page.getByRole('heading', { name: t('Your free website is waiting for your details', 'موقعك المجاني بانتظار تفاصيلك') }).waitFor(); count++;
    await page.getByRole('link', { name: t('Send website details', 'أرسل تفاصيل الموقع') }).click();
    const form = page.locator('.ld-brief');
    await form.getByRole('heading', { name: t('Your free website', 'موقعك المجاني') }).waitFor(); count++;
    assert.equal(await form.getByLabel(t('Business name in English', 'اسم النشاط بالإنجليزية')).inputValue(), 'Blue Studio', `${lang}: prefilled from confirmed details`); count++;
    // A language is required, and so is a logo or a request to design one.
    await form.getByRole('button', { name: t('Send to BznsFlow', 'أرسل إلى BznsFlow') }).click();
    await form.getByText(t('Fill in the required fields.', 'أكمل الحقول المطلوبة.')).waitFor(); count++;
    assert.equal(submits.length, 0, `${lang}: nothing is sent while required fields are missing`); count++;
    await form.getByRole('radio', { name: t('Arabic and English', 'العربية والإنجليزية') }).check();
    await form.getByRole('button', { name: t('Send to BznsFlow', 'أرسل إلى BznsFlow') }).click();
    await form.getByText(t('Fill in the required fields.', 'أكمل الحقول المطلوبة.')).waitFor();
    await form.getByLabel(t('I don’t have a logo. Please design a simple one.', 'ليس لدي شعار. صمّموا لي شعارًا بسيطًا.')).check();
    await form.getByRole('radio', { name: t('Minimal', 'بسيط') }).check();
    await form.getByRole('checkbox', { name: t('Gallery', 'المعرض') }).check();
    await form.getByRole('button', { name: t('Add a colour', 'أضف لونًا') }).click();
    await form.getByRole('button', { name: t('Send to BznsFlow', 'أرسل إلى BznsFlow') }).click();
    await form.getByText(t('We’ll contact you before your website goes live.', 'سنتواصل معك قبل نشر موقعك.'), { exact: false }).waitFor(); count++;
    assert.equal(submits.length, 1); count++;
    assert.deepEqual(submits[0].fields, { nameEn: 'Blue Studio', phone: '+968 9000 0000', languages: 'both', style: 'minimal', colors: ['#1f4f7a'], pages: ['gallery'], designLogo: true }, `${lang}: the brief as entered`); count++;
    assert.deepEqual([submits[0].action, submits[0].version, submits[0].logoId, submits[0].photoIds], ['submit', 0, null, []]); count++;
    assert.equal(await form.getByRole('button', { name: t('Send update', 'أرسل التحديث') }).count(), 1, `${lang}: later sends are updates`); count++;
    const violations = (await new AxeBuilder({ page }).include('.ld-brief').analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
    assert.deepEqual(violations, [], `${lang} ${width}: website brief accessibility`); count++;
    assert.equal(await noOverflow(page), true, `${lang} ${width}: no horizontal overflow`); count++;
    await form.screenshot({ path: `${OUT}/website-brief-${lang}-${width}.png` });
    await context.close();
  }
  console.log(`${count} dashboard browser assertions passed at 320–1440px in English and Arabic. Synthetic API; no external network.`);
} finally { await browser.close(); }
