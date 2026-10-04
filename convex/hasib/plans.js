// Plan entitlements. Hasib is part of Ascend and Apex; a Catalyst (Layla-only)
// account has no grant and never sees it. Grants are operator actions, keyed by
// the account's verified email, and never delete business records.
import { ok, fail, DEFAULT_SETTINGS } from './shared.js';
import { isLivePack } from '../../config/hasib-packs.js';

export const HASIB_PLANS = Object.freeze(['ascend']);
const normEmail = email => String(email || '').toLowerCase().trim();

export async function planFor(ctx, accountId) {
  const account = await ctx.db.get(accountId);
  if (!account?.email) return null;
  const grant = await ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', normEmail(account.email))).unique();
  return grant?.status === 'active' ? grant.plan : null;
}

export async function accountByEmail(ctx, email) {
  return ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', normEmail(email))).unique();
}

/**
 * Grant Ascend or Apex. `packId` optionally opens Hasib straight into a live industry pack.
 * @param {any} ctx
 * @param {{ email: string, plan: string, packId?: string, note?: string }} input
 * @param {number} now
 */
export async function grantPlan(ctx, { email, plan, packId, note }, now) {
  const account = await accountByEmail(ctx, email);
  if (!HASIB_PLANS.includes(plan)) return fail('invalid_plan');
  if (packId !== undefined && !isLivePack(packId)) return fail('pack_not_live');
  const normalized = normEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return fail('invalid_email');
  const current = await ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', normalized)).unique();
  const row = { email: normalized, plan, status: 'active', grantedAt: now, grantedBy: 'ahmed@bznsflowai.com', ...(note ? { note: String(note).slice(0, 200) } : {}) };
  if (current) await ctx.db.replace(current._id, row); else await ctx.db.insert('blueAccessGrants', row);
  if (account && packId) {
    const settings = await ctx.db.query('hasibSettings').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
    if (settings) await ctx.db.patch(settings._id, { packId, updatedAt: now });
    else await ctx.db.insert('hasibSettings', { accountId: account._id, packId, currency: DEFAULT_SETTINGS.currency, vatRegistered: DEFAULT_SETTINGS.vatRegistered,
      vatRateBps: DEFAULT_SETTINGS.vatRateBps, pricesIncludeVat: DEFAULT_SETTINGS.pricesIncludeVat, stockPolicy: DEFAULT_SETTINGS.stockPolicy, updatedAt: now });
  }
  return ok({ accountId: account?._id || null, email: normalized, plan, packId: packId || null });
}

/** @param {any} ctx @param {{ email: string }} input @param {number} now */
export async function revokePlan(ctx, { email }, now) {
  const normalized = normEmail(email);
  const current = await ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', normalized)).unique();
  if (current?.status === 'active') await ctx.db.patch(current._id, { status: 'revoked', revokedAt: now, revokedBy: 'ahmed@bznsflowai.com' });
  const account = await accountByEmail(ctx, normalized);
  if (account) {
    const entitlement = await ctx.db.query('blueEntitlements').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
    if (entitlement?.status === 'active') await ctx.db.patch(entitlement._id, { status: 'revoked', revokedAt: now });
  }
  return ok({ accountId: account?._id || null, status: 'revoked' });
}
