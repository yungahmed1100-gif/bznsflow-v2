// Ascend's free website brief (Ahmed, 2026-10-18). The owner uploads a logo and photos straight to
// Convex storage, the HTTP route checks their bytes, and each submit stores a new version that the API
// emails to Ahmed (api/_lib/website-brief-api.js). Only an Ascend account's manager can use it.
// Since 2026-10-23 it is filled in as a wizard: each step saves a draft, and the first submit starts the
// website's delivery (websiteProjects), promised within three business days.
import { BRIEF_MAX_PHOTOS, BRIEF_TEXT, addBusinessDays, normalizeBrief } from '../config/website-brief.js';
import { planFor } from './hasib/plans.js';

const ok = value => ({ ok: true, value }), fail = reason => ({ ok: false, reason });
const ADMIN = 'ahmed@bznsflowai.com';
const DAY = 86400000;
const HOUR = 3600000;
const UPLOADS_PER_DAY = 40;
const DOMAIN_CHECKS_PER_HOUR = 30;
const STEPS = 6;
const DRAFT_KEYS = new Set([...Object.keys(BRIEF_TEXT), 'domainStatus', 'languages', 'style', 'colors', 'references', 'pages', 'designLogo', 'domainAlternates']);
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
  // Ascend's free website; Apex holds everything Ascend has (2026-10-27).
  if (!admin && !['ascend', 'apex'].includes(await planFor(ctx, account._id, now))) return { reason: 'access_required' };
  return { account };
}

const briefOf = (ctx, accountId) => ctx.db.query('websiteBriefs').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
const filesOf = (ctx, accountId) => ctx.db.query('websiteBriefFiles').withIndex('by_account', q => q.eq('accountId', accountId)).take(MAX_FILES + 1);
const fileUrl = async (ctx, id) => ({ id, url: await ctx.storage.getUrl(id), contentType: (await ctx.db.system.get(id))?.contentType || '' });
const draftOf = (ctx, accountId) => ctx.db.query('websiteDrafts').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
const projectOf = (ctx, accountId) => ctx.db.query('websiteProjects').withIndex('by_account', q => q.eq('accountId', accountId)).unique();

/** Count one use against a daily or hourly allowance; false once it is spent. */
async function spend(ctx, key, limit, ttl, now) {
  const rate = await ctx.db.query('blueMessageRates').withIndex('by_key', q => q.eq('key', key)).unique();
  if (rate?.count >= limit) return false;
  if (rate) await ctx.db.patch(rate._id, { count: rate.count + 1 }); else await ctx.db.insert('blueMessageRates', { key, count: 1, expiresAt: now + ttl });
  return true;
}

/** What the owner sees of their website's delivery. */
export const publicProject = p => p && ({ stage: p.stage, stageAt: p.stageAt, dueAt: p.dueAt, domain: p.domain || '', mailbox: p.mailbox || '',
  liveUrl: p.liveUrl || '', delayReason: p.delayReason || '' });

export async function executeWebsiteBrief(ctx, a, now = Date.now()) {
  const owner = await ownerOf(ctx, a.sessionHash, now);
  if (!owner.account) return fail(owner.reason);
  const { account } = owner;
  if (a.operation === 'get') return ok(await view(ctx, account));
  if (a.operation === 'upload_url') {
    if (!await spend(ctx, `website-brief:${account._id}:${Math.floor(now / DAY)}`, UPLOADS_PER_DAY, 2 * DAY, now)) return fail('upload_limit');
    return ok({ url: await ctx.storage.generateUploadUrl() });
  }
  // The API asks before each registrar lookup, so one owner cannot run up lookups.
  if (a.operation === 'domain_rate') return await spend(ctx, `website-domain:${account._id}:${Math.floor(now / HOUR)}`, DOMAIN_CHECKS_PER_HOUR, 2 * HOUR, now) ? ok(null) : fail('too_many');
  if (a.operation === 'file_register') return registerFile(ctx, account, a, now);
  if (a.operation === 'save_draft') return saveDraft(ctx, account, a, now);
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
  const [brief, draft, project] = [await briefOf(ctx, account._id), await draftOf(ctx, account._id), await projectOf(ctx, account._id)];
  const base = { account: { email: account.email, name: account.name || '' }, version: brief?.version || 0, submittedAt: brief?.submittedAt || null,
    emailedAt: brief?.emailedAt || null, project: publicProject(project), draft: draft ? { step: draft.step, updatedAt: draft.updatedAt } : null };
  // A draft in progress wins; then the last brief sent; then a start from what the owner already confirmed.
  const source = draft || brief;
  if (source) {
    return { ...base, fields: source.fields, prefilled: [], logo: source.logoId ? await fileUrl(ctx, source.logoId) : null,
      photos: await Promise.all(source.photoIds.map(id => fileUrl(ctx, id))) };
  }
  const prefill = await prefillOf(ctx, account);
  return { ...base, fields: prefill, prefilled: Object.keys(prefill).filter(k => !['mailboxLocal', 'recoveryEmail'].includes(k)), logo: null, photos: [] };
}

/** The BznsBrain details the owner already confirmed, and the approved catalog's names as the services. */
async function prefillOf(ctx, account) {
  const row = account.draftHash ? await ctx.db.query('blueReviewSessions').withIndex('by_hash', q => q.eq('sessionHash', account.draftHash)).unique() : null;
  const p = row?.profile || {};
  const catalog = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', String(account._id)).eq('status', 'approved')).take(30);
  const names = catalog.map(e => e.nameEn || e.nameAr).filter(Boolean);
  const services = names.length ? names.join('\n').slice(0, 2000) : p.services;
  return Object.fromEntries(Object.entries({ nameEn: p.businessName, services, hours: p.hours, address: p.location,
    phone: account.phone, email: account.email, recoveryEmail: account.email, mailboxLocal: 'info' })
    .filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, v.trim()]));
}

/** One step's answers, kept as typed: checked only for shape and size until the brief is sent. */
async function saveDraft(ctx, account, a, now) {
  const fields = a.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || !Number.isInteger(a.step) || a.step < 0 || a.step >= STEPS) return fail('invalid_brief');
  const kept = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!DRAFT_KEYS.has(key)) continue;
    const fine = typeof value === 'boolean' || (typeof value === 'string' && value.length <= 2000)
      || (Array.isArray(value) && value.length <= 6 && value.every(x => typeof x === 'string' && x.length <= 300));
    if (!fine) return { ok: false, reason: 'invalid_brief', field: key };
    kept[key] = value;
  }
  const photoIds = Array.isArray(a.photoIds) ? a.photoIds : [];
  if (photoIds.length > BRIEF_MAX_PHOTOS || new Set(photoIds).size !== photoIds.length) return fail('too_many_files');
  const files = await filesOf(ctx, account._id);
  const mine = (id, kind) => files.some(f => f.storageId === id && f.kind === kind);
  if ((a.logoId && !mine(a.logoId, 'logo')) || !photoIds.every(id => mine(id, 'photo'))) return fail('invalid_file');
  const next = { accountId: account._id, fields: kept, step: a.step, photoIds, updatedAt: now, ...(a.logoId ? { logoId: a.logoId } : {}) };
  const draft = await draftOf(ctx, account._id);
  if (draft) await ctx.db.replace(draft._id, next); else await ctx.db.insert('websiteDrafts', next);
  return ok({ step: a.step, updatedAt: now });
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
  const draft = await draftOf(ctx, account._id);
  if (draft) await ctx.db.delete(draft._id);
  const project = await startProject(ctx, account._id, checked.value, now);
  return ok({ version, update: version > 1, account: { email: account.email, name: account.name || '' }, fields: checked.value, project: publicProject(project),
    logo: a.logoId ? await fileUrl(ctx, a.logoId) : null, photos: await Promise.all(photoIds.map(id => fileUrl(ctx, id))) });
}

/**
 * The first brief starts the delivery clock; a later version keeps it. Until the domain is registered the
 * owner can still change their choice, so the project follows the newest brief's domain and mailbox.
 */
async function startProject(ctx, accountId, fields, now) {
  const domain = fields.domainChoice, mailbox = `${fields.mailboxLocal}@${fields.domainChoice}`;
  const project = await projectOf(ctx, accountId);
  if (!project) {
    const id = await ctx.db.insert('websiteProjects', { accountId, stage: 'received', stageAt: { received: now }, dueAt: addBusinessDays(now), domain, mailbox, createdAt: now, updatedAt: now });
    return ctx.db.get(id);
  }
  if (project.stage === 'received') await ctx.db.patch(project._id, { domain, mailbox, updatedAt: now });
  return ctx.db.get(project._id);
}
