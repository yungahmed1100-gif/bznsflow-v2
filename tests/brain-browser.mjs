// Catalyst BznsBrain in a real browser: the new setup journey and Settings › BznsBrain, against a
// stateful synthetic customer surface (the real bzns.md checks; no Convex, no model, no network).
//   npm run build && node scripts/preview.mjs --port 5199 & node tests/brain-browser.mjs http://127.0.0.1:5199
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateBzns, deriveProfile, upsertSection, parseBzns } from '../src/lib/bzns-doc.js';
import { capabilitiesFor } from '../convex/hasib/capabilities.js';
import { BUSINESS_INDUSTRIES } from '../src/lib/industries.js';
import { brainTemplate } from '../config/bzns-templates.js';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async (page, scope) => (await new AxeBuilder({ page }).include(scope).analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`);
const VALID = `---\nname: Bright Smile Dental\nsector: dental\n---\n# Bright Smile Dental\n\n## About us\nFamily dental clinic in Al Khuwair.\n\n## What we offer\n- Check-ups and cleaning\n\n## Location\nAl Khuwair, Way 3013\n\n## Team contact\nWhatsApp +968 9100 2000 (Sara)\n`;

/** One owner's setup record, kept between requests like the real customer surface. */
function surface({ markdown = null, published = false, brainStep = 0, savedToAccount = false, connected = false } = {}) {
  const s = { writes: [], catalog: [], proposals: [], behaviour: null, brainStep,
    row: { profile: published ? { businessName: 'Bright Smile Dental', sector: 'dental', reviewed: true } : null, journeyStep: published ? 4 : 0, bznsDraft: markdown ? { markdown, version: 1 } : null, bznsPublished: published ? { markdown, revision: 1 } : null } };
  const state = () => ({ ok: true, available: true, csrfToken: 'c', journeyStep: s.row.journeyStep, profileVersion: 1, profile: s.row.profile, lastPreview: null, savedToAccount, accountSaveAvailable: true, account: savedToAccount ? { email: 'owner@example.test', industry: 'dental' } : null,
    integration: connected ? { id: 'i', sender: '96890000000', path: 'new_number', status: 'connected' } : null, status: connected ? 'connected' : 'business_saved', websiteImportAvailable: false,
    bzns: { markdown: s.row.bznsDraft?.markdown ?? s.row.bznsPublished?.markdown ?? null, version: s.row.bznsDraft?.version || 0, publishedRevision: s.row.bznsPublished?.revision || 0, publishedAt: null, unpublishedChanges: !!s.row.bznsDraft && s.row.bznsDraft.markdown !== s.row.bznsPublished?.markdown } });
  const brain = () => ({ behaviour: s.behaviour || { tone: 'informative', askName: true, ask: ['service'], appointmentPreferences: true, handoffNote: '', version: 0, legacy: true },
    askable: [{ key: 'service', en: 'Service', ar: 'الخدمة' }, { key: 'preferred_time', en: 'Preferred date and time', ar: 'الموعد المفضل', appointment: true }], sectorId: 'dental', brainStep: s.brainStep,
    proposals: s.proposals.filter(p => p.status === 'open'), total: s.proposals.filter(p => p.status === 'open').length, counts: {} });
  const catalog = () => ({ entries: s.catalog, cursor: null, total: s.catalog.length, revision: 1 });
  s.handle = body => {
    if (!body) return state();
    s.writes.push(body.action);
    const a = body.action;
    if (a === 'bzns_save') { s.row.bznsDraft = { markdown: body.markdown, version: (s.row.bznsDraft?.version || 0) + 1 }; return state(); }
    if (a === 'brain_state') return { ...state(), brain: brain() };
    if (a === 'brain_step') { s.brainStep = Math.max(s.brainStep, body.brainStep); return { ...state(), brain: brain() }; }
    if (a === 'catalog_list') return { ...state(), catalog: catalog() };
    if (a === 'catalog_save') { const e = body.entry; s.catalog = [...s.catalog.filter(x => x.entryKey !== e.entryKey), { ...e, status: 'draft', state: 'draft' }]; return { ...state(), catalog: { revision: 1 } }; }
    if (a === 'brain_extract') {
      s.proposals.push({ id: randomUUID(), kind: 'catalog_entry', status: 'open', target: {}, proposedEntry: { kind: 'service', nameEn: 'Whitening', nameAr: '', prices: [{ type: 'fixed', label: '60 OMR' }] }, evidence: { sourceLabel: body.sourceLabel, quote: 'Whitening: 60 OMR' } });
      s.proposals.push({ id: randomUUID(), kind: 'bzns_section', status: 'open', target: { section: 'policies' }, proposedText: 'We accept Dhofar Insurance.', evidence: { sourceLabel: body.sourceLabel, quote: 'We accept Dhofar Insurance.' } });
      return { ...state(), extraction: { ok: true, added: 2, rejected: 1, duplicate: 0 } };
    }
    if (a === 'brain_accept' || a === 'brain_dismiss') {
      const p = s.proposals.find(x => x.id === body.proposalId);
      p.status = a === 'brain_accept' ? 'accepted' : 'dismissed';
      if (a === 'brain_accept' && p.kind === 'catalog_entry') s.catalog.push({ entryKey: randomUUID(), ...p.proposedEntry, status: 'draft', state: 'draft' });
      if (a === 'brain_accept' && p.kind === 'bzns_section') s.row.bznsDraft = { markdown: upsertSection(state().bzns.markdown || '', 'policies', body.text || p.proposedText), version: (s.row.bznsDraft?.version || 0) + 1 };
      return { ...state(), brain: brain() };
    }
    if (a === 'brain_behaviour') { s.behaviour = { ...body.behaviour, version: (s.behaviour?.version || 0) + 1, legacy: false }; return { ...state(), brain: brain() }; }
    if (a === 'brain_publish') {
      const md = state().bzns.markdown, checked = validateBzns(md);
      if (!checked.ok) return { httpStatus: 400, json: { ok: false, reason: 'bzns_invalid' } };
      const { businessName, profile } = deriveProfile(checked.parsed);
      s.row = { ...s.row, profile: { ...profile, businessName }, journeyStep: 4, bznsPublished: { markdown: md, revision: (s.row.bznsPublished?.revision || 0) + 1 }, bznsDraft: { markdown: md, version: s.row.bznsDraft?.version || 1 } };
      s.catalog = s.catalog.map(e => ({ ...e, status: 'approved', state: 'published' }));
      return { ...state(), brain: brain() };
    }
    if (a === 'brain_test') return { ...state(), test: { variant: body.variant, reply: 'Cleaning is From 15 OMR. May I have your name?', intent: 'prices', needsTeam: false, sources: [{ id: 'C1', kind: 'catalog', label: 'Cleaning' }], reason: 'Price from the catalog.', captured: [{ key: 'service', en: 'Service', ar: 'الخدمة', value: 'Cleaning' }], sim: {}, appointment: null } };
    return state();
  };
  return s;
}

const overview = (role = 'manager') => ({ ok: true, csrfToken: 'a'.repeat(64), account: { email: 'owner@example.test' }, plan: 'catalyst', workspaceRole: role, capabilities: capabilitiesFor('catalyst', role), dashboardAvailable: true, broadcastEnabled: true, connected: true,
  business: { name: 'Bright Smile Dental', sector: 'Dental clinics', sectorId: 'dental' }, integration: { sender: '96890000000', path: 'new_number', status: 'connected', checks: { routing: true, registered: true, path: true }, checkedAt: Date.now() },
  messaging: { available: true, active: true, reason: '', broadcastAvailable: true, limits: { perMinute: 10, perDay: 100, usedToday: 0 } }, timezone: 'Asia/Muscat', setup: { services: true, teamContact: true } });

async function open(browser, { width, lang, path, s, role = 'manager', signedIn = true }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (url.pathname.startsWith('/api/product-setup')) return route.fulfill(signedIn ? { json: { ok: true, csrfToken: 'c', progress: { step: 0, version: 1, completed: false }, settings: null, workspaceReady: true } } : { status: 401, json: { ok: false, reason: 'sign_in_required' } });
    if (url.pathname === '/api/auth-session') return route.fulfill({ json: { ok: true, csrfToken: 'c', account: signedIn ? { email: 'owner@example.test' } : null } });
    if (url.pathname !== '/api/layla-meta') return url.pathname.startsWith('/api/') ? route.fulfill({ status: 404, json: { ok: false, reason: 'not_found' } }) : route.continue();
    const surfaceName = url.searchParams.get('surface'), body = route.request().postDataJSON();
    if (surfaceName === 'customer') { const r = s.handle(body); return route.fulfill(r.httpStatus ? { status: r.httpStatus, json: r.json } : { json: r }); }
    if (surfaceName === 'dashboard') {
      if (!body) return route.fulfill({ json: overview(role) });
      return route.fulfill({ json: { ok: true, csrfToken: 'a'.repeat(64), items: [], conversations: [], contacts: [], cursor: null, total: 0 } });
    }
    if (surfaceName === 'messaging') return route.fulfill({ json: { ok: true, csrfToken: 'a'.repeat(64), available: true, active: true, connected: true } });
    if (surfaceName === 'instagram') return route.fulfill({ json: { ok: true, available: false } });
    return route.fulfill({ status: 403, json: { ok: false, reason: 'plan_required' } });
  });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}${path}`);
  return { page, context, errors };
}

const browser = await chromium.launch();
let count = 0;
try {
  // Every Catalyst industry must save its own starter and resume it, in both languages and at
  // all supported widths. This uses the actual built selector and template, without live data.
  for (const lang of ['en', 'ar']) for (const width of [320, 768, 1440]) {
    const ar = lang === 'ar';
    for (const industry of BUSINESS_INDUSTRIES) {
      const s = surface();
      const { page, context, errors } = await open(browser, { width, lang, path: '/catalyst/setup', s, signedIn: false });
      const select = page.getByLabel(ar ? 'المجال' : 'Industry');
      await select.waitFor();
      assert.equal(await select.locator('option').count(), BUSINESS_INDUSTRIES.length + 1); count++;
      await select.selectOption(industry.id);
      if (industry.id === 'media') {
        await select.focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.getByRole('button', { name: ar ? 'متابعة' : 'Continue' }).evaluate(el => el === document.activeElement), true, 'keyboard reaches Continue'); count++;
        await page.keyboard.press('Enter');
      } else await page.getByRole('button', { name: ar ? 'متابعة' : 'Continue' }).click();
      const heading = page.getByRole('heading', { name: ar ? 'أضف معلوماتك' : 'Add your information' });
      await heading.waitFor();
      assert.equal(s.row.bznsDraft.markdown, brainTemplate(industry.id, lang), `${industry.id}/${lang}: actual template saved`); count++;
      assert.equal(parseBzns(s.row.bznsDraft.markdown).meta.sector, industry.id); count++;
      assert.equal(await noOverflow(page), true, `${industry.id}/${lang}/${width}: overflow`); count++;
      assert.equal(await page.locator('.brain-setup').getAttribute('dir'), ar ? 'rtl' : 'ltr'); count++;
      if (industry.id === 'media') {
        assert.deepEqual(await axe(page, '.brain-setup'), [], `${lang}/${width}: Media accessibility`); count++;
        assert.equal(await heading.evaluate(el => el === document.activeElement), true, 'focus moves to the new step'); count++;
      }
      await page.reload();
      await heading.waitFor();
      assert.equal(s.row.bznsDraft.markdown, brainTemplate(industry.id, lang), 'reload preserves the draft'); count++;
      assert.equal(s.writes.filter(action => action === 'bzns_save').length, 1, 'reload does not overwrite it'); count++;
      assert.deepEqual(errors, [], `${industry.id}/${lang}/${width}: browser exceptions`); count++;
      await context.close();
    }
    console.log(`Catalyst industry setup: ${BUSINESS_INDUSTRIES.length} selections passed (${lang}, ${width}px).`);
  }

  // Choosing a newly added sector must preserve a business's existing owner-written document.
  for (const lang of ['en', 'ar']) {
    const s = surface({ markdown: VALID });
    const { page, context } = await open(browser, { width: 768, lang, path: '/catalyst/setup', s, signedIn: false });
    await page.getByLabel(lang === 'ar' ? 'المجال' : 'Industry').selectOption('media');
    await page.getByRole('button', { name: lang === 'ar' ? 'متابعة' : 'Continue' }).click();
    await page.getByRole('heading', { name: lang === 'ar' ? 'أضف معلوماتك' : 'Add your information' }).waitFor();
    assert.equal(s.row.bznsDraft.markdown, VALID.replace('sector: dental', 'sector: media'), 'changing industry keeps owner content'); count++;
    await context.close();
  }

  // 1. Setup: industry → information → review → behaviour → test and publish, then the channel step.
  for (const lang of ['en', 'ar']) for (const width of [320, 768, 1440]) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const s = surface();
    const { page, context, errors } = await open(browser, { width, lang, path: '/catalyst/setup', s, signedIn: false });
    await page.locator('.brain-setup').waitFor();
    assert.deepEqual(s.writes.filter(w => !['brain_state', 'catalog_list'].includes(w)), [], 'opening setup writes nothing'); count++;
    assert.equal(await page.locator('.brain-setup-steps li').count(), 5); count++;
    await page.getByLabel(t('Industry', 'المجال')).selectOption('dental');
    await page.getByRole('button', { name: t('Continue', 'متابعة') }).click();
    await page.getByRole('heading', { name: t('Add your information', 'أضف معلوماتك') }).waitFor();
    assert.match(s.row.bznsDraft.markdown, /sector: dental/, 'the industry template is saved as a draft'); count++;
    assert.doesNotMatch(s.row.bznsDraft.markdown, /tone:|## FAQ|hand over/i, 'no tone, FAQ or handoff in BznsBrain\'s template'); count++;
    assert.equal(await noOverflow(page), true, `${lang} ${width} setup overflow`); count++;
    assert.deepEqual(await axe(page, '.brain-setup'), [], `${lang} ${width} setup axe`); count++;
    assert.equal(await page.getByRole('tab', { name: new RegExp(t('Website', 'موقع')) }).count(), 1, 'website is one of the three sources'); count++;
    await page.getByRole('tab', { name: t('Text', 'نص'), exact: true }).click();
    await page.getByLabel(t('Paste text', 'الصق نصاً')).fill('Whitening: 60 OMR\nWe accept Dhofar Insurance.');
    await page.getByRole('button', { name: t('Read text', 'اقرأ النص') }).click();
    await page.getByText(t('2 suggestions to review', '2 اقتراحات للمراجعة')).waitFor(); count++;
    await page.getByRole('button', { name: t('Continue', 'متابعة') }).click();
    await page.getByRole('heading', { name: t('Review the facts', 'راجع المعلومات') }).waitFor();
    assert.equal(await page.locator('.brain-proposal').count(), 2); count++;
    assert.match(await page.locator('.brain-evidence').first().innerText(), /Whitening: 60 OMR/, 'each suggestion shows its source passage'); count++;
    await page.locator('.brain-proposal').first().getByRole('button', { name: t('Accept', 'اقبل') }).click();
    await page.locator('.brain-proposal').nth(0).waitFor();
    assert.equal(s.catalog[0]?.nameEn, 'Whitening', 'an accepted price goes to the catalog draft'); count++;
    await page.locator('.brain-proposal').first().getByRole('button', { name: t('Accept', 'اقبل') }).click();
    await page.getByText(t('Nothing to review.', 'لا شيء للمراجعة.')).waitFor(); count++;
    await page.getByRole('button', { name: t('Continue', 'متابعة') }).click();
    await page.getByRole('heading', { name: t('Configure Layla', 'اضبط ليلى') }).waitFor();
    await page.locator('.brain-tone').nth(1).click();
    await page.getByRole('button', { name: t('Save behaviour', 'احفظ الإعدادات') }).click();
    await page.locator('.brain-behaviour .brain-note').getByText(t('Saved.', 'تم الحفظ.')).waitFor();
    assert.equal(s.behaviour?.tone !== undefined, true); count++;
    await page.getByRole('button', { name: t('Continue', 'متابعة') }).click();
    await page.getByRole('heading', { name: t('Test and publish', 'جرّب وانشر') }).waitFor();
    // The template still has placeholders: publishing is refused with the reasons, nothing is sent.
    await page.getByRole('button', { name: t('Publish', 'انشر'), exact: true }).click();
    await page.locator('.brain-problems').waitFor();
    assert.equal(s.writes.includes('brain_publish'), false, 'an incomplete bzns.md is never sent to publish'); count++;
    s.row.bznsDraft = { markdown: upsertSection(VALID, 'policies', 'We accept Dhofar Insurance.'), version: 9 };
    await page.reload(); await page.getByRole('heading', { name: t('Test and publish', 'جرّب وانشر') }).waitFor();
    assert.ok(s.brainStep >= 4, 'progress resumes on the saved step'); count++;
    await page.getByRole('button', { name: t('Test Layla', 'جرّب ليلى') }).click();
    await page.locator('.brain-sheet').waitFor();
    assert.match(await page.locator('.brain-variant-label').innerText(), ar ? /مسودتك/ : /unpublished draft/, 'draft testing is labelled as draft'); count++;
    await page.getByRole('button', { name: t('Close', 'إغلاق') }).click();
    await page.getByRole('button', { name: t('Publish', 'انشر'), exact: true }).click();
    await page.getByRole('heading', { name: t('Connect a channel', 'اربط قناة') }).waitFor(); count++;
    assert.equal(s.catalog.every(e => e.status === 'approved'), true, 'one Publish publishes bzns.md and the catalog'); count++;
    assert.deepEqual(errors, [], `${lang} ${width} setup page errors`); count++;
    await context.close();
  }

  // 2. Settings › BznsBrain: four tabs, two Settings views, two data-entry tabs, Test Layla in a side panel.
  for (const lang of ['en', 'ar']) for (const width of [320, 1440]) {
    const ar = lang === 'ar', t = (en, arabic) => (ar ? arabic : en);
    const s = surface({ markdown: VALID, published: true, savedToAccount: true, connected: true });
    s.catalog.push({ entryKey: randomUUID(), kind: 'service', nameEn: 'Cleaning', nameAr: 'تنظيف', prices: [{ type: 'from', label: 'From 15 OMR', amount: 15, currency: 'OMR' }], status: 'approved', state: 'published' });
    const { page, context, errors } = await open(browser, { width, lang, path: '/layla/dashboard?tab=settings', s });
    await page.locator('.brain').waitFor();
    assert.equal(await page.locator('.ld-nav a').count(), 4, 'four main tabs'); count++;
    assert.deepEqual((await page.locator('.ld-section-tabs a').allInnerTexts()).map(x => x.trim()), ['BznsBrain', t('Channels', 'القنوات')], 'Settings: BznsBrain and Channels'); count++;
    const bzns = page.getByRole('tab', { name: 'bzns.md' });
    assert.equal(await bzns.getAttribute('aria-selected'), 'true', 'the coloured wordmark is read as "bzns.md"'); count++;
    assert.equal(await page.locator('.bzns-word-green').innerText(), 'b'); count++;
    await bzns.focus(); await page.keyboard.press(ar ? 'ArrowLeft' : 'ArrowRight');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('part') === 'catalog'); count++;
    await page.getByText('From 15 OMR').waitFor(); count++;
    assert.equal(await page.getByRole('button', { name: t('Approve and publish catalog', 'اعتماد ونشر الكتالوج') }).count(), 0, 'no separate catalog publish button'); count++;
    assert.equal(await page.getByText(/FAQ|الأسئلة الشائعة/).count(), 0, 'no FAQ anywhere'); count++;
    assert.equal(await noOverflow(page), true, `${lang} ${width} settings overflow`); count++;
    assert.deepEqual(await axe(page, '.brain'), [], `${lang} ${width} settings axe`); count++;
    await page.getByRole('button', { name: t('Test Layla', 'جرّب ليلى') }).click();
    const sheet = page.locator('.brain-sheet');
    await sheet.waitFor();
    assert.match(await page.locator('.brain-variant-label').innerText(), ar ? /الآن/ : /customers get now/, 'with nothing unpublished, the test is of what customers get'); count++;
    await sheet.getByPlaceholder(t('Write as a customer…', 'اكتب كأنك عميل…')).fill('How much is cleaning?');
    await sheet.getByRole('button', { name: t('Send', 'أرسل') }).click();
    await sheet.locator('.brain-bubble.is-layla').waitFor();
    assert.match(await sheet.locator('.brain-test-meta').innerText(), /Cleaning/, 'sources and captured details are shown'); count++;
    assert.match(await sheet.innerText(), ar ? /لا يُرسل شيء/ : /Nothing is sent/, 'the panel says nothing is sent'); count++;
    const box = await sheet.boundingBox();
    assert.ok(width <= 480 ? box.width >= width - 2 : (ar ? box.x <= 2 : box.x + box.width >= width - 2), `${lang} ${width}: the panel sits at the inline end (or fills a phone)`); count++;
    assert.deepEqual(await axe(page, '.brain-sheet'), [], `${lang} ${width} test panel axe`); count++;
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, [], `${lang} ${width} settings page errors`); count++;
    await context.close();
  }

  // 3. Old links land on BznsBrain's tabs; a team member never sees Settings.
  {
    const s = surface({ markdown: VALID, published: true, savedToAccount: true, connected: true });
    for (const [path, part] of [['/layla/dashboard?tab=settings&view=services', 'Catalog'], ['/layla/dashboard?tab=business', 'bzns.md'], ['/layla/dashboard?tab=stock', 'Catalog']]) {
      const { page, context } = await open(browser, { width: 1280, lang: 'en', path, s });
      await page.locator('.brain').waitFor();
      assert.equal(await page.getByRole('tab', { name: part }).getAttribute('aria-selected'), 'true', `${path} opens ${part}`); count++;
      await context.close();
    }
    const { page, context } = await open(browser, { width: 1280, lang: 'en', path: '/layla/dashboard?tab=settings', s, role: 'employee' });
    await page.locator('.ld-nav a').first().waitFor();
    assert.equal(await page.locator('.brain').count(), 0, 'an employee is not shown BznsBrain'); count++;
    assert.equal(await page.locator('.ld-nav a', { hasText: 'Settings' }).count(), 0); count++;
    await context.close();
  }
  console.log(`${count} BznsBrain browser checks passed (setup journey and Settings, EN/AR, 320–1440). Synthetic API; no external network.`);
} finally { await browser.close(); }
