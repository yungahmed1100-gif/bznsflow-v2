// Paymob checkout for Catalyst: the server names the price, only a verified callback that matches
// a pending payment extends access, each transaction counts once, and a paid period ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { createCheckout } from '../api/paymob-checkout.js';
import { createPaymobWebhook, transactionArgs } from '../api/paymob-webhook.js';
import { transactionHmacValid, transactionString } from '../api/_lib/paymob.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { executeBilling } from '../convex/billingState.js';
import { executeBlueAuth } from '../convex/blueAuthState.js';
import { planFor } from '../convex/hasib/plans.js';
import { addMonths } from '../config/billing-plans.js';
import { convexMemory } from './helpers/convex-memory.mjs';
import { GREEN_CLOUD, GREEN_ORIGIN, GREEN_SECRET, GREEN_SITE } from './helpers/green-env.mjs';

const HMAC_SECRET = 'hmac-secret';
const env = {
  VERCEL_ENV: 'production', GREEN_CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SITE_URL: GREEN_SITE,
  CONVEX_SERVICE_SECRET: GREEN_SECRET, PUBLIC_SITE_ORIGIN: GREEN_ORIGIN,
  PAYMOB_BASE_URL: 'https://oman.paymob.com', PAYMOB_SECRET_KEY: 'sk_test', PAYMOB_PUBLIC_KEY: 'pk_test',
  PAYMOB_HMAC_SECRET: HMAC_SECRET, PAYMOB_INTEGRATION_IDS: '101, 102',
};
const token = 'a'.repeat(64), csrf = 'b'.repeat(64), tokenHash = createHash('sha256').update(token).digest('hex');
const request = body => ({ method: 'POST', body, headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${token}; bf_csrf=${csrf}`, 'x-csrf-token': csrf } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; }, end(v) { this.body = JSON.parse(v); } });

const transaction = (over = {}) => ({
  id: 192036465, pending: false, amount_cents: 9000, success: true, is_auth: false, is_capture: false, is_standalone_payment: true,
  is_voided: false, is_refunded: false, is_3d_secure: true, integration_id: 101, has_parent_transaction: false, error_occured: false,
  owner: 302852, created_at: '2026-10-18T10:00:00.000000', currency: 'OMR',
  order: { id: 217503754, merchant_order_id: '11111111-1111-4111-8111-111111111111' },
  source_data: { pan: '2346', type: 'card', sub_type: 'MasterCard' }, ...over,
});
const signed = obj => createHmac('sha512', HMAC_SECRET).update(transactionString(obj)).digest('hex');
const callback = (obj, hmac = signed(obj)) => ({ method: 'POST', url: `/api/paymob-webhook?hmac=${hmac}`, headers: {}, body: Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj })) });

test('the signed string follows Paymob\'s field order, and any changed field breaks the HMAC', () => {
  const obj = transaction();
  assert.equal(transactionString(obj),
    '90002026-10-18T10:00:00.000000OMRfalsefalse192036465101truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue');
  assert.equal(transactionHmacValid(obj, signed(obj), HMAC_SECRET), true);
  assert.equal(transactionHmacValid({ ...obj, amount_cents: 1 }, signed(obj), HMAC_SECRET), false);
  assert.equal(transactionHmacValid(obj, signed(obj), 'other-secret'), false);
  assert.equal(transactionHmacValid(obj, 'not-hex', HMAC_SECRET), false);
});

test('checkout refuses signed-out, cross-site, CSRF-less and unknown-interval requests before any work', async () => {
  const store = async () => assert.fail('store called');
  for (const [edit, status] of [[r => { r.headers.cookie = `bf_csrf=${csrf}`; }, 401], [r => { r.headers.origin = 'https://evil.example'; }, 403],
    [r => { delete r.headers['x-csrf-token']; }, 403], [r => { r.body.interval = 'weekly'; }, 400]]) {
    const req = request({ interval: 'monthly' }); edit(req); const res = response();
    await createCheckout({ env, store, fetcher: async () => assert.fail('Paymob called') })(req, res);
    assert.equal(res.statusCode, status);
  }
});

test('checkout opens an intention for the server\'s amount and returns Paymob\'s hosted page', async () => {
  const calls = [], paymob = [];
  const store = async (op, args) => { calls.push({ op, args }); return op === 'checkout' ? { reference: args.reference, amount: 89000, currency: 'OMR', email: 'owner@example.com', name: 'Sara Al Balushi', phone: '+96890000000' } : null; };
  const fetcher = async (url, init) => { paymob.push({ url, init, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ client_secret: 'csk_test', intention_order_id: 555 }), { status: 201 }); };
  const res = response();
  await createCheckout({ env, store, fetcher })(request({ interval: 'yearly', lang: 'en', amount: 1 }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.url, 'https://oman.paymob.com/unifiedcheckout/?publicKey=pk_test&clientSecret=csk_test');
  const [{ url, init, body }] = paymob;
  assert.equal(url, 'https://oman.paymob.com/v1/intention/');
  assert.equal(init.headers.Authorization, 'Token sk_test');
  assert.equal(body.amount, 89000);
  assert.deepEqual(body.payment_methods, [101, 102]);
  assert.equal(body.special_reference, calls[0].args.reference);
  assert.equal(body.notification_url, 'https://www.bznsflowai.com/api/paymob-webhook');
  assert.equal(body.redirection_url, 'https://www.bznsflowai.com/en?payment=return&plan=catalyst');
  assert.deepEqual(body.items, [{ name: 'BznsFlow Catalyst, 12 months', amount: 89000, quantity: 1 }]);
  assert.deepEqual(body.billing_data, { first_name: 'Sara', last_name: 'Al Balushi', email: 'owner@example.com', phone_number: '+96890000000' });
  assert.equal(calls[0].args.tokenHash, tokenHash);
  assert.equal(calls[0].args.interval, 'yearly');
  assert.equal('amount' in calls[0].args, false);
  assert.deepEqual(calls[1], { op: 'opened', args: { reference: body.special_reference, orderId: 555 } });
});

test('checkout without Paymob configured fails closed before opening a payment', async () => {
  const res = response();
  await createCheckout({ env: { ...env, PAYMOB_HMAC_SECRET: '' }, store: async () => assert.fail('store called') })(request({ interval: 'monthly' }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.reason, 'payment_unavailable');
});

test('the webhook forwards only HMAC-verified transactions and acknowledges unmatched ones', async () => {
  const seen = [];
  const handler = createPaymobWebhook({ env, store: async (op, args) => { seen.push({ op, args }); return { applied: true }; } });
  let res = response();
  await handler(callback(transaction(), 'f'.repeat(128)), res);
  assert.equal(res.statusCode, 401);
  assert.equal(seen.length, 0);

  res = response();
  await handler(callback(transaction()), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(seen[0], { op: 'transaction', args: { reference: '11111111-1111-4111-8111-111111111111', orderId: 217503754, transactionId: 192036465,
    success: true, pending: false, child: false, amount: 9000, currency: 'OMR' } });

  res = response();
  await handler({ method: 'POST', url: '/api/paymob-webhook', headers: {}, body: Buffer.from(JSON.stringify({ type: 'TOKEN', obj: {} })) }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(seen.length, 1);

  const quiet = console.error; console.error = () => {};
  try {
    res = response();
    await createPaymobWebhook({ env, store: async () => { throw new PilotError('amount_mismatch', 409); } })(callback(transaction()), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reason, 'amount_mismatch');
  } finally { console.error = quiet; }

  res = response();
  await createPaymobWebhook({ env, store: async () => { throw new PilotError('payment_unavailable', 503); } })(callback(transaction()), res);
  assert.equal(res.statusCode, 503, 'an outage is retried by Paymob');
});

test('refund and void callbacks are marked as child transactions', () => {
  assert.equal(transactionArgs(transaction({ has_parent_transaction: true })).child, true);
  assert.equal(transactionArgs(transaction({ is_refunded: true })).child, true);
  assert.equal('reference' in transactionArgs(transaction({ order: { id: 1, merchant_order_id: null } })), false);
});

// ── Convex state ────────────────────────────────────────────────────────────

const REF_A = '11111111-1111-4111-8111-111111111111', REF_B = '22222222-2222-4222-8222-222222222222';
async function fixture() {
  const m = convexMemory(), now = m.now();
  const accountId = await m.db.insert('accounts', { email: 'owner@example.com', name: 'Sara', phone: '+96890000000', role: 'customer', createdAt: now });
  // A session that outlives the paid periods under test.
  await m.db.insert('sessions', { accountId, tokenHash, createdAt: now, expiresAt: now + 500 * 86400000 });
  const run = (args, at = m.now()) => executeBilling(m.ctx, args, at);
  const pay = async (reference, interval, transactionId, at = m.now()) => {
    const opened = await run({ operation: 'checkout', tokenHash, reference, plan: 'catalyst', interval }, at);
    assert.equal(opened.ok, true, opened.reason);
    return run({ operation: 'transaction', reference, transactionId, success: true, pending: false, child: false, amount: opened.value.amount, currency: 'OMR' }, at);
  };
  return { m, now, accountId, run, pay };
}

test('a matching payment grants Catalyst for the paid period, then access stops after grace', async () => {
  const { m, now, accountId, run } = await fixture();
  const opened = await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'monthly' });
  assert.deepEqual(opened.value, { reference: REF_A, amount: 9000, currency: 'OMR', email: 'owner@example.com', name: 'Sara', phone: '+96890000000' });
  assert.equal(await planFor(m.ctx, accountId, now), null, 'a pending payment grants nothing');

  const settled = await run({ operation: 'transaction', reference: REF_A, transactionId: 7, success: true, pending: false, child: false, amount: 9000, currency: 'OMR' });
  assert.equal(settled.value.applied, true);
  assert.equal(settled.value.paidUntil, addMonths(now, 1));
  assert.equal(await planFor(m.ctx, accountId, now), 'catalyst');
  assert.equal(await planFor(m.ctx, accountId, addMonths(now, 1) + 3 * 86400000), null, 'access ends three days after paidUntil');
  const [grant] = m.table('blueAccessGrants');
  assert.equal(grant.source, 'paymob');
  assert.equal(m.table('blueAccessAudit')[0].actorEmail, 'paymob');
  const session = await executeBlueAuth(m.ctx, { operation: 'session', tokenHash }, now);
  assert.equal(session.value.accessPlan, 'catalyst');
  assert.equal(session.value.accessUntil, addMonths(now, 1));
  assert.equal(m.table('billingPayments')[0].status, 'paid');
});

test('a repeated callback counts once; a second payment extends from the current end', async () => {
  const { m, now, accountId, run, pay } = await fixture();
  await pay(REF_A, 'monthly', 7);
  const again = await run({ operation: 'transaction', reference: REF_A, transactionId: 7, success: true, pending: false, child: false, amount: 9000, currency: 'OMR' });
  assert.equal(again.value.duplicate, true);
  assert.equal(m.table('blueAccessGrants')[0].paidUntil, addMonths(now, 1));
  const renewed = await pay(REF_B, 'yearly', 8);
  assert.equal(renewed.value.paidUntil, addMonths(addMonths(now, 1), 12));
  assert.equal(await planFor(m.ctx, accountId, addMonths(now, 12)), 'catalyst');
});

test('a callback that does not match the pending payment changes nothing', async () => {
  const { m, now, accountId, run } = await fixture();
  await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'yearly' });
  const settle = over => run({ operation: 'transaction', reference: REF_A, transactionId: 9, success: true, pending: false, child: false, amount: 89000, currency: 'OMR', ...over });
  assert.equal((await settle({ amount: 9000 })).reason, 'amount_mismatch');
  assert.equal((await settle({ currency: 'EGP' })).reason, 'amount_mismatch');
  assert.equal((await settle({ reference: REF_B, orderId: 404 })).reason, 'unknown_payment');
  for (const over of [{ success: false }, { pending: true }, { child: true }]) assert.equal((await settle(over)).value.applied, false);
  assert.equal(await planFor(m.ctx, accountId, now), null);
  assert.equal(m.table('billingPayments')[0].status, 'pending', 'a declined card can still be retried');
  assert.equal((await settle({})).value.applied, true);
});

test('checkout is refused for operator-granted plans, unknown intervals, and after ten tries an hour', async () => {
  const { run } = await fixture();
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'weekly' })).reason, 'invalid_interval');
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'apex', interval: 'monthly' })).reason, 'invalid_interval');
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'ascend', interval: 'monthly' })).reason, 'invalid_pack');
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'ascend', interval: 'monthly', packId: 'cafe' })).reason, 'invalid_pack', 'not a live pack');
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'monthly', packId: 'retail' })).reason, 'invalid_pack');
  assert.equal((await run({ operation: 'checkout', tokenHash: 'c'.repeat(64), reference: REF_A, plan: 'catalyst', interval: 'monthly' })).reason, 'sign_in_required');
  for (let i = 0; i < 10; i++) assert.equal((await run({ operation: 'checkout', tokenHash, reference: `${REF_A.slice(0, -2)}${String(i).padStart(2, '0')}`, plan: 'catalyst', interval: 'monthly' })).ok, true);
  assert.equal((await run({ operation: 'checkout', tokenHash, reference: REF_B, plan: 'catalyst', interval: 'monthly' })).reason, 'too_many');

  for (const plan of ['ascend', 'catalyst']) {
    const f = await fixture();
    await f.m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan, status: 'active', grantedAt: f.now, grantedBy: 'ahmed@bznsflowai.com' });
    assert.equal((await f.run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'monthly' })).reason, 'plan_active', plan);
  }
});

test('an operator grant without an end date keeps access; Ascend granted mid-checkout is not downgraded', async () => {
  const { m, now, accountId, run } = await fixture();
  await run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'monthly' });
  await m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan: 'ascend', status: 'active', grantedAt: now, grantedBy: 'ahmed@bznsflowai.com' });
  assert.equal(await planFor(m.ctx, accountId, now + 10 * 365 * 86400000), 'ascend');
  const settled = await run({ operation: 'transaction', reference: REF_A, transactionId: 11, success: true, pending: false, child: false, amount: 9000, currency: 'OMR' });
  assert.deepEqual(settled.value, { applied: false, reason: 'plan_active' });
  assert.equal(m.table('blueAccessGrants')[0].plan, 'ascend');
  assert.equal(m.table('billingPayments')[0].status, 'paid', 'recorded for Ahmed to refund');
});

test('a paid month ends on the same day next month, clamped to short months', () => {
  assert.equal(new Date(addMonths(Date.UTC(2026, 0, 31, 9), 1)).toISOString(), '2026-02-28T09:00:00.000Z');
  assert.equal(new Date(addMonths(Date.UTC(2026, 9, 18), 12)).toISOString(), '2027-10-18T00:00:00.000Z');
});

test('three days of grace after the paid period: access continues and the session says when it ends', async () => {
  const { m, now, accountId, pay } = await fixture();
  await pay(REF_A, 'monthly', 21);
  const end = addMonths(now, 1), DAY = 86400000;
  assert.equal(await planFor(m.ctx, accountId, end + 2 * DAY), 'catalyst', 'still working on day 3 of grace');
  assert.equal(await planFor(m.ctx, accountId, end + 3 * DAY), null, 'denied once grace ends');
  const inGrace = await executeBlueAuth(m.ctx, { operation: 'session', tokenHash }, end + DAY);
  assert.equal(inGrace.value.accessPlan, 'catalyst');
  assert.equal(inGrace.value.accessUntil, end);
  assert.equal(inGrace.value.accessDeniedAt, end + 3 * DAY);
  const after = await executeBlueAuth(m.ctx, { operation: 'session', tokenHash }, end + 3 * DAY);
  assert.deepEqual([after.value.accessPlan, after.value.accessUntil, after.value.accessDeniedAt], [null, null, null]);
});

test('paying during grace is allowed and starts the new period from the payment', async () => {
  const { m, now, accountId, pay } = await fixture();
  await pay(REF_A, 'monthly', 31);
  const paidAt = addMonths(now, 1) + 86400000;
  const renewed = await pay(REF_B, 'monthly', 32, paidAt);
  assert.equal(renewed.value.paidUntil, addMonths(paidAt, 1));
  assert.equal(await planFor(m.ctx, accountId, addMonths(paidAt, 1) - 1), 'catalyst');
});

test('an operator grant has no end date, so no grace dates reach the session', async () => {
  const { m, now } = await fixture();
  await m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan: 'catalyst', status: 'active', grantedAt: now, grantedBy: 'ahmed@bznsflowai.com' });
  const session = await executeBlueAuth(m.ctx, { operation: 'session', tokenHash }, now + 400 * 86400000);
  assert.deepEqual([session.value.accessPlan, session.value.accessUntil, session.value.accessDeniedAt], ['catalyst', null, null]);
});

// ── Ascend ──────────────────────────────────────────────────────────────────

const settleAscend = async (f, reference, interval, transactionId, at, packId = 'retail') => {
  const opened = await f.run({ operation: 'checkout', tokenHash, reference, plan: 'ascend', interval, ...(packId ? { packId } : {}) }, at);
  assert.equal(opened.ok, true, opened.reason);
  return f.run({ operation: 'transaction', reference, transactionId, success: true, pending: false, child: false, amount: opened.value.amount, currency: 'OMR' }, at);
};

test('Ascend is bought for a live industry, which reaches the grant and opens Hasib on it', async () => {
  const f = await fixture();
  const opened = await f.run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'ascend', interval: 'yearly', packId: 'dental' });
  assert.equal(opened.value.amount, 289000);
  const settled = await f.run({ operation: 'transaction', reference: REF_A, transactionId: 41, success: true, pending: false, child: false, amount: 289000, currency: 'OMR' });
  assert.equal(settled.value.paidUntil, addMonths(f.now, 12));
  const [grant] = f.m.table('blueAccessGrants');
  assert.deepEqual([grant.plan, grant.packId, grant.source], ['ascend', 'dental', 'paymob']);
  assert.equal(f.m.table('hasibSettings')[0].packId, 'dental');
  assert.equal(await planFor(f.m.ctx, f.accountId, f.now), 'ascend');
});

test('upgrading from paid Catalyst starts Ascend fresh; unused Catalyst days are not carried over', async () => {
  const f = await fixture();
  await f.pay(REF_A, 'yearly', 51);
  const upgradedAt = addMonths(f.now, 2);
  const settled = await settleAscend(f, REF_B, 'monthly', 52, upgradedAt);
  assert.equal(settled.value.paidUntil, addMonths(upgradedAt, 1));
  assert.equal(f.m.table('blueAccessGrants')[0].plan, 'ascend');
});

test('an operator-granted Catalyst can upgrade to Ascend online; operator Ascend cannot be bought over', async () => {
  const f = await fixture();
  await f.m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan: 'catalyst', status: 'active', grantedAt: f.now, grantedBy: 'ahmed@bznsflowai.com' });
  assert.equal((await settleAscend(f, REF_A, 'monthly', 61, f.now)).value.applied, true);

  const g = await fixture();
  await g.m.db.insert('blueAccessGrants', { email: 'owner@example.com', plan: 'ascend', status: 'active', grantedAt: g.now, grantedBy: 'ahmed@bznsflowai.com', packId: 'media' });
  assert.equal((await g.run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'ascend', interval: 'monthly', packId: 'retail' })).reason, 'plan_active');
  assert.equal((await g.run({ operation: 'checkout', tokenHash, reference: REF_A, plan: 'catalyst', interval: 'monthly' })).reason, 'plan_active');
});

test('an Ascend renewal without an industry keeps the one bought, and extends from the current end', async () => {
  const f = await fixture();
  await settleAscend(f, REF_A, 'monthly', 71, f.now, 'fitness');
  const renewed = await settleAscend(f, REF_B, 'monthly', 72, f.now, null);
  assert.equal(renewed.value.paidUntil, addMonths(addMonths(f.now, 1), 1));
  assert.equal(f.m.table('blueAccessGrants')[0].packId, 'fitness');
  assert.equal((await f.run({ operation: 'checkout', tokenHash, reference: '33333333-3333-4333-8333-333333333333', plan: 'catalyst', interval: 'monthly' })).reason, 'plan_active', 'no Catalyst over a live paid Ascend');
});

test('an industry the owner already chose in Settings is not replaced by the checkout choice', async () => {
  const f = await fixture();
  await f.m.db.insert('hasibSettings', { accountId: f.accountId, currency: 'OMR', vatRegistered: false, vatRateBps: 500, pricesIncludeVat: false, stockPolicy: 'warn', packId: 'media', updatedAt: f.now });
  await settleAscend(f, REF_A, 'monthly', 81, f.now, 'retail');
  assert.equal(f.m.table('hasibSettings')[0].packId, 'media');
});

test('the Ascend checkout route sends plan and industry, and names the item', async () => {
  const calls = [], paymob = [];
  const store = async (op, args) => { calls.push({ op, args }); return op === 'checkout' ? { reference: args.reference, amount: 29000, currency: 'OMR', email: 'o@example.com', name: '', phone: '' } : null; };
  const fetcher = async (url, init) => { paymob.push(JSON.parse(init.body)); return new Response(JSON.stringify({ client_secret: 'csk', intention_order_id: 9 }), { status: 201 }); };
  const res = response();
  await createCheckout({ env, store, fetcher })(request({ plan: 'ascend', interval: 'monthly', packId: 'retail' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual([calls[0].args.plan, calls[0].args.packId], ['ascend', 'retail']);
  assert.equal(paymob[0].items[0].name, 'BznsFlow Ascend, 1 month');
  assert.equal(paymob[0].redirection_url, 'https://www.bznsflowai.com/?payment=return&plan=ascend');
  const bad = response();
  await createCheckout({ env, store: async () => assert.fail('store called'), fetcher })(request({ plan: 'ascend', interval: 'monthly', packId: { x: 1 } }), bad);
  assert.equal(bad.statusCode, 400);
});

// ── Test keys stay private ──────────────────────────────────────────────────

test('test keys open checkout only to listed testers; live keys to everyone; nothing without keys', async () => {
  const { paymentsOpen } = await import('../api/_lib/paymob.js');
  const testEnv = { ...env, PAYMOB_SECRET_KEY: 'omn_sk_test_abc', PAYMOB_TEST_EMAILS: ' Tester@Example.com , other@example.com' };
  assert.equal(paymentsOpen(testEnv, 'tester@example.com'), true);
  assert.equal(paymentsOpen(testEnv, 'customer@example.com'), false);
  assert.equal(paymentsOpen({ ...testEnv, PAYMOB_TEST_EMAILS: '' }, 'tester@example.com'), false);
  assert.equal(paymentsOpen({ ...env, PAYMOB_SECRET_KEY: 'omn_sk_live_abc' }, 'customer@example.com'), true);
  assert.equal(paymentsOpen({ ...env, PAYMOB_HMAC_SECRET: '' }, 'customer@example.com'), false);

  // A customer who reaches the route anyway is refused before Paymob is called.
  const store = async op => (op === 'checkout' ? { reference: 'r', amount: 9000, currency: 'OMR', email: 'customer@example.com', name: '', phone: '' } : null);
  const res = response();
  await createCheckout({ env: testEnv, store, fetcher: async () => assert.fail('Paymob called') })(request({ interval: 'monthly' }), res);
  assert.deepEqual([res.statusCode, res.body.reason], [403, 'payments_closed']);
});
