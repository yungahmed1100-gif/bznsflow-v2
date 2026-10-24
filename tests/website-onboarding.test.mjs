// Ascend's website onboarding (Ahmed, 2026-10-23): a wizard that saves each step, a domain and mailbox
// BznsFlow registers, a delivery promised within three business days, and Ahmed's queue to deliver it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { addBusinessDays, domainCandidates, websiteDomain } from '../config/website-brief.js';
import { executeWebsiteBrief } from '../convex/websiteBriefState.js';
import { executeWebsiteAdmin } from '../convex/websiteProjectsState.js';
import { createWebsiteBriefApi, searchDomains } from '../api/_lib/website-brief-api.js';
import { createAccessAdmin } from '../api/access-admin.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const muscat = local => Date.parse(`${local}+04:00`);
const day = ms => new Date(ms + 4 * 3600000).toISOString().slice(0, 16);

test('the website is due at 17:00 Muscat on the third working day after the brief, Sunday to Thursday', () => {
  // 2026-10-25 is a Sunday.
  assert.equal(day(addBusinessDays(muscat('2026-10-25T00:00'))), '2026-10-28T17:00', 'Sunday: Monday, Tuesday, Wednesday');
  assert.equal(day(addBusinessDays(muscat('2026-10-25T23:59'))), '2026-10-28T17:00', 'any time that Sunday, Muscat time');
  assert.equal(day(addBusinessDays(muscat('2026-10-26T20:00'))), '2026-10-29T17:00', 'Monday: due Thursday');
  assert.equal(day(addBusinessDays(muscat('2026-10-27T09:00'))), '2026-11-01T17:00', 'Tuesday: the weekend is skipped, due Sunday');
  assert.equal(day(addBusinessDays(muscat('2026-10-29T16:59'))), '2026-11-03T17:00', 'Thursday: due Tuesday');
  assert.equal(day(addBusinessDays(muscat('2026-10-30T09:00'))), '2026-11-03T17:00', 'Friday: due Tuesday');
  assert.equal(day(addBusinessDays(muscat('2026-10-31T23:30'))), '2026-11-03T17:00', 'Saturday: due Tuesday');
  assert.equal(day(addBusinessDays(Date.parse('2026-10-24T20:30Z'))), '2026-10-28T17:00', 'Saturday 20:30 UTC is already Sunday in Muscat');
});

test('names to look up come from what the owner typed; only .com, .net and .co, never BznsFlow’s', () => {
  assert.deepEqual(domainCandidates('Nour Abayas'), ['nour-abayas.com', 'nour-abayas.net', 'nour-abayas.co']);
  assert.deepEqual(domainCandidates('https://www.Nour.NET/shop?x=1'), ['nour.net', 'nour.com', 'nour.co'], 'a typed ending goes first');
  assert.deepEqual(domainCandidates('nour.om'), ['nour.com', 'nour.net', 'nour.co'], 'an ending we do not sell is replaced');
  assert.deepEqual(domainCandidates('نور العبايات'), []);
  assert.deepEqual(domainCandidates('bznsflow'), []);
  assert.equal(websiteDomain('a'.repeat(64) + '.com'), false);
  assert.equal(websiteDomain('-nour.com'), false);
});

test('a registrar answer is offered only when free, not premium and within the price Ascend covers', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ results: [
      { domain: 'nour.com', available: true, price: 11.25, premium: false },
      { domain: 'nour.net', available: false },
      { domain: 'nour.co', available: true, price: 29.99, premium: false },
      { domain: 'nour.shop', available: 'true', price: 9, premium: true },
    ] }), { status: 200 });
  };
  const results = await searchDomains(['nour.com', 'nour.net', 'nour.co', 'nour.shop', 'nour.biz'], { env: {}, fetcher });
  assert.deepEqual(results.map(r => r.status), ['available', 'taken', 'unavailable', 'unavailable', 'unknown']);
  assert.equal(calls[0].url, 'https://api.vercel.com/v1/registrar/domains/search');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal('Authorization' in calls[0].init.headers, false, 'the search needs no account, so no token is sent');
  assert.equal((await searchDomains(['nour.co'], { env: { WEBSITE_DOMAIN_MAX_USD: '30' }, fetcher }))[0].status, 'available', 'the cap is configurable');
  await assert.rejects(searchDomains(['nour.com'], { env: {}, fetcher: async () => new Response('', { status: 500 }) }), e => e.code === 'domain_check_unavailable');
});

// ── Convex: drafts, the delivery project, Ahmed's queue ──────────────────────

const tokens = { owner: 'a'.repeat(64), admin: 'e'.repeat(64), other: 'f'.repeat(64) };
const hash = t => createHash('sha256').update(t).digest('hex');
const fields = { nameEn: 'Nour Abayas', phone: '+968 9000 0000', languages: 'both', domainChoice: 'nourabayas.com', mailboxLocal: 'info', designLogo: true };

async function fixture() {
  const m = convexMemory({ start: muscat('2026-10-25T10:00') });
  const now = m.now();
  const account = async (email, token, draftHash) => {
    const id = await m.db.insert('accounts', { email, name: 'Sara', role: 'customer', createdAt: now, ...(draftHash ? { draftHash } : {}) });
    await m.db.insert('sessions', { accountId: id, tokenHash: hash(token), createdAt: now, expiresAt: now + 30 * 86400000 });
    return id;
  };
  const accountId = await account('owner@example.com', tokens.owner, 'd'.repeat(64));
  await account('ahmed@bznsflowai.com', tokens.admin);
  await account('someone@example.com', tokens.other);
  await m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan: 'ascend', status: 'active', grantedAt: now, grantedBy: 'ahmed@bznsflowai.com' });
  await m.db.insert('blueReviewSessions', { sessionHash: 'd'.repeat(64), profile: { businessName: 'Nour', services: 'Abayas', hours: '9–9', location: 'Muscat' } });
  const brief = args => executeWebsiteBrief(m.ctx, { sessionHash: hash(tokens.owner), ...args }, m.now());
  const admin = (args, token = tokens.admin) => executeWebsiteAdmin(m.ctx, { sessionHash: hash(token), ...args }, m.now());
  return { m, accountId, brief, admin };
}

test('the approved catalog fills the services, so the owner checks rather than retypes', async () => {
  const f = await fixture();
  for (const [order, nameEn] of [[1, 'Daily abaya'], [2, 'Evening abaya']]) {
    await f.m.db.insert('blueCatalogEntries', { ownerKey: String(f.accountId), status: 'approved', order, entryKey: `e${order}`, nameEn, nameAr: '', prices: [] });
  }
  await f.m.db.insert('blueCatalogEntries', { ownerKey: String(f.accountId), status: 'draft', order: 3, entryKey: 'e3', nameEn: 'Unapproved', nameAr: '', prices: [] });
  assert.equal((await f.brief({ operation: 'get' })).value.fields.services, 'Daily abaya\nEvening abaya');
});

test('each step saves a draft the owner resumes from, on any device', async () => {
  const f = await fixture();
  assert.equal((await f.brief({ operation: 'save_draft', step: 2, fields: { nameEn: 'Nour', unknownKey: 'dropped', about: 'Abayas' }, photoIds: [] })).ok, true);
  const { value } = await f.brief({ operation: 'get' });
  assert.deepEqual([value.draft.step, value.fields, value.prefilled], [2, { nameEn: 'Nour', about: 'Abayas' }, []], 'the draft wins over the prefill, and unknown keys are not kept');
  assert.equal((await f.brief({ operation: 'save_draft', step: 6, fields: {}, photoIds: [] })).reason, 'invalid_brief', 'there are six steps');
  assert.equal((await f.brief({ operation: 'save_draft', step: 1, fields: { about: 'x'.repeat(2001) }, photoIds: [] })).reason, 'invalid_brief');
  assert.equal((await f.brief({ operation: 'save_draft', step: 1, fields: { about: { nested: true } }, photoIds: [] })).reason, 'invalid_brief');
  // A file id in a draft must be this owner's registered upload.
  const foreign = f.m.putFile({ contentType: 'image/png' });
  assert.equal((await f.brief({ operation: 'save_draft', step: 2, fields: {}, logoId: foreign, photoIds: [] })).reason, 'invalid_file');
});

test('the first brief starts the delivery clock; later versions keep it and the draft is cleared', async () => {
  const f = await fixture();
  await f.brief({ operation: 'save_draft', step: 5, fields, photoIds: [] });
  const sent = await f.brief({ operation: 'submit', version: 0, fields, photoIds: [] });
  assert.equal(sent.ok, true, sent.reason);
  assert.deepEqual(sent.value.project, { stage: 'received', stageAt: { received: f.m.now() }, dueAt: muscat('2026-10-28T17:00'),
    domain: 'nourabayas.com', mailbox: 'info@nourabayas.com', liveUrl: '', delayReason: '' });
  assert.equal(f.m.table('websiteDrafts').length, 0);

  // Before the domain is registered, a change of name follows the newest brief; the date does not move.
  f.m.advance(2 * 86400000);
  const changed = await f.brief({ operation: 'submit', version: 1, fields: { ...fields, domainChoice: 'nour.net', mailboxLocal: 'hello' }, photoIds: [] });
  assert.deepEqual([changed.value.project.domain, changed.value.project.mailbox, changed.value.project.dueAt], ['nour.net', 'hello@nour.net', muscat('2026-10-28T17:00')]);
  assert.equal(f.m.table('websiteProjects').length, 1);

  // Once registered, the domain is fixed.
  const [project] = f.m.table('websiteProjects');
  assert.equal((await f.admin({ operation: 'project_update', projectId: project._id, action: 'advance' })).ok, true);
  const late = await f.brief({ operation: 'submit', version: 2, fields: { ...fields, domainChoice: 'other.com' }, photoIds: [] });
  assert.equal(late.value.project.domain, 'nour.net');
});

test('domain lookups are limited to 30 an hour per owner', async () => {
  const f = await fixture();
  for (let i = 0; i < 30; i++) assert.equal((await f.brief({ operation: 'domain_rate' })).ok, true);
  assert.equal((await f.brief({ operation: 'domain_rate' })).reason, 'too_many');
  f.m.advance(3600000);
  assert.equal((await f.brief({ operation: 'domain_rate' })).ok, true, 'a new hour, a new allowance');
});

test('only Ahmed sees the queue and moves a website; each move is what the owner sees', async () => {
  const f = await fixture();
  await f.brief({ operation: 'submit', version: 0, fields, photoIds: [] });
  assert.equal((await f.admin({ operation: 'projects' }, tokens.other)).reason, 'admin_required');
  assert.equal((await f.admin({ operation: 'projects' }, tokens.owner)).reason, 'admin_required', 'not even the owner of the website');
  assert.equal((await f.admin({ operation: 'projects' }, 'c'.repeat(64))).reason, 'sign_in_required');

  const { value } = await f.admin({ operation: 'projects' });
  assert.equal(value.open.length, 1);
  const [row] = value.open;
  assert.deepEqual([row.business, row.email, row.domain, row.mailbox, row.stage], ['Nour Abayas', 'owner@example.com', 'nourabayas.com', 'info@nourabayas.com', 'received']);
  const move = args => f.admin({ operation: 'project_update', projectId: row.id, ...args });

  assert.equal((await move({ action: 'set_due', dueAt: muscat('2026-11-02T17:00') })).reason, 'reason_required', 'a new date needs a reason the owner can read');
  assert.equal((await move({ action: 'set_due', dueAt: f.m.now() + 90 * 86400000, reason: 'x' })).reason, 'invalid_due');
  assert.equal((await move({ action: 'set_due', dueAt: muscat('2026-11-02T17:00'), reason: 'Waiting for your logo' })).ok, true);
  assert.equal((await move({ action: 'note', note: 'Prefers green' })).ok, true);

  for (const stage of ['domain', 'mailbox', 'building']) assert.equal((await move({ action: 'advance' })).value.project.stage, stage);
  assert.equal((await move({ action: 'advance' })).reason, 'live_url_required');
  assert.equal((await move({ action: 'advance', liveUrl: 'http://nourabayas.com' })).reason, 'live_url_required', 'https only');
  const live = await move({ action: 'advance', liveUrl: 'https://nourabayas.com' });
  assert.equal(live.value.project.stage, 'live');
  assert.equal((await move({ action: 'advance' })).reason, 'invalid_state');

  const seen = (await f.brief({ operation: 'get' })).value.project;
  assert.deepEqual([seen.stage, seen.liveUrl, seen.delayReason, 'note' in seen], ['live', 'https://nourabayas.com', '', false], 'the internal note never reaches the owner');
  assert.deepEqual(Object.keys(seen.stageAt), ['received', 'domain', 'mailbox', 'building', 'live']);
  const queue = (await f.admin({ operation: 'projects' })).value;
  assert.deepEqual([queue.open.length, queue.live.length], [0, 1]);
  assert.equal((await f.admin({ operation: 'project_update', projectId: 'websiteProjects_nope', action: 'advance' })).reason, 'project_not_found');
});

test('the queue lists the soonest due first', async () => {
  const f = await fixture();
  const ids = [];
  for (const [due, stage] of [[3, 'building'], [1, 'received'], [2, 'domain']]) {
    ids.push(await f.m.db.insert('websiteProjects', { accountId: f.accountId, stage, stageAt: {}, dueAt: f.m.now() + due * 86400000, createdAt: 0, updatedAt: 0 }));
  }
  const { value } = await f.admin({ operation: 'projects' });
  assert.deepEqual(value.open.map(p => p.stage), ['received', 'domain', 'building']);
});

// ── HTTP ─────────────────────────────────────────────────────────────────────

const env = { PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, VERCEL_ENV: 'production' };
const csrf = 'b'.repeat(64);
const request = (method, body, url = '/api/layla-meta?surface=website-brief', token = tokens.owner) => ({ method, body, url,
  headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${token}; bf_csrf=${csrf}`, 'x-csrf-token': csrf } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } });

test('a domain lookup asks Convex for the allowance first, and Latin-less text costs nothing', async () => {
  const calls = [], lookups = [];
  const store = async (op, args) => { calls.push(op); if (op === 'domain_rate' && calls.length > 1) throw new PilotError('too_many', 409); return null; };
  const fetcher = async (url, init) => { lookups.push(JSON.parse(init.body)); return new Response(JSON.stringify({ results: [{ domain: 'nour.com', available: true, price: 11, premium: false }] })); };
  const handler = createWebsiteBriefApi({ env, store, fetcher });
  const res = response();
  await handler(request('POST', { action: 'domain_check', query: 'Nour' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.results[0], { domain: 'nour.com', status: 'available' });
  assert.deepEqual(lookups, [{ domains: ['nour.com', 'nour.net', 'nour.co'] }]);
  const arabic = response();
  await handler(request('POST', { action: 'domain_check', query: 'نور' }), arabic);
  assert.deepEqual([arabic.statusCode, arabic.body.results, calls.length], [200, [], 1], 'no allowance spent, no lookup made');
  const spent = response();
  await handler(request('POST', { action: 'domain_check', query: 'Nour' }), spent);
  assert.deepEqual([spent.statusCode, spent.body.reason, lookups.length], [409, 'too_many', 1]);
});

test('the queue is reached through access-admin with the session and CSRF token', async () => {
  const calls = [];
  const websiteStore = async (op, args) => { calls.push({ op, args }); return op === 'projects' ? { open: [], live: [] } : { project: {} }; };
  const handler = createAccessAdmin({ store: async () => ({}), websiteStore });
  const list = response();
  await handler(request('GET', undefined, '/api/access-admin?op=websites', tokens.admin), list);
  assert.deepEqual([list.statusCode, list.body], [200, { ok: true, open: [], live: [] }]);
  const forged = request('POST', { projectId: 'p', action: 'advance' }, '/api/access-admin?op=websites', tokens.admin);
  delete forged.headers['x-csrf-token'];
  const refused = response();
  await handler(forged, refused);
  assert.equal(refused.statusCode, 403);
  const moved = response();
  await handler(request('POST', { projectId: 'p', action: 'set_due', dueAt: 1_800_000_000_000, reason: 'Logo', extra: 'ignored' }, '/api/access-admin?op=websites', tokens.admin), moved);
  assert.equal(moved.statusCode, 200);
  assert.deepEqual(calls.at(-1), { op: 'project_update', args: { sessionHash: hash(tokens.admin), projectId: 'p', action: 'set_due', reason: 'Logo', dueAt: 1_800_000_000_000 } });
  const denied = response();
  await createAccessAdmin({ websiteStore: async () => { throw new PilotError('admin_required', 403); } })(request('GET', undefined, '/api/access-admin?op=websites'), denied);
  assert.deepEqual([denied.statusCode, denied.body.reason], [403, 'admin_required']);
});
