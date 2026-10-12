// Adiba: the agent who drafts the quotes and offers that need the owner. She prices a line only from
// a fixed catalog price or a value the owner set; anything else waits for the owner's figure. The owner
// approves; Layla sends; the customer's recorded yes is accepted with its message as evidence.
// States: needs_price → awaiting_approval → sent → accepted (or blocked, declined, expired, cancelled).
import { owned } from '../blueTenant.js';
import { ok, fail, nextNumber, byRequest } from './shared.js';
import { audit } from './workspaceState.js';
import { priceLines, offerTotal, offerReasons, depositMinor as depositFrom } from '../../config/adiba-pricing.js';
import { offerText, termsFrom } from './adibaText.js';
import { SUBJECTS } from './adibaSubjects.js';

const DAY = 86400000;
export const OPEN_STATUSES = Object.freeze(['needs_price', 'awaiting_approval', 'sent', 'blocked']);
const EDITABLE = new Set(['needs_price', 'awaiting_approval', 'blocked']);
const MAX_LINES = 20;

export const publicOffer = o => o && ({ id: o._id, ref: o.ref, packId: o.packId, kind: o.kind, subjectType: o.subjectType, subjectId: o.subjectId,
  contactId: o.contactId || null, conversationId: o.conversationId || null, status: o.status, reasons: o.reasons, lines: o.lines,
  totalMinor: o.totalMinor ?? null, depositMinor: o.depositMinor ?? null, currency: o.currency, text: o.text, lang: o.lang, validUntil: o.validUntil,
  sentAt: o.sentAt || null, sendSkip: o.sendSkip || null, acceptance: o.acceptance || null, offerVersion: o.offerVersion, version: o.version, createdAt: o.createdAt });

/** A sent offer past its date is expired when it is next read. */
async function settle(ctx, o, now) {
  if (o?.status === 'sent' && o.validUntil < now) { await ctx.db.patch(o._id, { status: 'expired', updatedAt: now }); return { ...o, status: 'expired' }; }
  return o;
}

/** The customer-facing wording for the current figures (only once every line is priced). */
async function wording(ctx, tenant, o) {
  if (o.totalMinor === undefined || o.totalMinor === null) return '';
  const md = tenant.row?.bznsPublished?.markdown || '';
  const note = o.subjectType === 'media_production' ? (o.lang === 'ar' ? 'تُؤكَّد مواعيد التصوير عند الحجز.' : 'Shoot dates are confirmed at booking.') : '';
  return offerText({ ...o, business: tenant.row?.profile?.businessName || '' }, { ar: o.lang === 'ar', terms: termsFrom(md), note });
}

/**
 * Drafts an offer, once per request and never twice for the same subject while one is open.
 * @param {object} spec { requestId, packId, kind, subjectType, subjectId, contactId?, conversationId?, lines, flags?, limitMinor?, depositPercent?, depositMinor?, lang?, currency?, validDays? }
 * @returns {Promise<object>} the offer row
 */
export async function draftOffer(ctx, tenant, spec, now) {
  const replay = await byRequest(ctx, 'adibaOffers', tenant.accountId, spec.requestId);
  if (replay) return replay;
  const open = (await ctx.db.query('adibaOffers').withIndex('by_subject', q => q.eq('subjectType', spec.subjectType).eq('subjectId', String(spec.subjectId))).take(20))
    .find(o => o.accountId === tenant.accountId && OPEN_STATUSES.includes(o.status));
  if (open) return open;
  const lines = priceLines(spec.lines.slice(0, MAX_LINES)).map((l, i) => ({ key: spec.lines[i].key || `l${i + 1}`, ...l, ...(spec.lines[i].catalogEntryKey ? { catalogEntryKey: spec.lines[i].catalogEntryKey } : {}) }));
  const reasons = offerReasons(lines, { limitMinor: spec.limitMinor || 0, ...(spec.flags || {}) });
  const total = offerTotal(lines);
  const deposit = total === null ? undefined : spec.depositMinor ?? (spec.depositPercent ? depositFrom(total, spec.depositPercent) : undefined);
  const row = { accountId: tenant.accountId, requestId: spec.requestId, ref: `OFR-${String(await nextNumber(ctx, tenant.accountId, 'adiba_offer')).padStart(3, '0')}`,
    packId: spec.packId, kind: spec.kind, subjectType: spec.subjectType, subjectId: String(spec.subjectId), ...(spec.contactId ? { contactId: spec.contactId } : {}),
    ...(spec.conversationId ? { conversationId: spec.conversationId } : {}), status: total === null ? 'needs_price' : 'awaiting_approval', reasons, lines,
    ...(total !== null ? { totalMinor: total } : {}), ...(deposit !== undefined ? { depositMinor: deposit } : {}), currency: spec.currency || 'OMR', text: '', lang: spec.lang === 'ar' ? 'ar' : 'en',
    validUntil: now + (spec.validDays || 14) * DAY, offerVersion: 1, version: 1, createdAt: now, updatedAt: now };
  const id = await ctx.db.insert('adibaOffers', row);
  const text = await wording(ctx, tenant, row);
  if (text) await ctx.db.patch(id, { text });
  return ctx.db.get(id);
}

/** Sends the approved offer as a message in the customer's chat, without taking the chat over. */
async function sendOffer(ctx, tenant, o, now) {
  const conversation = o.conversationId ? await owned(ctx, o.conversationId, tenant.accountId, 'blueConversations') : null;
  if (!conversation) return { skip: 'no_conversation' };
  if (conversation.optout) return { skip: 'opted_out' };
  if (!conversation.lastInbound || conversation.lastInbound + DAY <= now) return { skip: 'window_closed' };
  if (tenant.row?.integration?.id !== conversation.integrationId) return { skip: 'other_number' };
  const control = await ctx.db.query('blueMessagingControls').withIndex('by_integration', q => q.eq('integrationId', conversation.integrationId)).unique();
  if (!control?.active && !conversation.takeover) return { skip: 'layla_paused' };
  // While a person handles the chat, the approved offer goes as the team's message; otherwise as Layla's.
  const messageId = await ctx.db.insert('blueMessages', { key: `offer:${o._id}:v${o.offerVersion}`, integrationId: conversation.integrationId, accountId: tenant.accountId,
    conversationId: conversation._id, conversationVersion: conversation.version || 0, profileVersion: tenant.row.profileVersion || 1,
    direction: 'out', text: o.text, at: now, expiresAt: now + 30 * DAY, textExpiresAt: now + 30 * DAY, status: 'queued', manual: !!conversation.takeover, handoff: false });
  if (tenant.workerFunction) await ctx.scheduler.runAfter(0, tenant.workerFunction, { jobId: messageId });
  return { messageId };
}

/**
 * Records a customer's acceptance and applies it to the offer's record (as the given actor).
 * @param {{ by: string, evidence: string, messageId?: string }} who
 */
export async function acceptOffer(ctx, tenant, actor, o, who, now) {
  if (o.status !== 'sent') return fail('offer_not_open');
  if (o.validUntil < now) { await ctx.db.patch(o._id, { status: 'expired', updatedAt: now }); return fail('offer_expired'); }
  const applied = await SUBJECTS[o.subjectType].accept(ctx, tenant, actor, o, who, now);
  if (!applied.ok) return fail(applied.reason || 'offer_record_refused');
  await ctx.db.patch(o._id, { status: 'accepted', acceptance: { at: now, ...(who.messageId ? { messageId: who.messageId } : {}), evidence: who.evidence.slice(0, 40), by: who.by.slice(0, 120) }, version: o.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'offer_accepted', 'offer', o._id, now, `${o.ref}|${who.evidence}`);
  return ok(publicOffer(await ctx.db.get(o._id)));
}

const stale = (o, a) => (!o ? 'offer_not_found' : o.version !== a.version ? 'offer_conflict' : null);

/** The owner fills unpriced lines (and may edit quantity, wording or deposit) before approving. */
async function price(ctx, tenant, actor, o, a, now) {
  if (!EDITABLE.has(o.status)) return fail('offer_locked');
  const edits = new Map((a.adiba?.lines || []).map(l => [l.key, l]));
  const lines = o.lines.map(l => {
    const e = edits.get(l.key);
    if (!e) return l;
    const qty = Number.isInteger(e.qty) && e.qty > 0 && e.qty <= 999 ? e.qty : l.qty;
    if (Number.isInteger(e.unitPriceMinor) && e.unitPriceMinor >= 0 && e.unitPriceMinor < 1e10) return { key: l.key, name: e.name?.trim() || l.name, qty, unitPriceMinor: e.unitPriceMinor, priceSource: l.priceSource === 'unpriced' || e.unitPriceMinor !== l.unitPriceMinor ? 'owner' : l.priceSource, ...(l.catalogEntryKey ? { catalogEntryKey: l.catalogEntryKey } : {}) };
    return { ...l, qty, name: e.name?.trim() || l.name };
  });
  const total = offerTotal(lines);
  const deposit = Number.isInteger(a.adiba?.depositMinor) && total !== null && a.adiba.depositMinor <= total ? a.adiba.depositMinor : o.depositMinor;
  const next = { lines, ...(total !== null ? { totalMinor: total, status: 'awaiting_approval' } : { status: 'needs_price' }), ...(deposit !== undefined && total !== null ? { depositMinor: Math.min(deposit, total) } : {}),
    ...(Number.isInteger(a.adiba?.validUntil) && a.adiba.validUntil > now ? { validUntil: a.adiba.validUntil } : {}), reasons: o.reasons.filter(r => !['unpriced_line', 'price_from', 'price_range', 'price_quote', 'custom_deliverable'].includes(r) || total === null),
    version: o.version + 1, updatedAt: now, sendSkip: undefined };
  const text = typeof a.adiba?.text === 'string' && a.adiba.text.trim() ? a.adiba.text.trim().slice(0, 4000) : await wording(ctx, tenant, { ...o, ...next });
  await ctx.db.patch(o._id, { ...next, text });
  await audit(ctx, tenant, actor, 'offer_priced', 'offer', o._id, now, o.ref);
  return ok(publicOffer(await ctx.db.get(o._id)));
}

/** The owner approves: the record is updated by its sector, then Layla sends the offer in the chat. */
async function approve(ctx, tenant, actor, o, now) {
  if (!['awaiting_approval', 'blocked'].includes(o.status)) return fail(o.status === 'needs_price' ? 'offer_unpriced' : 'offer_locked');
  if (o.lines.some(l => !Number.isInteger(l.unitPriceMinor)) || !Number.isInteger(o.totalMinor)) return fail('offer_unpriced');
  if (o.status === 'awaiting_approval') {
    const applied = await SUBJECTS[o.subjectType].approve(ctx, tenant, actor, o, now);
    if (!applied.ok) return fail(applied.reason || 'offer_record_refused');
  }
  const sent = await sendOffer(ctx, tenant, o, now);
  await ctx.db.patch(o._id, sent.skip ? { status: 'blocked', sendSkip: sent.skip, approvedBy: actor.actorAccountId, approvedAt: now, version: o.version + 1, updatedAt: now }
    : { status: 'sent', messageId: sent.messageId, sentAt: now, sendSkip: undefined, approvedBy: actor.actorAccountId, approvedAt: now, version: o.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'offer_approved', 'offer', o._id, now, sent.skip ? `${o.ref}|blocked:${sent.skip}` : o.ref);
  return ok(publicOffer(await ctx.db.get(o._id)));
}

/**
 * Hasib quotes by himself only when Adiba found nothing for the owner to decide: every line fixed and
 * within the studio's limit. It goes through the same approval and send as the owner's.
 */
export async function approveAutomatically(ctx, tenant, actor, o, now) {
  if (o.status !== 'awaiting_approval' || o.reasons.length) return fail('owner_decision_needed');
  return approve(ctx, tenant, actor, o, now);
}

/** Cancels an offer whose record moved on without it (staff quoted by hand, or decided the change). */
export async function cancelStaleOffer(ctx, o, now) {
  if (!['needs_price', 'awaiting_approval', 'blocked'].includes(o.status)) return;
  await ctx.db.patch(o._id, { status: 'cancelled', version: o.version + 1, updatedAt: now });
}

export async function executeAdiba(ctx, tenant, actor, a, now) {
  if (!a.operation?.startsWith('adiba_')) return null;
  if (a.operation === 'adiba_offers') {
    const status = OPEN_STATUSES.includes(a.status) || ['accepted', 'expired', 'cancelled', 'declined'].includes(a.status) ? [a.status] : OPEN_STATUSES;
    const rows = [];
    for (const s of status) rows.push(...(await ctx.db.query('adibaOffers').withIndex('by_account_status', q => q.eq('accountId', tenant.accountId).eq('status', s)).order('desc').take(100)));
    const settled = await Promise.all(rows.map(o => settle(ctx, o, now)));
    const items = settled.filter(o => (!a.conversationId || String(o.conversationId) === String(a.conversationId)) && (!a.contactId || String(o.contactId) === String(a.contactId)))
      .sort((x, y) => y.createdAt - x.createdAt).map(publicOffer);
    return ok({ items, counts: Object.fromEntries(OPEN_STATUSES.map(s => [s, settled.filter(o => o.status === s).length])) });
  }
  const o = await settle(ctx, await owned(ctx, a.offerId, tenant.accountId, 'adibaOffers'), now);
  if (!o) return fail('offer_not_found');
  if (a.operation === 'adiba_offer') return ok(publicOffer(o));
  const refusal = stale(o, a);
  if (refusal) return fail(refusal);
  switch (a.operation) {
    case 'adiba_offer_price': return price(ctx, tenant, actor, o, a, now);
    case 'adiba_offer_approve': return approve(ctx, tenant, actor, o, now);
    case 'adiba_offer_withdraw': {
      if (['accepted', 'cancelled'].includes(o.status)) return fail('offer_locked');
      await ctx.db.patch(o._id, { status: 'cancelled', version: o.version + 1, updatedAt: now });
      await audit(ctx, tenant, actor, 'offer_withdrawn', 'offer', o._id, now, o.ref);
      return ok(publicOffer(await ctx.db.get(o._id)));
    }
    case 'adiba_offer_accept_record': {
      const by = String(a.adiba?.acceptedBy || '').trim(), evidence = String(a.adiba?.evidenceSource || '').trim();
      if (!by || !evidence) return fail('acceptance_evidence_required');
      return acceptOffer(ctx, tenant, actor, o, { by, evidence }, now);
    }
    default: return fail('invalid_action');
  }
}
