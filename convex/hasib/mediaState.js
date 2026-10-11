// Media & production (ascend/media.md): brief → quote → acceptance and deposit → booked holds →
// preproduction → shoot → cuts with exact-version client decisions → handoff. Every move is
// checked against its guards and recorded with who made it. Orders are the one record of money.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, REQUEST_ID, byRequest, settingsFor, nextNumber } from './shared.js';
import { isMinor } from './money.js';
import { createOrder, recordPayment, PAYMENT_METHODS } from './ordersState.js';
import { audit, workspaceContainsAccount } from './workspaceState.js';
import { publicRow } from './workspace/rows.js';
import { sendApprovedDraft } from './workspace/drafts.js';
import { mediaSettings } from './mediaSettings.js';
import { canSeeProduction, visibleProduction, studioFor, describe, factsOf, refreshStudio, mediaOverview, loadStudio } from './mediaBoard.js';
import { mediaFollowupQueue, resolveMediaTask, snoozeMediaTask, mediaContext } from './mediaFollowups.js';
import { resourceSave, reservationSave, reservationStatus, calendar, resourceList, costSave, costVoid } from './mediaResources.js';
import { mediaInsights, mediaMetricRecords } from './mediaInsights.js';
import { HOUR, ACTIVE, DONE, PRODUCTION_TYPES, PREP_ITEMS, briefGaps, depositFor, latestCut, manualMoveRefusal, cleanDeliverables, cleanRights, needsClearance, validLink } from './mediaDomain.js';

const MANAGER_ONLY = new Set(['media_quote', 'media_accept', 'media_payment_record', 'media_change_order_decide', 'media_resource_save', 'media_cost_save', 'media_cost_void',
  'media_costs_final', 'media_draft_approve', 'media_insights', 'media_metric_records']);
const CLOSED = new Set([...DONE, 'cancelled']);

const event = (ctx, tenant, actor, productionId, kind, now, extra = {}) => ctx.db.insert('mediaEvents', { accountId: tenant.accountId, productionId, kind, ...extra,
  actorAccountId: actor.actorAccountId, actorRole: actor.role, at: now });
/** The production as the dashboard reads it, with its linked records. */
async function card(ctx, tenant, actor, id, now) {
  const row = await ctx.db.get(id);
  return (await describe(ctx, tenant.accountId, actor, await studioFor(ctx, tenant.accountId, [row]), [row], now))[0];
}
async function assignmentAllowed(ctx, actor, accountId) {
  if (!accountId) return true;
  if (actor.role === 'employee') return String(accountId) === String(actor.actorAccountId);
  return workspaceContainsAccount(ctx, actor.workspace, accountId);
}
const time = v => v === undefined ? undefined : Number.isSafeInteger(v) && v > 0 ? v : null;

/** Creates or edits the brief. Scope and schedule lock once the quote is accepted; later changes are change orders. */
async function productionSave(ctx, tenant, actor, a, now) {
  const m = a.media || {}, accountId = tenant.accountId;
  let row = null;
  if (a.productionId) {
    row = await visibleProduction(ctx, tenant, actor, a.productionId);
    if (!row) return fail('production_not_found');
    if (row.version !== a.version) return fail('production_conflict');
    if (CLOSED.has(row.status)) return fail('production_closed');
  } else {
    if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
    const replay = await byRequest(ctx, 'mediaProductions', accountId, a.requestId);
    if (replay) return ok(await card(ctx, tenant, actor, replay._id, now));
  }
  const contactId = row?.contactId || m.contactId;
  if (!await owned(ctx, contactId, accountId, 'blueContacts')) return fail('contact_not_found');
  const conversationId = m.conversationId ?? row?.conversationId;
  if (conversationId && !await owned(ctx, conversationId, accountId, 'blueConversations')) return fail('conversation_not_found');
  const accepted = row?.acceptedQuoteVersion !== undefined;
  const pick = (key, fallback) => m[key] !== undefined ? m[key] : row?.[key] ?? fallback;
  if (accepted && (m.deliverables !== undefined || m.productionType !== undefined || m.revisionAllowance !== undefined)) return fail('scope_locked');
  if (accepted && (m.shootStartsAt !== undefined || m.shootEndsAt !== undefined) && (m.shootStartsAt !== row.shootStartsAt || m.shootEndsAt !== row.shootEndsAt)) return fail('schedule_locked');
  const productionType = pick('productionType', 'video'), deliverables = m.deliverables !== undefined ? cleanDeliverables(m.deliverables, bounded) : (row?.deliverables || []);
  const usageRights = m.usageRights !== undefined ? cleanRights(m.usageRights, bounded) : (row?.usageRights || { channels: [], clearance: 'unknown' });
  const times = Object.fromEntries(['shootStartsAt', 'shootEndsAt', 'deliveryDueAt', 'firstCutDueAt'].map(k => [k, m[k] !== undefined ? time(m[k]) : row?.[k]]));
  const allowance = pick('revisionAllowance', mediaSettings(await settingsFor(ctx, accountId)).revisionAllowance);
  const budget = pick('budgetMinor');
  if (!PRODUCTION_TYPES.includes(productionType) || deliverables === null || !usageRights || Object.values(times).some(t => t === null)
    || (times.shootStartsAt && times.shootEndsAt && times.shootEndsAt <= times.shootStartsAt) || !Number.isSafeInteger(allowance) || allowance < 0 || allowance > 20
    || (budget !== undefined && !isMinor(budget))) return fail('invalid_production');
  const producerId = m.producerId !== undefined ? (m.producerId || undefined) : row ? row.producerId : (actor.role === 'employee' ? actor.actorAccountId : undefined);
  if (!await assignmentAllowed(ctx, actor, producerId)) return fail('invalid_assignment');
  const title = bounded(pick('title'), 120) || `${productionType.replace('_', ' ')} production`;
  const data = { contactId, ...(conversationId ? { conversationId } : {}), title, productionType, deliverables, usageRights, revisionAllowance: allowance,
    ...Object.fromEntries(Object.entries(times).filter(([, v]) => v)), source: bounded(pick('source', 'manual'), 40) || 'manual',
    ...(bounded(pick('purpose'), 240) ? { purpose: bounded(pick('purpose'), 240) } : {}), ...(budget !== undefined ? { budgetMinor: budget } : {}),
    ...(bounded(pick('dateNeeded'), 80) ? { dateNeeded: bounded(pick('dateNeeded'), 80) } : {}), ...(bounded(pick('location'), 160) ? { location: bounded(pick('location'), 160) } : {}),
    ...(bounded(pick('nextAction'), 200) ? { nextAction: bounded(pick('nextAction'), 200) } : {}), ...(producerId ? { producerId } : {}), version: (row?.version || 0) + 1, updatedAt: now };
  let id;
  if (row) {
    // Optional fields cleared by the form are removed rather than kept.
    await ctx.db.replace(row._id, { ...Object.fromEntries(Object.entries(row).filter(([k]) => !['_id', '_creationTime', '_seq', 'table', 'producerId', 'location', 'purpose', 'nextAction', 'dateNeeded', 'budgetMinor'].includes(k))), ...data });
    id = row._id;
  } else {
    const ref = `PRJ-${String(await nextNumber(ctx, accountId, 'media_production')).padStart(3, '0')}`;
    id = await ctx.db.insert('mediaProductions', { ...data, accountId, requestId: a.requestId, ref, status: 'brief_incomplete', statusAt: now, quoteMinor: 0, quoteVersion: 0, depositMinor: 0,
      roundsUsed: 0, prep: PREP_ITEMS.map(i => ({ ...i })), costsFinal: false, createdAt: now });
    await event(ctx, tenant, actor, id, 'created', now, { to: 'brief_incomplete' });
  }
  await audit(ctx, tenant, actor, row ? 'production_updated' : 'production_created', 'production', id, now);
  return ok(await card(ctx, tenant, actor, id, now));
}

/** Issues (or re-issues) the quote. The deposit follows Settings unless the manager sets it. */
async function quote(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (!['brief_incomplete', 'quoted', 'awaiting_acceptance'].includes(p.status) || p.acceptedQuoteVersion !== undefined) return fail('quote_locked');
  const gaps = briefGaps(p);
  if (gaps.length) return fail(`brief_incomplete:${gaps.join(',')}`);
  if (!isMinor(m.quoteMinor) || m.quoteMinor <= 0) return fail('invalid_quote');
  const deposit = m.depositMinor ?? depositFor(m.quoteMinor, mediaSettings(await settingsFor(ctx, tenant.accountId)).depositPercent);
  if (!isMinor(deposit) || deposit > m.quoteMinor) return fail('invalid_quote');
  await ctx.db.patch(p._id, { quoteMinor: m.quoteMinor, depositMinor: deposit, quoteVersion: p.quoteVersion + 1, quotedAt: now, status: 'quoted', statusAt: now, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'quote_issued', now, { from: p.status, to: 'quoted', detail: String(m.quoteMinor) });
  await audit(ctx, tenant, actor, 'quote_issued', 'production', p._id, now, String(m.quoteMinor));
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** Records the customer's acceptance of the current quote version and opens its order. */
async function accept(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (!['quoted', 'awaiting_acceptance'].includes(p.status) || p.acceptedQuoteVersion !== undefined) return fail('invalid_status_transition');
  if (m.quoteVersion !== p.quoteVersion) return fail('stale_quote');
  const acceptedBy = bounded(m.acceptedBy, 120), evidence = bounded(m.evidenceSource, 40);
  if (!acceptedBy || !evidence) return fail('acceptance_evidence_required');
  const order = await createOrder(ctx, tenant, { requestId: `media-order:${p._id}`, channel: 'walk_in', contactId: p.contactId, kind: 'media_production', source: 'media',
    fulfilment: { type: 'in_store' }, lines: [{ name: `${p.ref} ${p.title}`.slice(0, 120), qty: 1, unitPriceMinor: p.quoteMinor }] }, now, { internal: true });
  if (!order.ok) return order;
  await ctx.db.patch(p._id, { acceptedQuoteVersion: p.quoteVersion, acceptedAt: now, acceptedBy, orderId: order.value.id, originalDueAt: p.deliveryDueAt,
    status: 'awaiting_acceptance', statusAt: p.status === 'awaiting_acceptance' ? p.statusAt : now, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'quote_accepted', now, { from: p.status, to: 'awaiting_acceptance', detail: `v${p.quoteVersion}:${evidence}` });
  await audit(ctx, tenant, actor, 'quote_accepted', 'production', p._id, now, acceptedBy);
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** A deposit or later payment on the production order (or an approved change order's order). */
async function payment(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await owned(ctx, a.productionId, tenant.accountId, 'mediaProductions');
  if (!p) return fail('production_not_found');
  let orderId = p.orderId;
  if (m.changeOrderId) {
    const change = await owned(ctx, m.changeOrderId, tenant.accountId, 'mediaChangeOrders');
    if (!change || String(change.productionId) !== String(p._id) || !change.orderId) return fail('change_order_not_found');
    orderId = change.orderId;
  }
  if (!orderId) return fail('acceptance_required');
  if (!PAYMENT_METHODS.includes(a.method)) return fail('invalid_payment');
  const paid = await recordPayment(ctx, tenant.accountId, { requestId: a.requestId, orderId, amountMinor: a.amountMinor, method: a.method, reference: bounded(a.reference, 80) || 'production' }, now);
  if (!paid.ok) return paid;
  await event(ctx, tenant, actor, p._id, 'payment_recorded', now, { detail: String(a.amountMinor) });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** A move on the board: present the quote, book, start preproduction or the shoot, hold, resume, cancel or close. */
async function statusMove(ctx, tenant, actor, a, now) {
  const p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  const studio = await studioFor(ctx, tenant.accountId, [p]), to = a.status;
  const refusal = manualMoveRefusal(p, to, factsOf(studio, p, now));
  if (refusal) return fail(refusal);
  const reason = bounded(a.reason, 200);
  if (to === 'cancelled' && !reason) return fail('cancel_reason_required');
  const patch = { status: to, statusAt: now, version: p.version + 1, updatedAt: now, ...(to === 'on_hold' ? { holdFrom: p.status } : {}), ...(to === 'cancelled' ? { cancelReason: reason } : {}) };
  if (p.status === 'on_hold') { const { holdFrom, ...rest } = p; await ctx.db.replace(p._id, { ...Object.fromEntries(Object.entries(rest).filter(([k]) => !['_id', '_creationTime', '_seq', 'table'].includes(k))), ...patch }); }
  else await ctx.db.patch(p._id, patch);
  if (to === 'cancelled') {
    // Cancelling releases the holds and stops unsent drafts; recorded costs and payments stay.
    for (const r of studio.reservations) if (['held', 'confirmed'].includes(r.status)) await ctx.db.patch(r._id, { status: 'released', version: r.version + 1, updatedAt: now });
    for (const d of studio.drafts) if (d.status === 'draft') await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  }
  await event(ctx, tenant, actor, p._id, 'status', now, { from: p.status, to, ...(reason ? { detail: reason } : {}) });
  await audit(ctx, tenant, actor, 'production_status', 'production', p._id, now, `${p.status}>${to}`);
  return ok(await card(ctx, tenant, actor, p._id, now));
}

async function prepVerify(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (CLOSED.has(p.status)) return fail('production_closed');
  if (!p.prep.some(i => i.key === m.key) || typeof m.verified !== 'boolean') return fail('invalid_prep');
  const note = bounded(m.note, 200);
  const prep = p.prep.map(i => i.key !== m.key ? i : m.verified ? { ...i, verifiedAt: now, verifiedBy: String(actor.actorAccountId), ...(note ? { note } : {}) }
    : { key: i.key, critical: i.critical, clientInput: i.clientInput, ...(note ? { note } : {}) });
  await ctx.db.patch(p._id, { prep, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, m.verified ? 'prep_verified' : 'prep_reopened', now, { detail: m.key });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** The crew records the shoot as done and the footage received; the production moves to editing. Never inferred from time. */
async function shootComplete(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (p.status !== 'shooting') return fail('invalid_status_transition');
  if (m.mediaReceived !== true) return fail('media_receipt_required');
  await ctx.db.patch(p._id, { shootCompletedAt: now, shootCompletedBy: String(actor.actorAccountId), status: 'editing', statusAt: now, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'shoot_completed', now, { from: 'shooting', to: 'editing', ...(bounded(m.note, 200) ? { detail: bounded(m.note, 200) } : {}) });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** A new cut goes to its named approver. It supersedes the open one and stops that cut's reminders. */
async function cutSubmit(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const replay = await byRequest(ctx, 'mediaCuts', tenant.accountId, a.requestId);
  if (replay) return ok(await card(ctx, tenant, actor, replay.productionId, now));
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (!['editing', 'review'].includes(p.status)) return fail('invalid_status_transition');
  const studio = await studioFor(ctx, tenant.accountId, [p]), facts = factsOf(studio, p, now);
  if (facts.changeOrders.some(c => c.status === 'proposed' && c.kind === 'extra_revision')) return fail('extra_scope_decision_pending');
  const assetRef = m.assetRef, approverName = bounded(m.approverName, 120);
  if (!validLink(assetRef) || !approverName) return fail('invalid_cut');
  const revision = (latestCut(facts.cuts)?.revision || 0) + 1, label = bounded(m.label, 40) || `v${revision}`;
  const decisionDueAt = m.decisionDueAt ?? now + mediaSettings(await settingsFor(ctx, tenant.accountId)).reviewResponseHours * HOUR;
  if (!Number.isSafeInteger(decisionDueAt) || decisionDueAt <= now) return fail('invalid_cut');
  for (const c of facts.cuts) if (c.status === 'in_review') {
    await ctx.db.patch(c._id, { status: 'superseded', version: c.version + 1, updatedAt: now });
    for (const t of await ctx.db.query('mediaTasks').withIndex('by_entity', q => q.eq('entityType', 'cut').eq('entityId', String(c._id))).take(50))
      if (t.status === 'open') await ctx.db.patch(t._id, { status: 'resolved', resolvedAt: now, resolution: 'superseded', updatedAt: now });
    for (const d of facts.cuts.length ? studio.drafts : []) if (d.status === 'draft' && d.ruleKey?.includes(`:${c._id}:`)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  }
  const id = await ctx.db.insert('mediaCuts', { accountId: tenant.accountId, requestId: a.requestId, productionId: p._id, revision, label, assetRef, status: 'in_review', submittedAt: now, decisionDueAt,
    approverName, recordedBy: String(actor.actorAccountId), countedRound: false, version: 1, createdAt: now, updatedAt: now });
  await ctx.db.patch(p._id, { status: 'review', statusAt: p.status === 'review' ? p.statusAt : now, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'cut_submitted', now, { from: p.status, to: 'review', cutId: id, detail: label });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** The named approver's decision on the exact current cut. A round beyond the allowance becomes one priced change order. */
async function cutDecide(ctx, tenant, actor, a, now) {
  const m = a.media || {}, cut = await owned(ctx, a.cutId, tenant.accountId, 'mediaCuts');
  const p = cut && await visibleProduction(ctx, tenant, actor, cut.productionId);
  if (!p) return fail('cut_not_found');
  // An obsolete cut is refused as superseded before any version check: its approval can never release newer work.
  const studio = await studioFor(ctx, tenant.accountId, [p]), current = latestCut(factsOf(studio, p, now).cuts);
  if (cut.status === 'superseded' || String(current._id) !== String(cut._id)) return fail('cut_superseded');
  if (cut.version !== a.version) return fail('cut_conflict');
  if (cut.status !== 'in_review') return fail('invalid_decision');
  if (p.status !== 'review') return fail('invalid_status_transition');
  if (!['approved', 'changes_requested'].includes(m.decision)) return fail('invalid_decision');
  const by = bounded(m.approverName, 120), feedback = bounded(m.feedback, 2000), evidence = bounded(m.evidenceSource, 40);
  if (!by || by.toLowerCase() !== cut.approverName.toLowerCase()) return fail('approver_mismatch');
  if (!evidence || (m.decision === 'changes_requested' && !feedback)) return fail('decision_evidence_required');
  await ctx.db.patch(cut._id, { status: m.decision, decision: m.decision, decisionAt: now, decidedBy: String(actor.actorAccountId), evidenceSource: evidence, ...(feedback ? { feedback } : {}),
    countedRound: m.decision === 'changes_requested', version: cut.version + 1, updatedAt: now });
  if (m.decision === 'approved') {
    await ctx.db.patch(p._id, { status: 'accepted', statusAt: now, finalCutId: cut._id, finalAcceptedAt: now, version: p.version + 1, updatedAt: now });
    await event(ctx, tenant, actor, p._id, 'cut_approved', now, { from: 'review', to: 'accepted', cutId: cut._id });
  } else {
    const rounds = p.roundsUsed + 1;
    await ctx.db.patch(p._id, { status: 'editing', statusAt: now, roundsUsed: rounds, version: p.version + 1, updatedAt: now });
    await event(ctx, tenant, actor, p._id, 'changes_requested', now, { from: 'review', to: 'editing', cutId: cut._id, detail: `round ${rounds}/${p.revisionAllowance}` });
    if (rounds > p.revisionAllowance) {
      const price = mediaSettings(await settingsFor(ctx, tenant.accountId)).extraRoundPriceMinor;
      await ctx.db.insert('mediaChangeOrders', { accountId: tenant.accountId, requestId: `extra-round:${cut._id}`, productionId: p._id, kind: 'extra_revision', cutId: cut._id,
        description: `Revision round ${rounds} beyond the ${p.revisionAllowance} included`, priceMinor: price, status: 'proposed', version: 1, createdAt: now, updatedAt: now });
      await event(ctx, tenant, actor, p._id, 'extra_scope', now, { cutId: cut._id, detail: String(price) });
    }
  }
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** Proposes extra scope: a new deliverable or other priced work. Included revisions never come through here. */
async function changeOrderSave(ctx, tenant, actor, a, now) {
  if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
  const replay = await byRequest(ctx, 'mediaChangeOrders', tenant.accountId, a.requestId);
  if (replay) return ok(await card(ctx, tenant, actor, replay.productionId, now));
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (CLOSED.has(p.status) || p.acceptedQuoteVersion === undefined) return fail('acceptance_required');
  const description = bounded(m.description, 500), kind = m.kind;
  if (!['new_deliverable', 'other'].includes(kind) || !description || !isMinor(m.priceMinor)) return fail('invalid_change_order');
  const deliverable = kind === 'new_deliverable' ? cleanDeliverables([m.deliverable], bounded)?.[0] : undefined;
  if (kind === 'new_deliverable' && !deliverable) return fail('invalid_change_order');
  await ctx.db.insert('mediaChangeOrders', { accountId: tenant.accountId, requestId: a.requestId, productionId: p._id, kind, description, priceMinor: m.priceMinor, ...(deliverable ? { deliverable } : {}),
    status: 'proposed', version: 1, createdAt: now, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'extra_scope', now, { detail: description.slice(0, 120) });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** The manager's decision on extra scope: approved (customer agreed; its own order), waived, or declined (the request is withdrawn). */
async function changeOrderDecide(ctx, tenant, actor, a, now) {
  const m = a.media || {}, change = await owned(ctx, a.changeOrderId, tenant.accountId, 'mediaChangeOrders');
  const p = change && await owned(ctx, change.productionId, tenant.accountId, 'mediaProductions');
  if (!p) return fail('change_order_not_found');
  if (change.version !== a.version) return fail('change_order_conflict');
  if (change.status !== 'proposed') return fail('invalid_change_order_transition');
  const decision = m.decision, approval = bounded(m.customerApproval, 120);
  if (!['approved', 'waived', 'declined'].includes(decision)) return fail('invalid_decision');
  if (decision === 'approved' && !approval) return fail('customer_approval_required');
  let orderId;
  if (decision === 'approved' && change.priceMinor > 0) {
    const order = await createOrder(ctx, tenant, { requestId: `media-change:${change._id}`, channel: 'walk_in', contactId: p.contactId, kind: 'media_change', source: 'media',
      fulfilment: { type: 'in_store' }, lines: [{ name: `${p.ref} extra: ${change.description}`.slice(0, 120), qty: 1, unitPriceMinor: change.priceMinor }] }, now, { internal: true });
    if (!order.ok) return order;
    orderId = order.value.id;
  }
  await ctx.db.patch(change._id, { status: decision, decidedBy: String(actor.actorAccountId), decidedAt: now, ...(approval ? { customerApproval: approval } : {}), ...(orderId ? { orderId } : {}), version: change.version + 1, updatedAt: now });
  if (decision !== 'declined' && change.deliverable) await ctx.db.patch(p._id, { deliverables: [...p.deliverables, { ...change.deliverable, changeOrderId: String(change._id) }], version: p.version + 1, updatedAt: now });
  if (decision === 'declined' && change.kind === 'extra_revision' && change.cutId) {
    // The extra round is withdrawn: it no longer counts, and the cut goes back to the client for a decision.
    const cut = await ctx.db.get(change.cutId), studio = await studioFor(ctx, tenant.accountId, [p]), current = latestCut(factsOf(studio, p, now).cuts);
    if (p.status === 'editing' && cut && String(current?._id) === String(cut._id)) {
      const due = now + mediaSettings(await settingsFor(ctx, tenant.accountId)).reviewResponseHours * HOUR;
      await ctx.db.patch(cut._id, { status: 'in_review', decisionDueAt: due, countedRound: false, version: cut.version + 1, updatedAt: now });
      await ctx.db.patch(p._id, { status: 'review', statusAt: now, roundsUsed: Math.max(0, p.roundsUsed - 1), version: p.version + 1, updatedAt: now });
    }
  }
  await event(ctx, tenant, actor, p._id, `change_${decision}`, now, { detail: change.description.slice(0, 120) });
  await audit(ctx, tenant, actor, 'change_order_decided', 'production', p._id, now, decision);
  return ok(await card(ctx, tenant, actor, p._id, now));
}

/** Final handoff: the accepted cut, cleared rights where usage is set, and an authorised https link. */
async function handoff(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (p.status !== 'accepted') return fail('acceptance_required');
  if (needsClearance(p) && p.usageRights.clearance !== 'cleared') return fail('rights_not_cleared');
  if (!validLink(m.link)) return fail('handoff_link_required');
  await ctx.db.patch(p._id, { handoff: { link: m.link, at: now, by: String(actor.actorAccountId) }, deliveredAt: now, status: 'delivered', statusAt: now, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, 'delivered', now, { from: 'accepted', to: 'delivered' });
  return ok(await card(ctx, tenant, actor, p._id, now));
}

async function costsFinal(ctx, tenant, actor, a, now) {
  const m = a.media || {}, p = await owned(ctx, a.productionId, tenant.accountId, 'mediaProductions');
  if (!p) return fail('production_not_found');
  if (p.version !== a.version) return fail('production_conflict');
  if (typeof m.final !== 'boolean') return fail('invalid_production');
  await ctx.db.patch(p._id, { costsFinal: m.final, version: p.version + 1, updatedAt: now });
  await event(ctx, tenant, actor, p._id, m.final ? 'costs_final' : 'costs_reopened', now);
  return ok(await card(ctx, tenant, actor, p._id, now));
}

async function draftSave(ctx, tenant, actor, a, now) {
  const m = a.media || {};
  let row = null;
  if (a.draftId) {
    row = await owned(ctx, a.draftId, tenant.accountId, 'mediaDrafts');
    if (!row || !await visibleProduction(ctx, tenant, actor, row.productionId)) return fail('draft_not_found');
    if (row.version !== a.version) return fail('draft_conflict');
    if (row.status !== 'draft') return fail('invalid_draft_transition');
  } else {
    if (!REQUEST_ID.test(a.requestId || '')) return fail('invalid_request');
    const replay = await byRequest(ctx, 'mediaDrafts', tenant.accountId, a.requestId);
    if (replay) return ok(publicRow(replay));
  }
  const p = await visibleProduction(ctx, tenant, actor, row?.productionId || a.productionId);
  if (!p) return fail('production_not_found');
  const text = bounded(m.text ?? row?.text, 4000), templateId = bounded(m.templateId ?? row?.templateId, 80);
  if (!text) return fail('invalid_draft');
  const data = { productionId: p._id, ...(p.conversationId ? { conversationId: p.conversationId } : {}), kind: row?.kind || 'follow_up', text, ...(templateId ? { templateId } : {}), status: 'draft', version: (row?.version || 0) + 1, updatedAt: now };
  let id; if (row) { await ctx.db.patch(row._id, data); id = row._id; } else id = await ctx.db.insert('mediaDrafts', { ...data, accountId: tenant.accountId, requestId: a.requestId, createdAt: now });
  await audit(ctx, tenant, actor, row ? 'draft_updated' : 'draft_created', 'draft', id, now);
  return ok(publicRow(await ctx.db.get(id)));
}

async function draftApprove(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.draftId, tenant.accountId, 'mediaDrafts');
  if (!row) return fail('draft_not_found');
  if (row.status !== 'draft' || row.version !== a.version) return fail(row.version !== a.version ? 'draft_conflict' : 'invalid_draft_transition');
  const p = await owned(ctx, row.productionId, tenant.accountId, 'mediaProductions');
  const status = await sendApprovedDraft(ctx, tenant, { draft: row, keyPrefix: 'media-draft', handoffReason: 'production_follow_up', taskTable: 'mediaTasks',
    messageLinks: { mediaProductionId: row.productionId, mediaDraftId: row._id }, recipientLinks: { mediaDraftId: row._id }, contactId: p?.contactId || null }, now);
  await ctx.db.patch(row._id, { status, approvedBy: actor.actorAccountId, approvedAt: now, version: row.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'draft_approved', 'draft', row._id, now, status);
  return ok(publicRow(await ctx.db.get(row._id)));
}

/** The production's full record: cuts, holds, change orders, costs (managers), drafts and history. */
async function record(ctx, tenant, actor, a, now) {
  const p = await visibleProduction(ctx, tenant, actor, a.productionId);
  if (!p) return fail('production_not_found');
  const studio = await studioFor(ctx, tenant.accountId, [p]), facts = factsOf(studio, p, now);
  const resources = new Map((await ctx.db.query('mediaResources').withIndex('by_account', q => q.eq('accountId', tenant.accountId)).take(500)).map(r => [String(r._id), r]));
  const events = (await ctx.db.query('mediaEvents').withIndex('by_production', q => q.eq('productionId', p._id)).take(300)).sort((x, y) => y.at - x.at);
  return ok({ ...(await describe(ctx, tenant.accountId, actor, studio, [p], now))[0],
    cuts: facts.cuts.sort((x, y) => y.revision - x.revision).map(publicRow),
    changeOrders: facts.changeOrders.sort((x, y) => y.createdAt - x.createdAt).map(c => { const { priceMinor, ...rest } = publicRow(c); return actor.role === 'manager' ? { ...rest, priceMinor } : rest; }),
    reservations: facts.reservations.sort((x, y) => x.startsAt - y.startsAt).map(r => ({ ...publicRow(r), resourceName: resources.get(String(r.resourceId))?.name || null, resourceCategory: resources.get(String(r.resourceId))?.category || null })),
    ...(actor.role === 'manager' ? { costs: facts.costs.sort((x, y) => y.incurredAt - x.incurredAt).map(publicRow), ...(p.quoteMinor ? { quoteMinor: p.quoteMinor, depositMinor: p.depositMinor } : {}) } : {}),
    drafts: studio.drafts.sort((x, y) => y.createdAt - x.createdAt).map(publicRow), events: events.map(publicRow) });
}

async function list(ctx, tenant, actor, a, now) {
  const { studio } = await refreshStudio(ctx, tenant.accountId, now);
  const rows = studio.productions.filter(p => canSeeProduction(actor, p) && (!a.status || p.status === a.status) && (!a.contactId || String(p.contactId) === String(a.contactId)));
  return ok({ items: await describe(ctx, tenant.accountId, actor, studio, rows.slice(0, 1000), now), complete: studio.complete && rows.length <= 1000 });
}

export async function executeMedia(ctx, tenant, actor, a, now) {
  if (!a.operation?.startsWith('media_')) return null;
  if (MANAGER_ONLY.has(a.operation) && actor.role !== 'manager') return fail('manager_required');
  switch (a.operation) {
    case 'media_overview': {
      const result = await mediaOverview(ctx, tenant, actor, now);
      const queue = await mediaFollowupQueue(ctx, tenant, actor, {}, now);
      return ok({ ...result.value, followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
    }
    case 'media_productions': return list(ctx, tenant, actor, a, now);
    case 'media_production': await refreshStudio(ctx, tenant.accountId, now); return record(ctx, tenant, actor, a, now);
    case 'media_production_save': return productionSave(ctx, tenant, actor, a, now);
    case 'media_production_status': return statusMove(ctx, tenant, actor, a, now);
    case 'media_quote': return quote(ctx, tenant, actor, a, now);
    case 'media_accept': return accept(ctx, tenant, actor, a, now);
    case 'media_payment_record': return payment(ctx, tenant, actor, a, now);
    case 'media_prep_verify': return prepVerify(ctx, tenant, actor, a, now);
    case 'media_shoot_complete': return shootComplete(ctx, tenant, actor, a, now);
    case 'media_cut_submit': return cutSubmit(ctx, tenant, actor, a, now);
    case 'media_cut_decide': return cutDecide(ctx, tenant, actor, a, now);
    case 'media_change_order_save': return changeOrderSave(ctx, tenant, actor, a, now);
    case 'media_change_order_decide': return changeOrderDecide(ctx, tenant, actor, a, now);
    case 'media_handoff': return handoff(ctx, tenant, actor, a, now);
    case 'media_costs_final': return costsFinal(ctx, tenant, actor, a, now);
    case 'media_resources': return resourceList(ctx, tenant, actor, now);
    case 'media_resource_save': return resourceSave(ctx, tenant, actor, a, now);
    case 'media_reservation_save': return reservationSave(ctx, tenant, actor, a, now);
    case 'media_reservation_status': return reservationStatus(ctx, tenant, actor, a, now);
    case 'media_calendar': await refreshStudio(ctx, tenant.accountId, now); return calendar(ctx, tenant, actor, a, now);
    case 'media_cost_save': return costSave(ctx, tenant, actor, a, now);
    case 'media_cost_void': return costVoid(ctx, tenant, actor, a, now);
    case 'media_followups': await refreshStudio(ctx, tenant.accountId, now); return mediaFollowupQueue(ctx, tenant, actor, a, now);
    case 'media_task_resolve': return resolveMediaTask(ctx, tenant, actor, a, now);
    case 'media_task_snooze': return snoozeMediaTask(ctx, tenant, actor, a, now);
    case 'media_draft_save': return draftSave(ctx, tenant, actor, a, now);
    case 'media_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'media_context': await refreshStudio(ctx, tenant.accountId, now); return mediaContext(ctx, tenant, actor, a, now);
    case 'media_insights': return mediaInsights(ctx, tenant, a, now);
    case 'media_metric_records': return mediaMetricRecords(ctx, tenant, actor, a, now);
    default: return null;
  }
}

export { loadStudio };
