// BznsBrain through the real setup API handler (api/_lib/layla/review-api.js) and the real Convex
// executors on the in-memory database: same-site and CSRF checks, the manager-only rule, Test Layla
// writing nothing, extraction failures writing nothing, and one Publish for bzns.md and the catalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewHandler } from '../api/_lib/layla/review-api.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { executeReview } from '../convex/reviewState.js';
import { executeCatalog } from '../convex/blueCatalogState.js';
import { executeBrain } from '../convex/brainState.js';
import { GREEN_CLOUD } from './helpers/green-env.mjs';
import { dentalDoc, scriptedModel } from './helpers/layla-conversation.mjs';

const env = { CONVEX_CLOUD_URL: GREEN_CLOUD, BLUE_REVIEW_SERVICE_SECRET: 'a'.repeat(64), OTP_SHARED_SECRET: 'otp-secret-for-tests', LEAD_ENDPOINT: 'https://leads.example.test/x' };
const unwrap = async r => { const v = await r; if (!v.ok) throw new PilotError(v.reason, 409); return v.value; };
function setup({ account = null, extract, websiteImport, env: extraEnv = {} } = {}) {
  const m = convexMemory();
  const model = scriptedModel(() => ({ reply: 'Cleaning is From 15 OMR.', intent: 'prices', sources: ['C1'], reason: 'Price from the catalog.' }));
  const handler = createReviewHandler({ env: { ...env, ...extraEnv }, now: m.now, generate: model, ...(extract ? { extract } : {}), ...(websiteImport ? { websiteImport } : {}),
    store: (operation, args) => unwrap(executeReview(m.ctx, { operation, ...args }, m.now())),
    catalog: (operation, args) => unwrap(executeCatalog(m.ctx, { operation, ...args }, m.now())),
    brain: (operation, args) => unwrap(executeBrain(m.ctx, { operation, ...args }, m.now())),
    accountStore: async operation => (operation === 'session' ? account : operation.startsWith('limit_') ? null : null) });
  let cookie = '', csrf = '';
  const call = async (body, headers = {}) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } };
    await handler({ method: body ? 'POST' : 'GET', headers: { host: 'www.bznsflowai.com', origin: 'https://www.bznsflowai.com', 'content-type': 'application/json', cookie: [cookie, account ? `bf_session=${'d'.repeat(64)}` : ''].filter(Boolean).join('; '), 'x-csrf-token': csrf, ...headers }, body }, res);
    if (res.headers['Set-Cookie']) cookie = res.headers['Set-Cookie'].split(';')[0];
    if (res.body?.csrfToken) csrf = res.body.csrfToken;
    return res;
  };
  return { m, call, model };
}
const tables = m => ['blueMessages', 'blueContacts', 'blueConversations'].map(t => m.table(t).length).join(',');

test('BznsBrain over the API: Test Layla writes nothing; same-site and CSRF are enforced', async () => {
  const s = setup();
  await s.call();
  assert.equal((await s.call({ action: 'bzns_save', markdown: dentalDoc('informative'), version: 0 })).statusCode, 200);
  const entry = { entryKey: crypto.randomUUID(), kind: 'service', nameEn: 'Cleaning', nameAr: '', category: '', benefitEn: '', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: '', prices: [{ type: 'from', currency: 'OMR', unit: '', label: 'From 15 OMR', amount: 15 }], source: 'manual', confidence: 1, laylaUseEn: '', laylaUseAr: '', sortOrder: 0 };
  assert.equal((await s.call({ action: 'catalog_save', entry })).statusCode, 200, 'a setup not yet saved to an account can keep a catalog');
  const before = tables(s.m);
  const draft = await s.call({ action: 'brain_test', variant: 'draft', history: [{ role: 'customer', text: 'How much is cleaning?' }] });
  assert.equal(draft.statusCode, 200, JSON.stringify(draft.body));
  assert.equal(draft.body.test.variant, 'draft');
  assert.match(draft.body.test.reply, /From 15 OMR/);
  assert.deepEqual(draft.body.test.sources.map(x => x.label), ['Cleaning'], 'sources resolve to what the owner wrote');
  assert.equal(draft.body.test.reason, 'Price from the catalog.');
  assert.equal(tables(s.m), before, 'no customer, conversation or message is created');
  assert.match(s.model.calls[0][0].content, /\[C1\] - Cleaning/, 'the draft catalog reaches the draft test');
  const published = await s.call({ action: 'brain_test', variant: 'published', history: [{ role: 'customer', text: 'How much is cleaning?' }] });
  assert.doesNotMatch(s.model.calls[1][0].content, /\[C1\] - Cleaning/, 'nothing unpublished reaches the published test');
  assert.equal(published.statusCode, 200);
  assert.equal((await s.call({ action: 'brain_state' }, { origin: 'https://evil.invalid' })).statusCode, 403);
  assert.equal((await s.call({ action: 'brain_state' }, { 'x-csrf-token': 'bad' })).statusCode, 403);
});

test('BznsBrain over the API: one Publish makes bzns.md and the catalog live', async () => {
  const s = setup();
  await s.call();
  await s.call({ action: 'bzns_save', markdown: dentalDoc('informative'), version: 0 });
  const entry = { entryKey: crypto.randomUUID(), kind: 'service', nameEn: 'Whitening', nameAr: '', category: '', benefitEn: '', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: '', prices: [{ type: 'fixed', currency: 'OMR', unit: '', label: '60 OMR', amount: 60 }], source: 'manual', confidence: 1, laylaUseEn: '', laylaUseAr: '', sortOrder: 0 };
  await s.call({ action: 'catalog_save', entry });
  const r = await s.call({ action: 'brain_publish' });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  assert.equal(r.body.bzns.publishedRevision, 1);
  assert.equal(r.body.profile.reviewed, true);
  assert.deepEqual(s.m.table('blueCatalogEntries').map(e => e.status), ['approved']);
  const bad = await s.call({ action: 'bzns_save', markdown: '---\nname: X\n---\n## About us\n[fill me]\n', version: r.body.bzns.version });
  assert.equal(bad.statusCode, 200);
  const refused = await s.call({ action: 'brain_publish' });
  assert.deepEqual([refused.statusCode, refused.body.reason], [400, 'bzns_invalid'], 'an incomplete document is refused with its reasons');
  assert.ok(refused.body.errors.length);
});

test('BznsBrain over the API: a model failure during extraction writes nothing; a team member cannot change knowledge', async () => {
  const failing = setup({ extract: async () => { const e = new Error('t'); e.reason = 'ai_timeout'; throw e; } });
  await failing.call();
  const r = await failing.call({ action: 'brain_extract', text: 'Cleaning: 15 OMR', sourceKind: 'paste', sourceLabel: 'Pasted' });
  assert.deepEqual([r.statusCode, r.body.extraction.ok, r.body.extraction.reason], [200, false, 'ai_timeout']);
  assert.equal(failing.m.table('brainProposals').length, 0);
  const staff = setup({ account: { email: 'staff@example.com', workspaceRole: 'employee' } });
  await staff.call();
  for (const action of ['brain_state', 'brain_publish', 'brain_behaviour', 'catalog_save', 'catalog_publish']) {
    const res = await staff.call({ action });
    assert.deepEqual([res.statusCode, res.body.reason], [403, 'manager_required'], action);
  }
});

test('Read website accepts a bare domain by adding https://', async () => {
  const asked = [];
  const s = setup({ env: { LAYLA_WEBSITE_IMPORT_ENABLED: 'true', BLUE_WEBSITE_IMPORT_ENABLED: 'true' }, websiteImport: async url => { asked.push(url); return { url, text: 'Cleaning from 15 OMR', partial: false }; } });
  await s.call();
  const res = await s.call({ action: 'brain_website', url: 'bznsflowai.com' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(asked, ['https://bznsflowai.com']);
  await s.call({ action: 'brain_website', url: 'https://www.example.com/menu' });
  assert.equal(asked[1], 'https://www.example.com/menu', 'an address with a scheme is passed through unchanged');
});
