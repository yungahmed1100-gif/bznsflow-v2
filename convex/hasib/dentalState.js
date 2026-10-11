// Dental clinics (ascend/dental.md). Staff record facts: a booking, a confirmation, an arrival,
// completion or a missed visit, charges, a payment and a clinician-set recall date. Hasib does the
// rest when the workspace is read: tasks open and close themselves, rule drafts are written and
// withdrawn, and Insights recalculates. Charges and payments stay on hasibOrders. Nothing here
// sends a message, and nothing clinical is stored.
import { owned } from '../blueTenant.js';
import { ok, fail, bounded, REQUEST_ID, byRequest, settingsFor } from './shared.js';
import { createOrder, recordPayment, PAYMENT_METHODS } from './ordersState.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { publicRow } from './workspace/rows.js';
import { sendApprovedDraft } from './workspace/drafts.js';
import { findOverlaps } from './workspace/overlap.js';
import { conversationOf } from './fitnessGym.js';
import { formatLocal } from '../../src/lib/timezone.js';
import { dentalSettings } from './dentalSettings.js';
import { refreshClinic, describeVisits, dueTaskKeys, dentalOverview } from './dentalClinic.js';
import { dentalFollowupQueue, resolveDentalTask, snoozeDentalTask, dentalContext } from './dentalFollowups.js';
import { dentalInsights, dentalMetricRecords } from './dentalInsights.js';
import { DAY, MIN, VISIT_MAX_MS, RESOURCE_KINDS, HOLDS_SLOT, CANCEL_REASONS, CLOSED_ORDERS, transitionRefusal, isLateCancel, balanceOf } from './dentalDomain.js';

const MANAGER_ONLY = new Set(['dental_resource_save', 'dental_charge', 'dental_charge_dispute', 'dental_draft_approve', 'dental_insights', 'dental_metric_records']);
const STAMP = { confirmed: 'confirmedAt', arrived: 'arrivedAt', completed: 'completedAt', missed: 'missedAt', cancelled: 'cancelledAt' };
const MAX_HISTORY = 50, MAX_RECALL_MS = 3 * 365 * DAY, SOURCES = ['layla', 'phone', 'walk_in', 'staff', 'referral'];
const time = v => Number.isSafeInteger(v) && v > 0 ? v : null;
const historyWith = (v, entry) => [...(v.history || []), entry].slice(-MAX_HISTORY);

async function replayOr(ctx, table, tenant, a) {
  if (!REQUEST_ID.test(a.requestId || '')) return { error: 'invalid_request' };
  const row = await byRequest(ctx, table, tenant.accountId, a.requestId);
  return { replay: row ? ok(publicRow(row)) : null };
}

/** Providers and chairs: names only. A resource with visits still to come cannot be switched off. */
async function resourceSave(ctx, tenant, actor, a, now) {
  const d = a.dental || {}, accountId = tenant.accountId;
  let row = null;
  if (d.resourceId) {
    row = await owned(ctx, d.resourceId, accountId, 'dentalResources');
    if (!row) return fail('resource_not_found');
    if (row.version !== a.version) return fail('resource_conflict');
  } else {
    const r = await replayOr(ctx, 'dentalResources', tenant, a);
    if (r.error) return fail(r.error);
    if (r.replay) return r.replay;
  }
  const name = bounded(d.name ?? row?.name, 80), kind = row?.kind || d.kind, active = d.active ?? row?.active ?? true;
  if (!name || !RESOURCE_KINDS.includes(kind) || typeof active !== 'boolean') return fail('invalid_resource');
  if (row && row.active && !active) {
    const upcoming = await ctx.db.query('dentalVisits').withIndex('by_account_start', q => q.eq('accountId', accountId).gte('startsAt', now - VISIT_MAX_MS)).take(2000);
    if (upcoming.some(v => HOLDS_SLOT.has(v.status) && v.endsAt > now && (String(v.providerId) === String(row._id) || String(v.chairId) === String(row._id)))) return fail('resource_has_visits');
  }
  const data = { name, kind, active, version: (row?.version || 0) + 1, updatedAt: now };
  let id;
  if (row) { await ctx.db.patch(row._id, data); id = row._id; }
  else id = await ctx.db.insert('dentalResources', { accountId, requestId: a.requestId, ...data, createdAt: now });
  await audit(ctx, tenant, actor, row ? 'resource_updated' : 'resource_created', 'resource', id, now, kind);
  return ok(publicRow(await ctx.db.get(id)));
}

async function resources(ctx, tenant) {
  const rows = await ctx.db.query('dentalResources').withIndex('by_account', q => q.eq('accountId', tenant.accountId)).take(500);
  return ok({ items: rows.sort((x, y) => x.kind.localeCompare(y.kind) || Number(y.active) - Number(x.active) || x.name.localeCompare(y.name)).map(publicRow) });
}

/** The provider, chair and patient must each be free for [startsAt, endsAt). Read inside the mutation, so racing bookings retry. */
async function slotRefusal(ctx, accountId, { contactId, providerId, chairId, startsAt, endsAt }, excludeId) {
  const overlapping = await findOverlaps(ctx, { table: 'dentalVisits', index: 'by_account_start', eq: [['accountId', accountId]], startsAt, endsAt, maxSpanMs: VISIT_MAX_MS, statuses: HOLDS_SLOT, excludeId });
  if (overlapping.some(v => String(v.contactId) === String(contactId))) return 'patient_booking_conflict';
  if (overlapping.some(v => String(v.providerId) === String(providerId))) return 'provider_busy';
  if (chairId && overlapping.some(v => String(v.chairId) === String(chairId))) return 'chair_busy';
  return null;
}

async function activeResource(ctx, accountId, id, kind) {
  const row = id ? await owned(ctx, id, accountId, 'dentalResources') : null;
  return row && row.kind === kind && row.active ? row : null;
}

/** The treatment a visit is for: an approved service from Layla's catalog (name and category only). */
async function serviceOf(ctx, accountId, id) {
  if (!id) return {};
  const item = await owned(ctx, id, accountId, 'hasibItems');
  if (!item || item.kind !== 'service' || item.archived) return { error: 'service_not_found' };
  return { value: { serviceItemId: item._id, serviceName: item.nameEn || item.nameAr, ...(item.category ? { serviceCategory: item.category } : {}) } };
}

/** Add visit (or book a Layla request). A minor needs a guardian contact first; the request stays open until then. */
async function visitBook(ctx, tenant, actor, a, now) {
  const r = await replayOr(ctx, 'dentalVisits', tenant, a);
  if (r.error) return fail(r.error);
  if (r.replay) return r.replay;
  const d = a.dental || {}, accountId = tenant.accountId, s = dentalSettings(await settingsFor(ctx, accountId));
  const contact = await owned(ctx, a.contactId, accountId, 'blueContacts');
  if (!contact || contact.state !== 'active') return fail('contact_not_found');
  if (d.forMinor === true) {
    const guardian = d.guardianContactId ? await owned(ctx, d.guardianContactId, accountId, 'blueContacts') : null;
    if (!guardian || guardian.state !== 'active' || String(guardian._id) === String(contact._id)) return fail('guardian_required');
  }
  const provider = await activeResource(ctx, accountId, d.providerId, 'provider');
  if (!provider) return fail('provider_required');
  const chair = d.chairId ? await activeResource(ctx, accountId, d.chairId, 'chair') : null;
  if (d.chairId && !chair) return fail('chair_not_found');
  const service = await serviceOf(ctx, accountId, d.serviceItemId);
  if (service.error) return fail(service.error);
  const startsAt = time(d.startsAt), minutes = d.durationMinutes ?? s.visitMinutes;
  if (!startsAt || startsAt < now - 12 * 60 * MIN || startsAt > now + 365 * DAY || !Number.isSafeInteger(minutes) || minutes < 5 || minutes * MIN > VISIT_MAX_MS) return fail('invalid_visit');
  const source = d.source === undefined ? 'staff' : d.source;
  if (!SOURCES.includes(source)) return fail('invalid_visit');
  let replacementForId;
  if (d.replacementForId) {
    const original = await owned(ctx, d.replacementForId, accountId, 'dentalVisits');
    if (!original || String(original.contactId) !== String(contact._id) || !['missed', 'cancelled'].includes(original.status)) return fail('invalid_replacement');
    replacementForId = original._id;
  }
  // Convex stores no undefined values: an optional field is either set or left out.
  const slot = { contactId: contact._id, providerId: provider._id, ...(chair ? { chairId: chair._id } : {}), startsAt, endsAt: startsAt + minutes * MIN };
  const refusal = await slotRefusal(ctx, accountId, slot);
  if (refusal) return fail(refusal);
  const id = await ctx.db.insert('dentalVisits', { accountId, requestId: a.requestId, ...slot, ...service.value,
    ...(d.forMinor === true ? { forMinor: true, guardianContactId: d.guardianContactId } : {}), status: 'booked', source, ...(replacementForId ? { replacementForId } : {}),
    history: [{ kind: 'booked', at: now, by: String(actor.actorAccountId) }], version: 1, createdAt: now, updatedAt: now });
  await audit(ctx, tenant, actor, 'visit_booked', 'visit', id, now, source);
  return ok(publicRow(await ctx.db.get(id)));
}

/** Moves a booked or confirmed visit to a new time (same record). It needs confirming again, so the old reminder gives way to a new one. */
async function visitReschedule(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v) return fail('visit_not_found');
  if (v.version !== a.version) return fail('visit_conflict');
  if (!['booked', 'confirmed'].includes(v.status)) return fail('visit_locked');
  const d = a.dental || {}, startsAt = time(d.startsAt), minutes = d.durationMinutes ?? Math.round((v.endsAt - v.startsAt) / MIN);
  if (!startsAt || startsAt < now || startsAt > now + 365 * DAY || !Number.isSafeInteger(minutes) || minutes < 5 || minutes * MIN > VISIT_MAX_MS) return fail('invalid_visit');
  const provider = d.providerId ? await activeResource(ctx, tenant.accountId, d.providerId, 'provider') : await ctx.db.get(v.providerId);
  if (!provider) return fail('provider_required');
  const chair = d.chairId === '' ? null : d.chairId ? await activeResource(ctx, tenant.accountId, d.chairId, 'chair') : v.chairId ? await ctx.db.get(v.chairId) : null;
  if (d.chairId && !chair) return fail('chair_not_found');
  const slot = { contactId: v.contactId, providerId: provider._id, ...(chair ? { chairId: chair._id } : {}), startsAt, endsAt: startsAt + minutes * MIN };
  const refusal = await slotRefusal(ctx, tenant.accountId, slot, v._id);
  if (refusal) return fail(refusal);
  const { _id, _creationTime, _seq, table, confirmedAt, chairId, ...rest } = v;
  await ctx.db.replace(v._id, { ...rest, ...slot, status: 'booked', rescheduleCount: (v.rescheduleCount || 0) + 1,
    history: historyWith(v, { kind: 'rescheduled', at: now, by: String(actor.actorAccountId), detail: String(v.startsAt) }), version: v.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'visit_rescheduled', 'visit', v._id, now);
  return ok(publicRow(await ctx.db.get(v._id)));
}

/** Confirmed, arrived, completed, missed or cancelled: a recorded fact with its time. Cancelling needs a reason and fixes whether it was late. */
async function visitStatus(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v) return fail('visit_not_found');
  if (v.version !== a.version) return fail('visit_conflict');
  const to = a.status, refusal = transitionRefusal(v, to, now);
  if (refusal) return fail(refusal);
  const patch = { status: to, [STAMP[to]]: now };
  if (to === 'cancelled') {
    if (!CANCEL_REASONS.includes(a.reason)) return fail('cancellation_reason_required');
    const s = dentalSettings(await settingsFor(ctx, tenant.accountId));
    Object.assign(patch, { cancelReason: a.reason, lateCancel: isLateCancel(v, now, s.lateCancelHours) });
  }
  // A visit marked missed in error: the patient did come. The correction is kept in the history.
  const corrected = v.status === 'missed' && to === 'arrived';
  await ctx.db.patch(v._id, { ...patch, ...(corrected ? { missedAt: undefined } : {}), history: historyWith(v, { kind: corrected ? 'attendance_corrected' : to, at: now, by: String(actor.actorAccountId), ...(to === 'cancelled' ? { detail: a.reason } : {}) }),
    version: v.version + 1, updatedAt: now });
  if (to === 'cancelled') for (const d of await ctx.db.query('dentalDrafts').withIndex('by_contact', q => q.eq('contactId', v.forMinor && v.guardianContactId ? v.guardianContactId : v.contactId)).take(100))
    if (d.status === 'draft' && String(d.visitId) === String(v._id)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, corrected ? 'attendance_corrected' : `visit_${to}`, 'visit', v._id, now, to === 'cancelled' ? a.reason : undefined);
  return ok(publicRow(await ctx.db.get(v._id)));
}

/** Records a completed visit's charges as its order (treatments at their catalogue price), due after the clinic's balance terms. */
async function charge(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v) return fail('visit_not_found');
  const existing = v.orderId ? await ctx.db.get(v.orderId) : null;
  if (existing && existing.requestId === `dental-visit:${v._id}:${a.requestId}`) return ok(publicRow(v));
  if (v.version !== a.version) return fail('visit_conflict');
  if (!['arrived', 'completed'].includes(v.status)) return fail('visit_not_attended');
  if (existing && !CLOSED_ORDERS.has(existing.status)) return fail('charges_recorded');
  if (!REQUEST_ID.test(a.requestId || '') || !Array.isArray(a.lines) || !a.lines.length || a.lines.length > 20) return fail('invalid_charge');
  const s = dentalSettings(await settingsFor(ctx, tenant.accountId)), tz = await businessTimezone(ctx, tenant.accountId);
  const order = await createOrder(ctx, tenant, { requestId: `dental-visit:${v._id}:${a.requestId}`, channel: 'walk_in', contactId: v.contactId, kind: 'dental_visit', source: 'dental',
    confirm: true, fulfilment: { type: 'in_store' }, lines: a.lines, customFields: [{ key: 'visit_date', value: formatLocal(v.startsAt, tz).slice(0, 10) }] }, now, { internal: true });
  if (!order.ok) return order;
  await ctx.db.patch(v._id, { orderId: order.value.id, chargeDueAt: Math.max(now, v.startsAt) + s.balanceDueDays * DAY, disputed: false,
    history: historyWith(v, { kind: 'charges_recorded', at: now, by: String(actor.actorAccountId) }), version: v.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'visit_charged', 'visit', v._id, now, String(order.value.totalMinor));
  return ok(publicRow(await ctx.db.get(v._id)));
}

/** A disputed balance pauses its reminder; clearing the dispute resumes it. */
async function chargeDispute(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v || !v.orderId) return fail('visit_not_found');
  if (v.version !== a.version) return fail('visit_conflict');
  const disputed = a.dental?.disputed;
  if (typeof disputed !== 'boolean') return fail('invalid_charge');
  // Only the fact is kept; a dispute's reason is the patient's own words and stays out of the record.
  await ctx.db.patch(v._id, { disputed, history: historyWith(v, { kind: disputed ? 'balance_disputed' : 'dispute_cleared', at: now, by: String(actor.actorAccountId) }),
    version: v.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, disputed ? 'balance_disputed' : 'dispute_cleared', 'visit', v._id, now);
  return ok(publicRow(await ctx.db.get(v._id)));
}

/** A payment on the visit's order (the existing payment path, so a replay changes nothing). */
async function payment(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v || !v.orderId) return fail('visit_not_found');
  if (!PAYMENT_METHODS.includes(a.method)) return fail('invalid_payment');
  const paid = await recordPayment(ctx, tenant.accountId, { requestId: a.requestId, orderId: v.orderId, amountMinor: a.amountMinor, method: a.method, reference: bounded(a.reference, 80) || 'visit' }, now);
  if (!paid.ok) return paid;
  await audit(ctx, tenant, actor, a.amountMinor < 0 ? 'payment_refunded' : 'payment_recorded', 'visit', v._id, now, String(a.amountMinor));
  return ok(publicRow(await ctx.db.get(v._id)));
}

/** The clinician's recall date, recorded by staff with who and when. Changing or clearing it withdraws the old reminders. */
async function recallSet(ctx, tenant, actor, a, now) {
  const v = await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v) return fail('visit_not_found');
  if (v.version !== a.version) return fail('visit_conflict');
  if (v.status !== 'completed') return fail('visit_not_completed');
  const d = a.dental || {}, clear = d.clearRecall === true, dueAt = clear ? null : time(d.recallDueAt);
  if (!clear && (!dueAt || dueAt <= now || dueAt > now + MAX_RECALL_MS)) return fail('invalid_recall');
  const { _id, _creationTime, _seq, table, recallDueAt, ...rest } = v;
  await ctx.db.replace(v._id, { ...rest, ...(dueAt ? { recallDueAt: dueAt } : {}), recallSetBy: String(actor.actorAccountId), recallSetAt: now, recallVersion: (v.recallVersion || 0) + 1,
    history: historyWith(v, { kind: clear ? 'recall_cleared' : 'recall_set', at: now, by: String(actor.actorAccountId), ...(dueAt ? { detail: String(dueAt) } : {}) }), version: v.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, clear ? 'recall_cleared' : 'recall_set', 'visit', v._id, now);
  return ok(publicRow(await ctx.db.get(v._id)));
}

async function draftApprove(ctx, tenant, actor, a, now) {
  const row = await owned(ctx, a.draftId, tenant.accountId, 'dentalDrafts');
  if (!row) return fail('draft_not_found');
  if (row.status !== 'draft' || row.version !== a.version) return fail(row.version !== a.version ? 'draft_conflict' : 'invalid_draft_transition');
  const text = a.dental?.text !== undefined ? bounded(a.dental.text, 4000) : row.text;
  if (!text) return fail('invalid_draft');
  const draft = { ...row, text, ...(a.dental?.templateId ? { templateId: bounded(a.dental.templateId, 80) } : {}) };
  const status = await sendApprovedDraft(ctx, tenant, { draft, keyPrefix: 'dental-draft', handoffReason: 'visit_follow_up', taskTable: 'dentalTasks',
    messageLinks: { dentalDraftId: row._id }, recipientLinks: { dentalDraftId: row._id }, contactId: row.contactId }, now);
  await ctx.db.patch(row._id, { text, ...(draft.templateId ? { templateId: draft.templateId } : {}), status, approvedBy: actor.actorAccountId, approvedAt: now, version: row.version + 1, updatedAt: now });
  await audit(ctx, tenant, actor, 'draft_approved', 'draft', row._id, now, status);
  return ok(publicRow(await ctx.db.get(row._id)));
}

export const VISIT_FILTERS = ['today', 'unconfirmed', 'missed', 'followupDue'];

/** Visits in a range (the day schedule) or by quick filter, newest problems first. */
async function visits(ctx, tenant, actor, a, now) {
  const { clinic, timezone } = await refreshClinic(ctx, tenant.accountId, now);
  const fromAt = a.fromAt !== undefined ? time(a.fromAt) : null, toAt = a.toAt !== undefined ? time(a.toAt) : null;
  if ((a.fromAt !== undefined && !fromAt) || (a.toAt !== undefined && !toAt) || (fromAt && toAt && (toAt <= fromAt || toAt - fromAt > 62 * DAY))) return fail('invalid_range');
  const filter = VISIT_FILTERS.includes(a.filter) ? a.filter : null;
  let rows = clinic.visits.filter(v => (!fromAt || v.startsAt >= fromAt) && (!toAt || v.startsAt < toAt) && (!a.contactId || String(v.contactId) === String(a.contactId))
    && (!a.dental?.providerId || String(v.providerId) === String(a.dental.providerId)));
  if (!a.status) rows = rows.filter(v => v.status !== 'cancelled' || fromAt);
  else rows = rows.filter(v => v.status === a.status);
  const cards = await describeVisits(ctx, tenant.accountId, actor, clinic, rows, now, { tz: timezone, dueTasks: await dueTaskKeys(ctx, tenant.accountId, actor, now) });
  const chosen = filter ? cards.filter(c => c.flags[filter]) : cards;
  const sorted = fromAt ? chosen.sort((x, y) => x.startsAt - y.startsAt) : chosen.sort((x, y) => y.startsAt - x.startsAt);
  return ok({ items: sorted.slice(0, 500), complete: clinic.complete && sorted.length <= 500, ...(fromAt ? { fromAt, toAt } : {}) });
}

/** One visit's record: the visit, the patient's other visits, charges and payments (managers), drafts and activity. */
async function visit(ctx, tenant, actor, a, now) {
  const { clinic, timezone } = await refreshClinic(ctx, tenant.accountId, now);
  const v = clinic.visits.find(x => String(x._id) === String(a.visitId)) || await owned(ctx, a.visitId, tenant.accountId, 'dentalVisits');
  if (!v) return fail('visit_not_found');
  const dueTasks = await dueTaskKeys(ctx, tenant.accountId, actor, now);
  const [card] = await describeVisits(ctx, tenant.accountId, actor, clinic, [v], now, { tz: timezone, dueTasks });
  const others = (clinic.visitsOf.get(String(v.contactId)) || []).filter(x => String(x._id) !== String(v._id)).sort((x, y) => y.startsAt - x.startsAt).slice(0, 20);
  const history = await describeVisits(ctx, tenant.accountId, actor, clinic, others, now, { tz: timezone, dueTasks });
  let charges = null;
  if (actor.role === 'manager' && v.orderId) {
    const order = clinic.orders.get(String(v.orderId)) || await ctx.db.get(v.orderId);
    const payments = (await ctx.db.query('hasibPayments').withIndex('by_order_at', q => q.eq('orderId', v.orderId)).take(50)).map(p => ({ id: p._id, amountMinor: p.amountMinor, method: p.method, at: p.at }));
    const lines = [];
    for (const l of order?.lines || []) {
      const item = l.itemId ? await ctx.db.get(l.itemId) : null;
      lines.push({ name: l.name || '', nameEn: item?.nameEn || null, nameAr: item?.nameAr || null, qty: l.qty, unitPriceMinor: l.unitPriceMinor, totalMinor: l.netMinor ?? (l.unitPriceMinor * l.qty) });
    }
    charges = { orderId: v.orderId, status: order?.status || null, lines,
      totalMinor: order?.totalMinor || 0, paidMinor: order?.paidMinor || 0, balanceMinor: balanceOf(order), payments };
  }
  const recipient = v.forMinor && v.guardianContactId ? v.guardianContactId : v.contactId;
  const { conversation } = await conversationOf(ctx, tenant.accountId, recipient);
  const drafts = actor.role === 'manager' ? clinic.drafts.filter(d => String(d.visitId) === String(v._id)).map(publicRow) : [];
  return ok({ ...card, conversationId: conversation?._id || null, history, charges, drafts,
    activity: [...(v.history || [])].sort((x, y) => y.at - x.at).map(h => ({ at: h.at, kind: h.kind, detail: h.detail || null })) });
}

export async function executeDental(ctx, tenant, actor, a, now) {
  if (!a.operation?.startsWith('dental_')) return null;
  if (MANAGER_ONLY.has(a.operation) && actor.role !== 'manager') return fail('manager_required');
  switch (a.operation) {
    case 'dental_overview': {
      const result = await dentalOverview(ctx, tenant, actor, now);
      const queue = await dentalFollowupQueue(ctx, tenant, actor, {}, now);
      return ok({ ...result.value, followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
    }
    case 'dental_visits': return visits(ctx, tenant, actor, a, now);
    case 'dental_visit': return visit(ctx, tenant, actor, a, now);
    case 'dental_resources': return resources(ctx, tenant);
    case 'dental_resource_save': return resourceSave(ctx, tenant, actor, a, now);
    case 'dental_visit_book': return visitBook(ctx, tenant, actor, a, now);
    case 'dental_visit_reschedule': return visitReschedule(ctx, tenant, actor, a, now);
    case 'dental_visit_status': return visitStatus(ctx, tenant, actor, a, now);
    case 'dental_charge': return charge(ctx, tenant, actor, a, now);
    case 'dental_charge_dispute': return chargeDispute(ctx, tenant, actor, a, now);
    case 'dental_payment_record': return actor.role === 'manager' ? payment(ctx, tenant, actor, a, now) : fail('manager_required');
    case 'dental_recall_set': return recallSet(ctx, tenant, actor, a, now);
    case 'dental_followups': await refreshClinic(ctx, tenant.accountId, now); return dentalFollowupQueue(ctx, tenant, actor, a, now);
    case 'dental_task_resolve': return resolveDentalTask(ctx, tenant, actor, a, now);
    case 'dental_task_snooze': return snoozeDentalTask(ctx, tenant, actor, a, now);
    case 'dental_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'dental_context': await refreshClinic(ctx, tenant.accountId, now); return dentalContext(ctx, tenant, actor, a, now);
    case 'dental_insights': return dentalInsights(ctx, tenant, a, now);
    case 'dental_metric_records': return dentalMetricRecords(ctx, tenant, actor, a, now);
    default: return null;
  }
}
