// Online Catalyst and Ascend payments. The checkout route (api/paymob-checkout.js) opens a pending
// payment here before Paymob is called; the verified Paymob callback (api/paymob-webhook.js) settles it.
// Only a settled, matching payment extends access, and each Paymob transaction counts once.
import { BILLING_CURRENCY, addMonths, billingPrice, paymobAmount } from '../config/billing-plans.js';
import { isLivePack } from '../config/hasib-packs.js';
import { grantLive } from './grantStatus.js';
import { setAccountPack } from './hasib/packChoice.js';

const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const reference = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const paymobId = value => Number.isSafeInteger(value) && value > 0;
const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const CHECKOUTS_PER_HOUR = 10;
const HOUR = 3600000;

export async function executeBilling(ctx, args, now = Date.now()) {
  if (args.operation === 'checkout') return checkout(ctx, args, now);
  if (args.operation === 'opened') return opened(ctx, args);
  if (args.operation === 'transaction') return transaction(ctx, args, now);
  return fail('invalid_state');
}

const grantOf = (ctx, email) => ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', String(email).toLowerCase().trim())).unique();

/**
 * Whether a payment for `plan` may change a live grant: any Catalyst (paid or operator-granted) can
 * upgrade to Ascend, and a paid plan can renew itself. Operator Ascend has no end to pay towards, and
 * a live paid Ascend is not swapped for Catalyst mid-period.
 */
const payableOver = (grant, plan) => (grant.plan === 'catalyst' && plan === 'ascend') || (!!grant.paidUntil && grant.plan === plan);

async function checkout(ctx, args, now) {
  if (!hash(args.tokenHash)) return fail('sign_in_required');
  if (!reference(args.reference)) return fail('invalid_state');
  const price = billingPrice(args.plan, args.interval);
  if (!price) return fail('invalid_interval');
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', args.tokenHash)).unique();
  if (!session || session.expiresAt <= now) return fail('sign_in_required');
  const account = await ctx.db.get(session.accountId);
  if (!account?.email) return fail('sign_in_required');
  const grant = await grantOf(ctx, account.email);
  const live = grantLive(grant, now);
  if (live && !payableOver(grant, args.plan)) return fail('plan_active');
  // Ascend is bought for one live industry; a renewal that names none keeps the one it has. Catalyst has none.
  const packId = args.plan === 'ascend' ? (args.packId ?? (live && grant.plan === 'ascend' ? grant.packId : undefined)) : args.packId;
  if (args.plan === 'ascend' ? !isLivePack(packId) : packId !== undefined) return fail('invalid_pack');
  const recent = await ctx.db.query('billingPayments').withIndex('by_account_created', q => q.eq('accountId', account._id).gt('createdAt', now - HOUR)).take(CHECKOUTS_PER_HOUR);
  if (recent.length >= CHECKOUTS_PER_HOUR) return fail('too_many');
  const amount = paymobAmount(price.baisa);
  await ctx.db.insert('billingPayments', { reference: args.reference, accountId: account._id, email: account.email.toLowerCase().trim(), plan: args.plan,
    ...(args.plan === 'ascend' ? { packId } : {}), interval: args.interval, baisa: price.baisa, amount, currency: BILLING_CURRENCY, status: 'pending', createdAt: now });
  return ok({ reference: args.reference, amount, currency: BILLING_CURRENCY, email: account.email, name: account.name || '', phone: account.phone || '' });
}

async function opened(ctx, args) {
  if (!reference(args.reference) || !paymobId(args.orderId)) return fail('invalid_state');
  const payment = await ctx.db.query('billingPayments').withIndex('by_reference', q => q.eq('reference', args.reference)).unique();
  if (payment?.status === 'pending') await ctx.db.patch(payment._id, { paymobOrderId: args.orderId });
  return ok(null);
}

/**
 * Settle one verified Paymob transaction. Refunds, voids, pending and declined attempts change
 * nothing: a declined card can be retried on the same checkout, and refunds are handled by Ahmed.
 */
async function transaction(ctx, args, now) {
  if (!paymobId(args.transactionId)) return fail('invalid_state');
  const settled = await ctx.db.query('billingPayments').withIndex('by_transaction', q => q.eq('paymobTransactionId', args.transactionId)).unique();
  if (settled) return ok({ applied: false, duplicate: true });
  const payment = (reference(args.reference) && await ctx.db.query('billingPayments').withIndex('by_reference', q => q.eq('reference', args.reference)).unique())
    || (paymobId(args.orderId) && await ctx.db.query('billingPayments').withIndex('by_order', q => q.eq('paymobOrderId', args.orderId)).first());
  if (!payment) return fail('unknown_payment');
  if (args.success !== true || args.pending === true || args.child === true) return ok({ applied: false });
  if (payment.status === 'paid') return fail('already_paid');
  if (args.amount !== payment.amount || args.currency !== payment.currency) return fail('amount_mismatch');

  const price = billingPrice(payment.plan, payment.interval);
  const grant = await grantOf(ctx, payment.email);
  const live = grantLive(grant, now);
  if (live && !payableOver(grant, payment.plan)) {
    // The plan changed after checkout (e.g. Ahmed granted Ascend): keep it, record the money for Ahmed to refund.
    await ctx.db.patch(payment._id, { status: 'paid', paidAt: now, paymobTransactionId: args.transactionId });
    return ok({ applied: false, reason: 'plan_active' });
  }
  // A renewal extends from the current end; a new plan (including Catalyst → Ascend) starts now,
  // and unused days of the old plan are not carried over (Ahmed, 2026-10-18).
  const renewal = live && grant.plan === payment.plan;
  const paidUntil = addMonths(renewal ? Math.max(now, grant.paidUntil) : now, price.months);
  const packId = payment.packId || (renewal ? grant.packId : undefined);
  const next = { email: payment.email, plan: payment.plan, status: 'active', grantedAt: renewal ? grant.grantedAt : now, grantedBy: 'paymob',
    paidUntil, billingInterval: payment.interval, source: 'paymob', ...(packId ? { packId } : {}) };
  if (grant) await ctx.db.replace(grant._id, next); else await ctx.db.insert('blueAccessGrants', next);
  const entitlement = await ctx.db.query('blueEntitlements').withIndex('by_account', q => q.eq('accountId', payment.accountId)).unique();
  const legacy = { accountId: payment.accountId, plan: payment.plan, status: 'active', grantedAt: next.grantedAt };
  if (entitlement) await ctx.db.replace(entitlement._id, legacy); else await ctx.db.insert('blueEntitlements', legacy);
  // The industry chosen at checkout opens Hasib, unless the owner already picked one in Settings.
  if (packId && payment.plan === 'ascend') await setAccountPack(ctx, payment.accountId, packId, now, { onlyIfUnset: true });
  await ctx.db.insert('blueAccessAudit', { email: payment.email, action: 'grant', plan: payment.plan, actorEmail: 'paymob',
    ...(packId ? { packId } : {}), note: `Paymob ${payment.plan} ${payment.interval} transaction ${args.transactionId}`, at: now });
  await ctx.db.patch(payment._id, { status: 'paid', paidAt: now, paidUntil, paymobTransactionId: args.transactionId,
    ...(paymobId(args.orderId) ? { paymobOrderId: args.orderId } : {}) });
  return ok({ applied: true, paidUntil });
}
