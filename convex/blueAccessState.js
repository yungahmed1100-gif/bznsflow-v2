import { activationStage } from './activationStage.js';
import { isLivePack } from '../config/hasib-packs.js';
import { setAccountPack } from './hasib/packChoice.js';
const ADMIN_EMAIL = 'ahmed@bznsflowai.com';
const normalize = value => value.trim().toLowerCase();
const hash = value => /^[a-f0-9]{64}$/.test(value);

export async function executeAccess(ctx, args, now = Date.now()) {
    if (!hash(args.sessionHash)) return { ok: false, reason: 'sign_in_required' };
    const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', args.sessionHash)).unique();
    if (!session || session.expiresAt <= now) return { ok: false, reason: 'sign_in_required' };
    const actor = await ctx.db.get(session.accountId);
    if (!actor || normalize(actor.email) !== ADMIN_EMAIL) return { ok: false, reason: 'admin_required' };

    if (args.operation === 'list') {
      // A grant only works once someone signs up with exactly that address, so each row says
      // whether an account exists. Revoked grants stay listed, so a revoked address never just vanishes.
      const accountOf = email => ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique();
      // The phone (from the owner's sign-up profile) lets Ahmed send the setup link on WhatsApp.
      const view = async ({ email, plan, status, grantedAt, grantedBy, note, packId, revokedAt, paidUntil }) => {
        const account = await accountOf(email);
        const row = account?.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
        return { email, plan, status, grantedAt, grantedBy, packId, revokedAt, paidUntil: paidUntil || null, note: note || '', hasAccount: !!account, phone: account?.phone || '', progress: activationStage({ account, row, grantedAt }) };
      };
      const active = await ctx.db.query('blueAccessGrants').withIndex('by_status', q => q.eq('status', 'active')).take(200);
      const revoked = await ctx.db.query('blueAccessGrants').withIndex('by_status', q => q.eq('status', 'revoked')).take(200);
      return { ok: true, value: { grants: await Promise.all(active.map(view)), revoked: await Promise.all(revoked.map(view)) } };
    }

    const email = normalize(args.email || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, reason: 'invalid_email' };
    const note = (args.note || '').trim().slice(0, 200);
    const current = await ctx.db.query('blueAccessGrants').withIndex('by_email', q => q.eq('email', email)).unique();
    const account = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique();

    if (args.operation === 'grant') {
      if (!args.plan) return { ok: false, reason: 'invalid_plan' };
      // Apex (custom enterprise, 2026-10-27) holds everything Ascend has, including a live sector.
      if (args.packId !== undefined && (!['ascend', 'apex'].includes(args.plan) || !isLivePack(args.packId))) return { ok: false, reason: 'invalid_pack' };
      const sector = args.packId ? { packId: args.packId } : {};
      const next = { ...sector, email, plan: args.plan, status: 'active', grantedAt: now, grantedBy: ADMIN_EMAIL, ...(note ? { note } : {}) };
      if (current) await ctx.db.replace(current._id, next);
      else await ctx.db.insert('blueAccessGrants', next);
      if (account) {
        const entitlement = await ctx.db.query('blueEntitlements').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
        const legacy = { accountId: account._id, plan: args.plan, status: 'active', grantedAt: now, ...(note ? { note } : {}) };
        if (entitlement) await ctx.db.replace(entitlement._id, legacy);
        else await ctx.db.insert('blueEntitlements', legacy);
      }
      // An account that doesn't exist yet gets the sector at sign-in (applyGrantedPack).
      if (account && args.packId) await setAccountPack(ctx, account._id, args.packId, now);
      await ctx.db.insert('blueAccessAudit', { ...sector, email, action: 'grant', plan: args.plan, actorEmail: ADMIN_EMAIL, ...(note ? { note } : {}), at: now });
      return { ok: true, value: { email, plan: args.plan, status: 'active', hasAccount: !!account } };
    }

    if (current?.status === 'active') await ctx.db.patch(current._id, { status: 'revoked', revokedAt: now, revokedBy: ADMIN_EMAIL });
    if (account) {
      const entitlement = await ctx.db.query('blueEntitlements').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
      if (entitlement?.status === 'active') await ctx.db.patch(entitlement._id, { status: 'revoked', revokedAt: now });
    }
    await ctx.db.insert('blueAccessAudit', { email, action: 'revoke', ...(current ? { plan: current.plan } : {}), actorEmail: ADMIN_EMAIL, ...(note ? { note } : {}), at: now });
    return { ok: true, value: { email, status: 'revoked' } };
}
