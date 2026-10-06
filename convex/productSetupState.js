import { planFor } from './hasib/plans.js';
import { updateSettings } from './hasib/hasibState.js';
import { isLivePack } from '../config/hasib-packs.js';

/** Account sessions, not caller-supplied workspace IDs, own setup progress. */
export async function executeProductSetup(ctx, a, now = Date.now()) {
  const fail = reason => ({ ok: false, reason });
  if (!/^[a-f0-9]{64}$/.test(a.sessionHash || '')) return fail('sign_in_required');
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', a.sessionHash)).unique();
  if (!session || session.expiresAt <= now) return fail('sign_in_required');
  const account = await ctx.db.get(session.accountId);
  if (!account) return fail('sign_in_required');
  const membership = await ctx.db.query('ascendWorkspaceMembers').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
  if (membership?.status === 'active') return fail('manager_required');
  const admin = account.email.toLowerCase().trim() === 'ahmed@bznsflowai.com';
  const plan = await planFor(ctx, account._id);
  if (!admin && (!plan || (a.product === 'ascend' && plan !== 'ascend'))) return fail('access_required');
  if (!['catalyst', 'ascend'].includes(a.product)) return fail('invalid_product');
  let progress = await ctx.db.query('productSetupProgress').withIndex('by_account_product', q => q.eq('accountId', account._id).eq('product', a.product)).unique();
  const settings = await ctx.db.query('hasibSettings').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
  if (a.operation !== 'get') {
    if (!Number.isInteger(a.step) || a.step < 0 || a.step > 3 || !Number.isInteger(a.version) || a.version < 0) return fail('invalid_progress');
    const requestSignature = JSON.stringify([a.step, a.completed === true, a.packId ?? null, a.stockPolicy ?? null, a.vat ? [a.vat.registered, a.vat.rateBps, a.vat.pricesIncludeVat, a.vat.vatin || ''] : null]);
    // Exact repeat is safe; stale tabs cannot replace newer progress or settings.
    if ((progress?.version || 0) !== a.version) {
      if (a.requestId && progress?.requestId === a.requestId && progress?.requestSignature === requestSignature) return { ok: true, value: { progress, settings: settings || null } };
      return fail('setup_conflict');
    }
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(a.requestId || '')) return fail('invalid_request');
    if (a.product === 'catalyst' && a.completed) {
      const draft = account.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
      if (!draft?.profile?.reviewed || !draft.lastPreview) return fail('preview_required');
    }
    if (a.product === 'ascend' && !account.draftHash) {
      if (!/^[a-f0-9]{64}$/.test(a.draftHash || '')) return fail('invalid_state');
      const existing = await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', a.draftHash)).unique();
      if (existing) return fail('invalid_state');
    }
    if (a.product === 'ascend') {
      if (a.packId !== undefined && !isLivePack(a.packId)) return fail('pack_not_live');
      if (a.completed && !isLivePack(a.packId || settings?.packId)) return fail('sector_required');
      if (a.packId !== undefined || a.vat !== undefined || a.stockPolicy !== undefined) {
        const result = await updateSettings(ctx, account._id, a, now);
        if (!result.ok) return result;
      }
      // Reuse the tenant boundary without requiring a channel or chatbot profile.
      if (!account.draftHash) {
        await ctx.db.insert('blueReviewSessions', { sessionHash: a.draftHash, accountId: account._id, status: 'empty', expiresAt: Number.MAX_SAFE_INTEGER, createdAt: now, updatedAt: now, attempts: 0 });
        await ctx.db.patch(account._id, { draftHash: a.draftHash });
      }
    }
    const next = { accountId: account._id, product: a.product, step: a.step, completed: a.completed === true, version: (progress?.version || 0) + 1, requestId: a.requestId, requestSignature, updatedAt: now };
    if (progress) await ctx.db.replace(progress._id, next); else await ctx.db.insert('productSetupProgress', next);
    await ctx.db.insert('productSetupAudit', { accountId: account._id, product: a.product, version: next.version, action: next.completed ? 'completed' : 'saved', at: now });
    progress = next;
  }
  return { ok: true, value: { progress: progress || { product: a.product, step: 0, completed: false, version: 0 }, settings: await ctx.db.query('hasibSettings').withIndex('by_account', q => q.eq('accountId', account._id)).unique(), admin } };
}
