// Apex (Ahmed, 2026-10-27): custom enterprise solutions, by request. A company names the agent functions it
// needs on bznsflowai.com/apex; Ahmed receives an email and works the request in /owner/apex.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { APEX_PER_EMAIL_PER_DAY, normalizeApexRequest } from '../config/apex.js';
import { executeApex, executeApexAdmin } from '../convex/apexState.js';
import { createApexApi } from '../api/_lib/apex-api.js';
import { apexEmail } from '../api/_lib/apex-email.js';
import { createAccessAdmin } from '../api/access-admin.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const good = { company: '  Nour Group ', name: 'Sara', email: 'Sara@Nour.OM ', phone: '00968 9000-0000', branches: '6-20', staff: '21+', system: 'odoo', systemNote: 'Odoo 17\non premise',
  functions: ['erp', 'branches', 'erp', 'hack'], need: 'Answer stock questions\nfrom Odoo for all branches.', lang: 'ar' };

test('a request is trimmed and bounded; company, name, email, a function and the need are required', () => {
  assert.deepEqual(normalizeApexRequest(good), { ok: true, request: { company: 'Nour Group', name: 'Sara', email: 'sara@nour.om', functions: ['erp', 'branches'],
    need: 'Answer stock questions\nfrom Odoo for all branches.', lang: 'ar', phone: '+96890000000', branches: '6-20', staff: '21+', system: 'odoo', systemNote: 'Odoo 17 on premise' } });
  for (const [change, reason] of [[{ company: ' ' }, 'invalid_company'], [{ name: '' }, 'invalid_name'], [{ email: 'x@y' }, 'invalid_email'],
    [{ functions: ['nope'] }, 'invalid_functions'], [{ functions: 'erp' }, 'invalid_functions'], [{ need: 'short' }, 'invalid_need']]) {
    assert.deepEqual(normalizeApexRequest({ ...good, ...change }), { ok: false, reason }, reason);
  }
  const loose = normalizeApexRequest({ ...good, phone: '12', branches: '500', staff: 'lots', system: 'sap', systemNote: '' }).request;
  assert.deepEqual(Object.keys(loose).sort(), ['company', 'email', 'functions', 'lang', 'name', 'need'], 'unusable optional fields are dropped, not refused');
  assert.equal(normalizeApexRequest({ ...good, need: 'x'.repeat(3000) }).request.need.length, 2000);
});

// ── Convex ───────────────────────────────────────────────────────────────────

const tokens = { admin: 'e'.repeat(64), other: 'f'.repeat(64) };
const hash = t => createHash('sha256').update(t).digest('hex');
async function fixture() {
  const m = convexMemory({ start: Date.parse('2026-10-27T09:00:00+04:00') });
  for (const [email, token] of [['ahmed@bznsflowai.com', tokens.admin], ['someone@example.com', tokens.other]]) {
    const id = await m.db.insert('accounts', { email, name: 'x', role: 'customer', createdAt: m.now() });
    await m.db.insert('sessions', { accountId: id, tokenHash: hash(token), createdAt: m.now(), expiresAt: m.now() + 10 * 86400000 });
  }
  return { m, apex: args => executeApex(m.ctx, args, m.now()), admin: (args, token = tokens.admin) => executeApexAdmin(m.ctx, { sessionHash: hash(token), ...args }, m.now()) };
}

test('requests are stored as new; one email may send three a day; only the admin lists and moves them', async () => {
  const { m, apex, admin } = await fixture();
  const sent = await apex({ operation: 'request', request: good });
  assert.equal(sent.ok, true); assert.equal(sent.value.request.status, 'new');
  assert.equal((await apex({ operation: 'request', request: { ...good, need: 'x' } })).reason, 'invalid_need');
  for (let i = 1; i < APEX_PER_EMAIL_PER_DAY; i++) assert.equal((await apex({ operation: 'request', request: good })).ok, true);
  assert.equal((await apex({ operation: 'request', request: good })).reason, 'too_many_requests');
  m.advance(86400001);
  assert.equal((await apex({ operation: 'request', request: good })).ok, true, 'a day later the company may send again');
  assert.equal((await admin({ operation: 'list' }, tokens.other)).reason, 'admin_required');
  assert.equal((await executeApexAdmin(m.ctx, { operation: 'list', sessionHash: 'bad' }, m.now())).reason, 'sign_in_required');
  const listed = await admin({ operation: 'list' });
  assert.equal(listed.value.requests.length, APEX_PER_EMAIL_PER_DAY + 1); assert.equal(listed.value.open, APEX_PER_EMAIL_PER_DAY + 1);
  assert.ok(listed.value.requests[0].createdAt >= listed.value.requests.at(-1).createdAt, 'newest first');
  const id = sent.value.request.id;
  const moved = await admin({ operation: 'update', requestId: id, status: 'scoped', adminNote: '  Odoo stock + routing, quote sent ' });
  assert.deepEqual([moved.value.request.status, moved.value.request.adminNote], ['scoped', 'Odoo stock + routing, quote sent']);
  assert.equal((await admin({ operation: 'update', requestId: id, status: 'won' })).reason, 'invalid_status');
  assert.equal((await admin({ operation: 'update', requestId: 'nope', status: 'closed' })).reason, 'request_not_found');
  assert.equal((await admin({ operation: 'update', requestId: id, status: 'closed' }, tokens.other)).reason, 'admin_required');
});

// ── Public API ───────────────────────────────────────────────────────────────

const env = {};
const request = (method, body, headers = {}) => ({ method, body, url: '/api/lead?op=apex', headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, ...headers } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } });
const saved = { id: 'apexRequests_1', ...normalizeApexRequest(good).request, status: 'new', createdAt: 1 };

test('the public request checks the origin, meters each IP, ignores bots and emails Ahmed', async () => {
  const calls = [], emails = []; let hits = 0;
  const api = createApexApi({ env, store: async (op, args) => { calls.push({ op, args }); return { request: saved }; },
    rate: async () => ({ ip_hits: ++hits }), email: async input => { emails.push(input); return 'em_1'; } });
  const get = response(); await api(request('GET'), get);
  assert.equal(get.statusCode, 405);
  const foreign = response(); await api(request('POST', good, { origin: 'https://evil.example' }), foreign);
  assert.deepEqual([foreign.statusCode, foreign.body.reason], [403, 'origin']);
  const bot = response(); await api(request('POST', { ...good, website: 'spam.biz' }), bot);
  assert.deepEqual([bot.statusCode, bot.body.received, calls.length], [200, true, 0], 'a filled honeypot stores nothing');
  const ok = response(); await api(request('POST', { ...good, role: 'admin', status: 'scoped' }), ok);
  assert.deepEqual([ok.statusCode, ok.body], [200, { ok: true, received: true, emailed: true }]);
  assert.deepEqual(Object.keys(calls[0].args.request).sort(), ['branches', 'company', 'email', 'functions', 'lang', 'name', 'need', 'phone', 'staff', 'system', 'systemNote'], 'only the known fields reach Convex');
  assert.equal(emails[0].idempotencyKey, 'apex-apexRequests_1');
  assert.deepEqual([emails[0].message.to, emails[0].message.reply_to], [['ahmed@bznsflowai.com'], 'sara@nour.om']);
  for (let i = 0; i < 5; i++) await api(request('POST', good), response());
  const limited = response(); await api(request('POST', good), limited);
  assert.deepEqual([limited.statusCode, limited.body.reason], [429, 'rate_ip']);
});

test('a refused request keeps its reason, and a failed email never loses the request', async () => {
  const refuse = createApexApi({ env, store: async () => { throw new PilotError('too_many_requests', 429); }, rate: async () => ({ ip_hits: 0 }), email: async () => 'x' });
  const many = response(); await refuse(request('POST', good), many);
  assert.deepEqual([many.statusCode, many.body.reason], [429, 'too_many_requests']);
  const quiet = createApexApi({ env, store: async () => ({ request: saved }), rate: async () => { throw Error('db'); }, email: async () => { throw new PilotError('apex_email_failed', 502); } });
  const kept = response(); await quiet(request('POST', good), kept);
  assert.deepEqual([kept.statusCode, kept.body.ok, kept.body.emailed], [200, true, false]);
  const down = createApexApi({ env, store: async () => { throw Error('network'); }, rate: async () => ({ ip_hits: 0 }) });
  const unavailable = response(); await down(request('POST', good), unavailable);
  assert.deepEqual([unavailable.statusCode, unavailable.body.reason], [503, 'apex_unavailable']);
});

test('the email escapes what the company typed and names its functions', () => {
  const message = apexEmail({ ...saved, company: '<b>Nour</b>', need: 'Use <script>x</script>' });
  assert.ok(!message.html.includes('<script>') && message.html.includes('&lt;script&gt;'));
  assert.match(message.text, /ERP \/ Odoo connection, Branches and teams routing/);
  assert.equal(message.subject, 'Apex request — <b>Nour</b>', 'the subject is plain text, not HTML');
});

test('the admin queue route lists and moves requests, and maps refusals to statuses', async () => {
  const admin = (method, body) => ({ method, body, url: '/api/access-admin?op=apex', headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${tokens.admin}; bf_csrf=${'b'.repeat(64)}`, 'x-csrf-token': 'b'.repeat(64) } });
  const calls = [];
  const apexStore = async (op, args) => { calls.push({ op, args }); if (args.requestId === 'missing') throw new PilotError('request_not_found', 404); return op === 'list' ? { requests: [], open: 0 } : { request: { id: args.requestId } }; };
  const handler = createAccessAdmin({ store: async () => ({}), apexStore });
  const list = response(); await handler(admin('GET'), list);
  assert.deepEqual([list.statusCode, list.body.open], [200, 0]);
  const update = response(); await handler(admin('POST', { requestId: 'r1', status: 'contacted', adminNote: 'called', extra: 1 }), update);
  assert.deepEqual(calls[1].args, { sessionHash: hash(tokens.admin), requestId: 'r1', status: 'contacted', adminNote: 'called' });
  const missing = response(); await handler(admin('POST', { requestId: 'missing', status: 'closed' }), missing);
  assert.deepEqual([missing.statusCode, missing.body.reason], [404, 'request_not_found']);
  const signedOut = response(); await handler({ ...admin('GET'), headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN } }, signedOut);
  assert.equal(signedOut.statusCode, 401);
});
