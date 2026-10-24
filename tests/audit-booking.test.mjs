// The free business audit (Ahmed, 2026-10-24): bookable on bznsflowai.com/audit, Sunday to Thursday 10:00–17:00
// Muscat, and the founder's Audits tab. Also the founder's Ascend test bench: Layla stays general, Dental is preview-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditSlots, normalizeAuditBooking, validAuditSlot } from '../config/audit.js';
import { executeAudit, executeAuditAdmin } from '../convex/auditState.js';
import { onIndustryPlan } from '../convex/blueContacts.js';
import { createAuditApi } from '../api/_lib/audit-api.js';
import { auditEmail, auditInvite } from '../api/_lib/audit-email.js';
import { createAccessAdmin } from '../api/access-admin.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { dashboardMap } from '../src/lib/dashboard/navigation.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const muscat = local => Date.parse(`${local}+04:00`);
const local = ms => new Date(ms + 4 * 3600000).toISOString().slice(0, 16).replace('T', ' ');

test('open times are Sunday to Thursday, 10:00 to 16:30 Muscat, 12 hours ahead and up to three weeks out', () => {
  // 2026-10-25 is a Sunday; it is 09:00 there.
  const now = muscat('2026-10-25T09:00');
  const slots = auditSlots(now);
  assert.equal(local(slots[0]), '2026-10-26 10:00', 'Sunday 09:00 + 12h is past closing, so Monday opens the list');
  assert.ok(slots.every(at => { const d = new Date(at + 4 * 3600000); return d.getUTCDay() <= 4; }), 'never Friday or Saturday');
  assert.ok(slots.every(at => { const h = new Date(at + 4 * 3600000).getUTCHours(); return h >= 10 && h < 17; }), 'inside opening hours');
  assert.ok(slots.map(local).includes('2026-10-26 16:30') && !slots.map(local).includes('2026-10-26 17:00'), 'the last slot starts at 16:30');
  assert.ok(slots.at(-1) <= now + 21 * 86400000, 'no further than three weeks');
  assert.equal(slots.filter(at => local(at).startsWith('2026-10-26')).length, 14, 'fourteen 30-minute slots a day');
  const lead = auditSlots(muscat('2026-10-26T01:00'));
  assert.equal(local(lead[0]), '2026-10-26 13:00', 'the first slot is at least 12 hours away');
  const taken = slots[3];
  assert.ok(!auditSlots(now, [taken]).includes(taken), 'a booked time is no longer offered');
  assert.equal(validAuditSlot(taken, now), true);
  assert.equal(validAuditSlot(taken + 60000, now), false, 'only slot starts');
  assert.equal(validAuditSlot(muscat('2026-10-30T10:00'), now), false, 'Friday');
});

test('booking details are trimmed and bounded; a name and a real email are required', () => {
  assert.deepEqual(normalizeAuditBooking({ name: '  Sara  ', email: 'Sara@Example.COM ', phone: '00968 9000-0000', industry: 'retail', business: 'Nour', note: 'Hi\nthere', lang: 'ar' }),
    { ok: true, booking: { name: 'Sara', email: 'sara@example.com', lang: 'ar', phone: '+96890000000', business: 'Nour', industry: 'retail', note: 'Hi there' } });
  assert.deepEqual(normalizeAuditBooking({ name: 'Sara', email: 'sara@example' }), { ok: false, reason: 'invalid_email' });
  assert.deepEqual(normalizeAuditBooking({ name: ' ', email: 'sara@example.com' }), { ok: false, reason: 'invalid_name' });
  const loose = normalizeAuditBooking({ name: 'Sara', email: 'sara@example.com', phone: '12', industry: 'aliens' }).booking;
  assert.deepEqual(Object.keys(loose).sort(), ['email', 'lang', 'name'], 'unusable optional fields are dropped, not refused');
});

// ── Convex ───────────────────────────────────────────────────────────────────

const tokens = { admin: 'e'.repeat(64), other: 'f'.repeat(64) };
const hash = t => createHash('sha256').update(t).digest('hex');
async function fixture() {
  const m = convexMemory({ start: muscat('2026-10-25T09:00') });
  for (const [email, token] of [['ahmed@bznsflowai.com', tokens.admin], ['someone@example.com', tokens.other]]) {
    const id = await m.db.insert('accounts', { email, name: 'x', role: 'customer', createdAt: m.now() });
    await m.db.insert('sessions', { accountId: id, tokenHash: hash(token), createdAt: m.now(), expiresAt: m.now() + 86400000 });
  }
  return { m, audit: args => executeAudit(m.ctx, args, m.now()), admin: (args, token = tokens.admin) => executeAuditAdmin(m.ctx, { sessionHash: hash(token), ...args }, m.now()) };
}

test('a visitor books an open time once; nobody else can take it, and the public list shows times only', async () => {
  const { m, audit } = await fixture();
  const { value: { slots } } = await audit({ operation: 'slots' });
  const startAt = slots[0];
  const booked = await audit({ operation: 'book', startAt, booking: { name: 'Sara', email: 'sara@example.com', lang: 'en' } });
  assert.equal(booked.ok, true);
  assert.equal(booked.value.booking.status, 'booked');
  assert.deepEqual(await audit({ operation: 'book', startAt, booking: { name: 'Omar', email: 'omar@example.com' } }), { ok: false, reason: 'slot_taken' });
  assert.deepEqual(await audit({ operation: 'book', startAt: slots[1], booking: { name: 'Sara', email: 'SARA@example.com' } }), { ok: false, reason: 'already_booked' }, 'one upcoming audit per email');
  assert.deepEqual(await audit({ operation: 'book', startAt: muscat('2026-10-30T10:00'), booking: { name: 'Omar', email: 'omar@example.com' } }), { ok: false, reason: 'invalid_slot' });
  assert.deepEqual(await audit({ operation: 'book', startAt: slots[1], booking: { name: 'Omar', email: 'omar' } }), { ok: false, reason: 'invalid_email' });
  const after = await audit({ operation: 'slots' });
  assert.ok(!after.value.slots.includes(startAt));
  assert.deepEqual(Object.keys(after.value), ['slots']);
  assert.ok(after.value.slots.every(n => typeof n === 'number'), 'no names or emails in the public answer');
  assert.equal((await m.db.query('auditBookings').collect()).length, 1);
});

test('only the BznsFlow admin lists the calendar and marks a booking done or cancelled', async () => {
  const { audit, admin } = await fixture();
  const { value: { slots } } = await audit({ operation: 'slots' });
  const { value: { booking } } = await audit({ operation: 'book', startAt: slots[2], booking: { name: 'Sara', email: 'sara@example.com', business: 'Nour' } });
  const from = muscat('2026-10-25T00:00'), to = from + 7 * 86400000;
  assert.deepEqual(await admin({ operation: 'list', from, to }, tokens.other), { ok: false, reason: 'admin_required' });
  assert.deepEqual(await executeAuditAdmin({ db: { query: () => { throw Error('no'); } } }, { operation: 'list', sessionHash: 'x' }), { ok: false, reason: 'sign_in_required' });
  const list = await admin({ operation: 'list', from, to });
  assert.deepEqual([list.value.upcoming, list.value.bookings[0].business], [1, 'Nour']);
  assert.deepEqual(await admin({ operation: 'list', from, to: from + 90 * 86400000 }), { ok: false, reason: 'invalid_range' });
  assert.deepEqual(await admin({ operation: 'update', bookingId: booking.id, status: 'done', adminNote: 'Good fit' }, tokens.other), { ok: false, reason: 'admin_required' });
  const done = await admin({ operation: 'update', bookingId: booking.id, status: 'done', adminNote: ' Good fit ' });
  assert.deepEqual([done.value.booking.status, done.value.booking.adminNote], ['done', 'Good fit']);
  assert.deepEqual(await admin({ operation: 'update', bookingId: booking.id, status: 'maybe' }), { ok: false, reason: 'invalid_status' });
  assert.deepEqual(await admin({ operation: 'update', bookingId: 'auditBookings_999', status: 'done' }), { ok: false, reason: 'booking_not_found' });
  // Cancelling frees the time; reopening refuses once someone else has taken it.
  await admin({ operation: 'update', bookingId: booking.id, status: 'cancelled' });
  assert.ok((await audit({ operation: 'slots' })).value.slots.includes(slots[2]), 'a cancelled time is open again');
  assert.equal((await audit({ operation: 'book', startAt: slots[2], booking: { name: 'Omar', email: 'omar@example.com' } })).ok, true);
  assert.deepEqual(await admin({ operation: 'update', bookingId: booking.id, status: 'booked' }), { ok: false, reason: 'slot_taken' });
});

// ── API ──────────────────────────────────────────────────────────────────────

const env = { PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, VERCEL_ENV: 'production' };
const request = (method, body, url = '/api/lead?op=audit', headers = {}) => ({ method, body, url, headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, ...headers } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } });
const saved = { id: 'auditBookings_1', startAt: muscat('2026-10-27T11:00'), name: 'Sara', email: 'sara@example.com', business: 'Nour', lang: 'en' };

test('the public booking checks the origin, meters each IP, ignores bots and emails Ahmed an invite', async () => {
  const calls = [], emails = [];
  const store = async (op, args) => { calls.push({ op, args }); return op === 'slots' ? { slots: [1, 2] } : { booking: saved }; };
  let hits = 0;
  const api = createAuditApi({ env, store, rate: async () => ({ ip_hits: ++hits }), email: async input => { emails.push(input); return 'em_1'; } });
  const slots = response(); await api(request('GET'), slots);
  assert.deepEqual([slots.statusCode, slots.body.slots], [200, [1, 2]]);
  const foreign = response(); await api(request('POST', {}, undefined, { origin: 'https://evil.example' }), foreign);
  assert.deepEqual([foreign.statusCode, foreign.body.reason], [403, 'origin']);
  const bot = response(); await api(request('POST', { website: 'spam.biz', startAt: 1, name: 'x', email: 'x@y.z' }), bot);
  assert.deepEqual([bot.statusCode, bot.body.booking, calls.filter(c => c.op === 'book').length], [200, null, 0], 'a filled honeypot books nothing');
  const ok = response(); await api(request('POST', { startAt: saved.startAt, name: 'Sara', email: 'sara@example.com', business: 'Nour', lang: 'en', role: 'admin' }), ok);
  assert.deepEqual([ok.statusCode, ok.body], [200, { ok: true, booking: { startAt: saved.startAt }, emailed: true }]);
  const book = calls.find(c => c.op === 'book');
  assert.deepEqual(Object.keys(book.args.booking).sort(), ['business', 'email', 'industry', 'lang', 'name', 'note', 'phone'], 'only the known fields reach Convex');
  assert.equal(emails[0].idempotencyKey, 'audit-auditBookings_1');
  assert.deepEqual(emails[0].message.to, ['ahmed@bznsflowai.com']);
  assert.equal(emails[0].message.reply_to, 'sara@example.com');
  assert.equal(emails[0].message.attachments[0].filename, 'audit.ics');
  for (let i = 0; i < 5; i++) await api(request('POST', { startAt: 1, name: 'x', email: 'x@y.z' }), response());
  const limited = response(); await api(request('POST', { startAt: 1, name: 'x', email: 'x@y.z' }), limited);
  assert.deepEqual([limited.statusCode, limited.body.reason], [429, 'rate_ip']);
});

test('a refused booking keeps its reason, and a failed email never loses the booking', async () => {
  const refuse = createAuditApi({ env, store: async () => { throw new PilotError('slot_taken', 409); }, rate: async () => ({ ip_hits: 0 }), email: async () => 'x' });
  const taken = response(); await refuse(request('POST', { startAt: 1, name: 'x', email: 'x@y.z' }), taken);
  assert.deepEqual([taken.statusCode, taken.body.reason], [409, 'slot_taken']);
  const quiet = createAuditApi({ env, store: async () => ({ booking: saved }), rate: async () => { throw Error('db'); }, email: async () => { throw new PilotError('audit_email_failed', 502); } });
  const kept = response(); await quiet(request('POST', { startAt: saved.startAt, name: 'Sara', email: 'sara@example.com' }), kept);
  assert.deepEqual([kept.statusCode, kept.body.ok, kept.body.emailed], [200, true, false], 'the rate check failing open and the email failing both keep the booking');
  const down = createAuditApi({ env, store: async () => { throw Error('network'); } });
  const unavailable = response(); await down(request('GET'), unavailable);
  assert.deepEqual([unavailable.statusCode, unavailable.body.reason], [503, 'audit_unavailable']);
});

test('the invite is a 30-minute UTC event, and visitor text cannot break the calendar file', () => {
  const ics = auditInvite({ ...saved, note: 'a;b,c\nd' }, Date.parse('2026-10-24T08:00:00Z'));
  assert.match(ics, /DTSTART:20261027T070000Z\r\nDTEND:20261027T073000Z/);
  assert.match(ics, /DESCRIPTION:Sara <sara@example.com>\\na\\;b\\,c\\nd/);
  assert.ok(!/\nEND:VCALENDAR\r?\nBEGIN/.test(ics));
  const email = auditEmail({ ...saved, business: '<b>Nour</b>' });
  assert.ok(email.html.includes('&lt;b&gt;Nour&lt;/b&gt;') && !email.html.includes('<b>Nour'), 'visitor text is escaped in the email');
});

const admin = (method, body, url) => ({ method, body, url, headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${tokens.admin}; bf_csrf=${'b'.repeat(64)}`, 'x-csrf-token': 'b'.repeat(64) } });
test('the Audits tab reaches Convex through access-admin with the session; refusals keep their status', async () => {
  const calls = [];
  const auditStore = async (op, args) => { calls.push({ op, args }); return op === 'list' ? { bookings: [], upcoming: 0 } : { booking: {} }; };
  const handler = createAccessAdmin({ store: async () => ({}), auditStore });
  const list = response(); await handler(admin('GET', undefined, '/api/access-admin?op=audits&from=10&to=20'), list);
  assert.deepEqual([list.statusCode, calls[0].op, calls[0].args.from, calls[0].args.to, calls[0].args.sessionHash], [200, 'list', 10, 20, hash(tokens.admin)]);
  const update = response(); await handler(admin('POST', { bookingId: 'b1', status: 'done', adminNote: 'ok', extra: 1 }, '/api/access-admin?op=audits'), update);
  assert.deepEqual(calls[1].args, { sessionHash: hash(tokens.admin), bookingId: 'b1', status: 'done', adminNote: 'ok' });
  for (const [reason, status] of [['admin_required', 403], ['booking_not_found', 404], ['slot_taken', 409], ['invalid_range', 400], ['audit_unavailable', 503]]) {
    const res = response();
    await createAccessAdmin({ auditStore: async () => { throw new PilotError(reason, 409); } })(admin('GET', undefined, '/api/access-admin?op=audits&from=1&to=2'), res);
    assert.deepEqual([res.statusCode, res.body.reason], [status, reason]);
  }
  const signedOut = response();
  await handler({ method: 'GET', url: '/api/access-admin?op=audits', headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN } }, signedOut);
  assert.equal(signedOut.statusCode, 401);
});

test('the Audits tab appears only when the dashboard is opened by the founder', () => {
  const hasib = { modules: ['orders'], setupRequired: false, pack: { id: 'retail' }, workspaceRole: 'manager' };
  const caps = { operations: true, broadcasts: true, insights: true };
  assert.deepEqual(dashboardMap(hasib, caps, 'manager', { audits: true }).sections.slice(0, 3), ['chats', 'audits', 'work']);
  assert.ok(!dashboardMap(hasib, caps, 'manager', {}).sections.includes('audits'));
  assert.ok(dashboardMap({ ...hasib, pack: { id: 'clinic' } }, caps, 'manager', { audits: true }).sections.includes('audits'), 'older layouts too');
  assert.ok(!dashboardMap(null, { broadcasts: true }, 'manager', { audits: true }).sections.includes('audits'), 'not on Catalyst');
});

test('on Ascend, Layla on the founder’s pilot number keeps the general setup; other Ascend owners get their sector', async () => {
  const m = convexMemory();
  const founder = await m.db.insert('accounts', { email: 'Ahmed@BznsFlowAI.com', createdAt: 1 });
  const owner = await m.db.insert('accounts', { email: 'owner@example.com', createdAt: 1 });
  for (const email of ['ahmed@bznsflowai.com', 'owner@example.com']) await m.db.insert('blueAccessGrants', { email, plan: 'ascend', status: 'active', grantedAt: 1, grantedBy: 'ahmed@bznsflowai.com' });
  assert.equal(await onIndustryPlan(m.ctx, founder), false);
  assert.equal(await onIndustryPlan(m.ctx, owner), true);
});
