// End to end, Paymob onboarding in the Ascend website brief (2026-10-31): the built site in a real browser,
// answered by the real server code. The API handlers (website brief, access-admin), the Convex store client,
// the Convex state machines (convexMemory) with the HTTP route's byte checks, and the brief email are the
// production modules; only the network edges are stood in for: Convex storage uploads, Resend and the
// registrar search. Usage: node tests/paymob-e2e-browser.mjs http://127.0.0.1:5199. No external network.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { createWebsiteBriefApi } from '../api/_lib/website-brief-api.js';
import { createAccessAdmin } from '../api/access-admin.js';
import { websiteAdminStore } from '../api/_lib/convex.js';
import { executeWebsiteBrief } from '../convex/websiteBriefState.js';
import { executeWebsiteAdmin } from '../convex/websiteProjectsState.js';
import { checkDocumentBytes, checkPhotoBytes } from '../convex/hasib/photoBytes.js';
import { PAYMENT_DOC_MAX_BYTES } from '../config/website-brief.js';
import { capabilitiesFor } from '../convex/hasib/capabilities.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_CLOUD, GREEN_SECRET, GREEN_SITE } from './helpers/green-env.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:5199';
const OUT = process.env.PAYMOB_E2E_OUT || 'work/paymob-e2e-browser';
await mkdir(OUT, { recursive: true });
const hash = t => createHash('sha256').update(t).digest('hex');
const OWNER = { token: '1'.repeat(64), csrf: '2'.repeat(64), email: 'owner@example.test' };
const ADMIN = { token: '3'.repeat(64), csrf: '4'.repeat(64), email: 'ahmed@bznsflowai.com' };
const SECOND = { token: '5'.repeat(64), email: 'second@example.test' };

// ── The backend: convexMemory behind the real Convex HTTP contract ───────────
const m = convexMemory();
const accounts = {};
for (const who of [OWNER, ADMIN, SECOND]) {
  accounts[who.email] = await m.db.insert('accounts', { email: who.email, name: 'Sara', phone: '+96890000000', role: 'customer', createdAt: m.now() });
  await m.db.insert('sessions', { accountId: accounts[who.email], tokenHash: hash(who.token), createdAt: m.now(), expiresAt: m.now() + 30 * 86400000 });
}
for (const email of [OWNER.email, SECOND.email]) await m.db.insert('blueAccessGrants', { email, plan: 'ascend', status: 'active', grantedAt: m.now(), grantedBy: ADMIN.email });

/** convex/http.ts's /website-brief and /website-admin routes: the byte check is the route's, never the caller's. */
async function convexSite(url, init) {
  const route = new URL(url).pathname.slice(1), args = JSON.parse(init.body);
  assert.equal(init.headers.Authorization, `Bearer ${GREEN_SECRET}`, 'the service secret travels with every call');
  if (route === 'website-brief') {
    delete args.fileCheck;
    if (args.operation === 'file_register') args.fileCheck = String(args.kind || '').startsWith('doc_')
      ? await checkDocumentBytes(m.ctx, args.storageId, PAYMENT_DOC_MAX_BYTES) : await checkPhotoBytes(m.ctx, args.storageId);
    return Response.json(await executeWebsiteBrief(m.ctx, args, m.now()));
  }
  if (route === 'website-admin') return Response.json(await executeWebsiteAdmin(m.ctx, args, m.now()));
  return new Response(null, { status: 404 });
}
const emails = [];
async function network(url, init) {
  if (url.startsWith(GREEN_SITE)) return convexSite(url, init);
  if (url === 'https://api.resend.com/emails') { emails.push(JSON.parse(init.body)); return Response.json({ id: `email_${emails.length}` }); }
  if (url.includes('/registrar/domains/search')) return Response.json({ results: JSON.parse(init.body).domains.map(domain => ({ domain, available: true, price: 11, premium: false })) });
  throw new Error(`unexpected network call: ${url}`);
}
const env = { VERCEL_ENV: 'preview', PUBLIC_SITE_ORIGIN: BASE, GREEN_CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SITE_URL: GREEN_SITE,
  CONVEX_SERVICE_SECRET: GREEN_SECRET, RESEND_API_KEY: 're_test', AUTH_FROM: 'BznsFlow <hello@bznsflowai.com>' };
const briefApi = createWebsiteBriefApi({ env, fetcher: network });
const adminApi = createAccessAdmin({ store: async () => ({}), websiteStore: websiteAdminStore({ env, fetcher: network }) });

/** Hand a browser request to a Node handler exactly as Vercel would, and its answer back. */
async function bridge(route, handler) {
  const request = route.request(), url = new URL(request.url()), raw = request.postData();
  const req = { method: request.method(), url: url.pathname + url.search, headers: { ...(await request.allHeaders()), host: url.host }, body: raw ? JSON.parse(raw) : undefined };
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(n) { this.statusCode = n; return this; }, end(v) { this.body = v; } };
  await handler(req, res);
  const headers = Object.fromEntries(Object.entries(res.headers).filter(([k]) => k !== 'set-cookie').map(([k, v]) => [k, String(v)]));
  return route.fulfill({ status: res.statusCode, headers, body: Buffer.isBuffer(res.body) ? res.body : String(res.body ?? '') });
}

const overview = { ok: true, csrfToken: OWNER.csrf, account: { email: OWNER.email }, plan: 'ascend', workspaceRole: 'manager', capabilities: capabilitiesFor('ascend'), dashboardAvailable: true,
  broadcastEnabled: false, connected: true, founderPreview: false, business: { name: 'Blue Studio', sector: 'Retail', sectorId: 'retail' },
  integration: { sender: '96890000000', path: 'coexistence', status: 'connected', checks: { routing: true, registered: true, path: true }, checkedAt: m.now() },
  messaging: { available: true, active: true, reason: '', broadcastAvailable: false, limits: { perMinute: 10, perDay: 100, usedToday: 0 } }, timezone: 'Asia/Muscat', migrationPending: false };
const setup = { ok: true, csrfToken: OWNER.csrf, available: true, status: 'connected', savedToAccount: true, profileVersion: 1, bzns: { markdown: '# Blue Studio', version: 1, publishedRevision: 1, unpublishedChanges: false },
  profile: { businessName: 'Blue Studio', sector: 'Retail', services: 'Abayas', prices: '', hours: '', location: '', humanContact: 'team@example.test', faqs: [], reviewed: true } };

async function open(browser, who, path, { width = 1280, lang = 'en' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const { hostname } = new URL(BASE);
  await context.addCookies([{ name: 'bf_session', value: who.token, domain: hostname, path: '/' }, ...(who.csrf ? [{ name: 'bf_csrf', value: who.csrf, domain: hostname, path: '/' }] : [])]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Convex storage: the upload URL the brief state machine handed out stores the posted bytes.
    if (url.origin === 'https://upload.test') {
      const bytes = route.request().postDataBuffer() || Buffer.alloc(0);
      const storageId = m.putFile({ contentType: route.request().headers()['content-type'], size: bytes.length, bytes: new Uint8Array(bytes) });
      return route.fulfill({ status: 200, json: { storageId } });
    }
    if (url.origin !== new URL(BASE).origin) return route.abort();
    if (url.pathname === '/api/auth-session') return route.fulfill({ status: 200, json: { ok: true, csrfToken: who.csrf,
      account: who === ADMIN ? { email: ADMIN.email } : { id: 'a1', email: who.email, accessPlan: 'ascend', profileComplete: true } } });
    if (url.pathname === '/api/access-admin') return bridge(route, adminApi);
    if (url.pathname === '/api/layla-meta') {
      const surface = url.searchParams.get('surface');
      if (surface === 'website-brief') return bridge(route, briefApi);
      if (surface === 'dashboard' && route.request().method() === 'GET') return route.fulfill({ status: 200, json: overview });
      if (surface === 'customer') return route.fulfill({ status: 200, json: setup });
      return route.fulfill({ status: 200, json: { ok: true, csrfToken: OWNER.csrf, items: [], cursor: null } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { ok: false } });
    return route.continue();
  });
  await page.goto(`${BASE}${lang === 'ar' ? '' : '/en'}${path}`);
  return { context, page, errors };
}

const pdf = name => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% TEST — not a real document\n1 0 obj << >> endobj\n%%EOF\n') });
const jpg = name => ({ name, mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]) });
const png = name => ({ name, mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]) });
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const axe = async (page, scope) => (await new AxeBuilder({ page }).include(scope).analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);

const browser = await chromium.launch();
let count = 0;
try {
  // ── 1. The owner fills the brief, says yes to payments and sends everything ─
  {
    const { context, page, errors } = await open(browser, OWNER, '/layla/dashboard?tab=website');
    const wizard = page.locator('.ld-web');
    const next = () => wizard.getByRole('button', { name: 'Next', exact: true }).click();
    const onStep = name => wizard.getByRole('heading', { name, exact: true }).waitFor();
    await onStep('Your business');
    await wizard.getByLabel('Business name in English').fill('Blue Studio');
    await next(); await onStep('Contact & location');
    assert.equal(await wizard.getByLabel('Phone or WhatsApp').inputValue(), '+96890000000', 'the account phone is prefilled by the real state machine'); count++;
    await next(); await onStep('Look & feel');
    await wizard.getByLabel('I don’t have a logo. Please design a simple one.').check();
    await next(); await onStep('Pages & languages');
    await wizard.getByRole('radio', { name: 'Arabic and English' }).check();
    await next(); await onStep('Domain & email');
    await wizard.getByRole('button', { name: 'Check', exact: true }).click();
    await wizard.locator('.ld-web-domain-results li').first().getByRole('button', { name: 'Choose' }).click();
    await next(); await onStep('Online payments');

    await wizard.getByRole('radio', { name: /Yes, set up online payments/ }).check();
    // Both forms come from the real handler, which serves the PDFs bundled in api/_assets/paymob.
    // Both forms come from the real handler, which serves the PDFs bundled in api/_assets/paymob. (Playwright
    // cancels downloads answered by a route, so the link's target is fetched in the page and hashed instead.)
    for (const [index, file] of [[0, 'merchant-application.pdf'], [1, 'vat-declaration.pdf']]) {
      const link = wizard.locator('.ld-web-pay-form').nth(index);
      assert.equal(await link.getAttribute('download'), '', `${file}: the card is a download link`);
      const served = await page.evaluate(async href => {
        const r = await fetch(href);
        const digest = await crypto.subtle.digest('SHA-256', await r.arrayBuffer());
        return [r.status, r.headers.get('content-type'), r.headers.get('content-disposition'), [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')];
      }, await link.getAttribute('href'));
      const bundled = createHash('sha256').update(await readFile(new URL(`../api/_assets/paymob/${file}`, import.meta.url))).digest('hex');
      assert.deepEqual(served, [200, 'application/pdf', `attachment; filename="${index ? 'Paymob-VAT-declaration.pdf' : 'Paymob-merchant-application.pdf'}"`, bundled], `${file} is served byte for byte`); count++;
    }
    await wizard.getByLabel('Full name').fill('Sara Al Balushi');
    await wizard.getByLabel('Personal mobile number').fill('+968 9123 4567');
    const slot = name => wizard.locator('.ld-web-doc').filter({ has: page.locator('.ld-web-doc-label', { hasText: name }) });
    const add = async (name, files, expect) => {
      await slot(name).locator('input[type="file"]').setInputFiles(files);
      await slot(name).locator('.ld-web-doc-files li', { hasText: expect }).waitFor();
    };
    // A file named .pdf that is really a program passes the browser's type check and is refused by the server's byte check.
    await slot('Commercial register').locator('input[type="file"]').setInputFiles({ name: 'cr.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ\x90\x00 not a pdf') });
    await slot('Commercial register').locator('.ld-inline-error', { hasText: 'That file isn’t a valid image or PDF.' }).waitFor(); count++;
    assert.equal(m.table('websiteBriefFiles').length, 0, 'the refused file was never registered'); count++;
    await add('Commercial register', pdf('commercial-register.pdf'), 'commercial-register.pdf');
    await add('ID cards', [jpg('id-sara.jpg'), png('id-ali.png')], 'id-ali.png');
    await add('Proof of bank account', pdf('statement.pdf'), 'statement.pdf');
    await add('Signed Paymob forms', [pdf('application-signed.pdf'), pdf('vat-signed.pdf')], 'vat-signed.pdf');
    await add('Invoices', pdf('invoice-1001.pdf'), 'invoice-1001.pdf');
    assert.equal(await wizard.locator('.ld-web-pay-progress').textContent(), '5 of 5 required documents added'); count++;
    assert.deepEqual(m.table('websiteBriefFiles').map(f => [f.kind, f.name]), [['doc_cr', 'commercial-register.pdf'], ['doc_id', 'id-sara.jpg'], ['doc_id', 'id-ali.png'],
      ['doc_bank', 'statement.pdf'], ['doc_forms', 'application-signed.pdf'], ['doc_forms', 'vat-signed.pdf'], ['doc_invoice', 'invoice-1001.pdf']], 'each registered in its slot with its name'); count++;
    assert.deepEqual(await axe(page, '.ld-web'), [], 'payments step accessibility'); count++;
    assert.equal(await noOverflow(page), true); count++;
    await page.screenshot({ path: `${OUT}/payments-step-en-1280.png`, fullPage: true });
    await wizard.locator('.ld-web-docs').screenshot({ path: `${OUT}/payments-documents-en-1280.png` });

    await next(); await onStep('Review & send');
    assert.match(await wizard.locator('.ld-web-review').nth(5).textContent(), /Signed Paymob forms: 2 file/); count++;
    await wizard.getByRole('button', { name: 'Send to BznsFlow' }).click();
    await wizard.getByRole('heading', { name: 'Your website is on its way' }).waitFor(); count++;

    // The email Ahmed receives, built by the real email module from what Convex stored.
    assert.equal(emails.length, 1); count++;
    const [email] = emails;
    assert.deepEqual([email.to, email.subject, email.reply_to], [[ADMIN.email], 'Website brief + Paymob — Blue Studio', OWNER.email]); count++;
    assert.match(email.text, /Paymob contact \(personal\): Sara Al Balushi/); count++;
    assert.match(email.text, /Personal mobile: \+968 9123 4567/); count++;
    assert.deepEqual(email.attachments.map(a => a.filename), ['paymob-commercial-register-1.pdf', 'paymob-id-card-1.jpg', 'paymob-id-card-2.png', 'paymob-bank-proof-1.pdf',
      'paymob-signed-paymob-forms-1.pdf', 'paymob-signed-paymob-forms-2.pdf', 'paymob-invoice-1.pdf'], 'every document attached by what it is'); count++;
    assert.ok(email.attachments.every(a => a.path.startsWith('https://files.test/_storage_'))); count++;
    assert.equal(email.text.includes('MZ'), false); count++;

    assert.deepEqual(await page.locator('.ld-web-pay-track li').evaluateAll(li => li.map(x => x.className)), ['is-done', 'is-current', '', '', ''], 'documents received; sending to Paymob is next'); count++;
    assert.deepEqual(errors, []); count++;
    await page.screenshot({ path: `${OUT}/tracker-en-1280.png`, fullPage: true });
    await context.close();
  }

  // A second owner, sent straight through the same API in Node, whose set-up Ahmed will cancel.
  const secondDocs = [];
  for (const kind of ['doc_cr', 'doc_id', 'doc_bank', 'doc_forms', 'doc_invoice']) {
    const storageId = m.putFile({ contentType: 'application/pdf', size: 60, bytes: new TextEncoder().encode('%PDF-1.4 second') });
    const res = await executeWebsiteBrief(m.ctx, { operation: 'file_register', sessionHash: hash(SECOND.token), storageId, kind, name: `${kind}.pdf`, fileCheck: await checkDocumentBytes(m.ctx, storageId, PAYMENT_DOC_MAX_BYTES) }, m.now());
    assert.equal(res.ok, true);
    secondDocs.push({ kind, id: storageId });
  }
  assert.equal((await executeWebsiteBrief(m.ctx, { operation: 'submit', sessionHash: hash(SECOND.token), version: 0, photoIds: [], docIds: secondDocs,
    fields: { nameEn: 'Second Shop', phone: '+968 9000 1111', languages: 'en', domainChoice: 'second-shop.com', mailboxLocal: 'info', designLogo: true,
      payments: 'yes', payContactName: 'Ali', payContactPhone: '+968 9000 2222' } }, m.now())).ok, true);

  // ── 2. Ahmed works the queue: contact, documents, the next stage, and a cancellation ─
  {
    const { context, page, errors } = await open(browser, ADMIN, '/owner/websites');
    const row = name => page.locator('.owner-website').filter({ has: page.getByRole('heading', { name }) });
    await row('Blue Studio').locator('.owner-website-payments').waitFor();
    assert.equal(await row('Blue Studio').locator('a[href^="tel:"]').getAttribute('href'), 'tel:+96891234567'); count++;
    assert.equal(await row('Blue Studio').locator('.owner-website-docs a').count(), 7); count++;
    await row('Blue Studio').getByRole('button', { name: 'Payments done: Sent to Paymob' }).click();
    await page.getByRole('status').filter({ hasText: /Saved/ }).waitFor();
    assert.equal((await executeWebsiteBrief(m.ctx, { operation: 'get', sessionHash: hash(OWNER.token) }, m.now())).value.project.payments.stage, 'submitted'); count++;

    page.once('dialog', dialog => dialog.accept());
    await row('Second Shop').getByRole('button', { name: 'Cancel payments set-up' }).click();
    await row('Second Shop').locator('.owner-website-payments').waitFor({ state: 'detached' });
    for (const d of secondDocs) assert.ok(m.deletedFiles.includes(d.id), 'the cancelled owner’s documents are deleted');
    count++;
    const second = m.table('websiteBriefs').find(b => b.fields.nameEn === 'Second Shop');
    assert.deepEqual([second.docIds, second.fields.payments, 'payContactPhone' in second.fields], [[], 'no', false]); count++;
    assert.equal(await row('Blue Studio').locator('.owner-website-payments').count(), 1, 'the other owner is untouched'); count++;
    assert.equal(await noOverflow(page), true); count++;
    assert.deepEqual(errors, []); count++;
    await page.screenshot({ path: `${OUT}/owner-websites-en-1280.png`, fullPage: true });
    await context.close();
  }

  // ── 3. The owner comes back in Arabic on a phone and sees where Paymob is ────
  {
    const { context, page, errors } = await open(browser, OWNER, '/layla/dashboard?tab=website', { width: 375, lang: 'ar' });
    await page.getByRole('heading', { name: 'الدفع الإلكتروني' }).waitFor();
    assert.deepEqual(await page.locator('.ld-web-pay-track li').evaluateAll(li => li.map(x => x.className)), ['is-done', 'is-done', 'is-current', '', ''], 'ar: sent to Paymob, approval next'); count++;
    assert.match(await page.locator('.ld-web-pay-track li').nth(1).textContent(), /أُرسلت إلى Paymob/); count++;
    assert.deepEqual(await axe(page, '.ld-web'), [], 'ar tracker accessibility'); count++;
    assert.equal(await noOverflow(page), true); count++;
    assert.deepEqual(errors, []); count++;
    await page.screenshot({ path: `${OUT}/tracker-ar-375.png`, fullPage: true });
    await context.close();
  }
  console.log(`${count} Paymob end-to-end assertions passed: browser → API → Convex logic → email → Ahmed's queue → owner. No external network.`);
} finally {
  await browser.close();
}
