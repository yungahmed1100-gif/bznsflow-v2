// Ascend's free website brief (Ahmed, 2026-10-18). The owner uploads a logo and photos straight to
// Convex storage, the HTTP route checks their bytes, and each submit stores a new version that the API
// emails to Ahmed (api/_lib/website-brief-api.js). Only an Ascend account's manager can use it.
import { BRIEF_MAX_PHOTOS, normalizeBrief } from '../config/website-brief.js';
import { planFor } from './hasib/plans.js';

const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const ADMIN = 'ahmed@bznsflowai.com';
const DAY = 86400000;
const UPLOADS_PER_DAY = 40;
// Logo plus photos, with room to replace some before submitting.
const MAX_FILES = 2 * (BRIEF_MAX_PHOTOS + 1);

async function ownerOf(ctx, sessionHash, now) {
  if (!/^[a-f0-9]{64}$/.test(sessionHash || '')) return { reason: 'sign_in_required' };
  const session = await ctx.db.query('sessions').withIndex('by_token_hash', q => q.eq('tokenHash', sessionHash)).unique();
  if (!session || session.expiresAt <= now) return { reason: 'sign_in_required' };
  const account = await ctx.db.get(session.accountId);
  if (!account) return { reason: 'sign_in_required' };
  const membership = await ctx.db.query('ascendWorkspaceMembers').withIndex('by_account', q => q.eq('accountId', account._id)).unique();
  if (membership?.status === 'active') return { reason: 'manager_required' };
  const admin = String(account.email).toLowerCase().trim() === ADMIN;
  if (!admin && (await planFor(ctx, account._id, now)) !== 'ascend') return { reason: 'access_required' };
  return { account };
}

const briefOf = (ctx, accountId) => ctx.db.query('websiteBriefs').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
const filesOf = (ctx, accountId) => ctx.db.query('websiteBriefFiles').withIndex('by_account', q => q.eq('accountId', accountId)).take(MAX_FILES + 1);
const fileUrl = async (ctx, id) => ({ id, url: await ctx.storage.getUrl(id), contentType: (await ctx.db.system.get(id))?.contentType || '' });

export async function executeWebsiteBrief(ctx, a, now = Date.now()) {
  const owner = await ownerOf(ctx, a.sessionHash, now);
  if (!owner.account) return fail(owner.reason);
  const { account } = owner;
  if (a.operation === 'get') return ok(await view(ctx, account));
  if (a.operation === 'upload_url') {
    const key = `website-brief:${account._id}:${Math.floor(now / DAY)}`;
    const rate = await ctx.db.query('blueMessageRates').withIndex('by_key', q => q.eq('key', key)).unique();
    if (rate?.count >= UPLOADS_PER_DAY) return fail('upload_limit');
    if (rate) await ctx.db.patch(rate._id, { count: rate.count + 1 }); else await ctx.db.insert('blueMessageRates', { key, count: 1, expiresAt: now + 2 * DAY });
    return ok({ url: await ctx.storage.generateUploadUrl() });
  }
  if (a.operation === 'file_register') return registerFile(ctx, account, a, now);
  if (a.operation === 'submit') return submit(ctx, account, a, now);
  if (a.operation === 'emailed') {
    const brief = await briefOf(ctx, account._id);
    if (!brief || brief.version !== a.version || typeof a.emailId !== 'string' || a.emailId.length > 200) return fail('invalid_state');
    await ctx.db.patch(brief._id, { emailedAt: now, emailId: a.emailId });
    return ok(null);
  }
  return fail('invalid_state');
}

/** The saved brief, or a start prefilled from the business details the owner already confirmed. */
async function view(ctx, account) {
  const brief = await briefOf(ctx, account._id);
  if (brief) {
    return { account: { email: account.email, name: account.name || '' }, version: brief.version, fields: brief.fields, submittedAt: brief.submittedAt, emailedAt: brief.emailedAt || null,
      logo: brief.logoId ? await fileUrl(ctx, brief.logoId) : null, photos: await Promise.all(brief.photoIds.map(id => fileUrl(ctx, id))) };
  }
  const row = account.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
  const p = row?.profile || {};
  const prefill = Object.fromEntries(Object.entries({ nameEn: p.businessName, services: p.services, hours: p.hours, address: p.location,
    phone: account.phone, email: account.email }).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.trim()]));
  return { account: { email: account.email, name: account.name || '' }, version: 0, fields: prefill, submittedAt: null, emailedAt: null, logo: null, photos: [] };
}

/** `fileCheck` is set by the HTTP route from the file's bytes, never by the client. */
async function registerFile(ctx, account, a, now) {
  const id = typeof a.storageId === 'string' ? ctx.db.system.normalizeId('_storage', a.storageId) : null;
  if (!id || !['logo', 'photo'].includes(a.kind)) return fail('invalid_file');
  const claimed = await ctx.db.query('websiteBriefFiles').withIndex('by_storage', q => q.eq('storageId', id)).unique();
  if (claimed) return claimed.accountId === account._id ? ok({ fileId: id }) : fail('invalid_file');
  if (a.fileCheck !== 'ok') {
    if (await ctx.db.system.get(id)) await ctx.storage.delete(id);
    return fail('invalid_file');
  }
  if ((await filesOf(ctx, account._id)).length >= MAX_FILES) {
    await ctx.storage.delete(id);
    return fail('too_many_files');
  }
  await ctx.db.insert('websiteBriefFiles', { accountId: account._id, storageId: id, kind: a.kind, at: now });
  return ok({ fileId: id });
}

async function submit(ctx, account, a, now) {
  const brief = await briefOf(ctx, account._id);
  // A stale tab must not replace a newer brief.
  if ((brief?.version || 0) !== a.version) return fail('brief_conflict');
  const checked = normalizeBrief(a.fields);
  if (!checked.ok) return { ok: false, reason: checked.reason, field: checked.field };
  const photoIds = Array.isArray(a.photoIds) ? a.photoIds : [];
  if (photoIds.length > BRIEF_MAX_PHOTOS || new Set(photoIds).size !== photoIds.length) return fail('too_many_files');
  const files = await filesOf(ctx, account._id);
  const mine = (id, kind) => files.find(f => f.storageId === id && f.kind === kind);
  if (a.logoId !== undefined && a.logoId !== null && !mine(a.logoId, 'logo')) return fail('invalid_file');
  if (!photoIds.every(id => mine(id, 'photo'))) return fail('invalid_file');
  if (!a.logoId && !checked.value.designLogo) return { ok: false, reason: 'brief_required', field: 'logo' };
  // Files uploaded but left out of this brief are deleted now, not kept forever.
  const used = new Set([a.logoId, ...photoIds].filter(Boolean));
  for (const f of files) if (!used.has(f.storageId)) { await ctx.db.delete(f._id); await ctx.storage.delete(f.storageId); }
  const version = (brief?.version || 0) + 1;
  const next = { accountId: account._id, version, fields: checked.value, photoIds, submittedAt: now, ...(a.logoId ? { logoId: a.logoId } : {}) };
  if (brief) await ctx.db.replace(brief._id, next); else await ctx.db.insert('websiteBriefs', next);
  return ok({ version, update: version > 1, account: { email: account.email, name: account.name || '' }, fields: checked.value,
    logo: a.logoId ? await fileUrl(ctx, a.logoId) : null, photos: await Promise.all(photoIds.map(id => fileUrl(ctx, id))) });
}
