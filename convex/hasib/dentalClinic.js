// A dental clinic's shared reads: every visit loaded once with its charges, the visit card the
// schedule, list, record and Chats read, the tasks the records call for, and the refresh that
// keeps tasks and rule drafts current. Nothing here sends a message.
import { owned } from '../blueTenant.js';
import { ok, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { reconcileTasks } from './workspace/tasks.js';
import { conversationOf } from './workspace/conversation.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { formatLocal } from '../../src/lib/timezone.js';
import { dentalSettings } from './dentalSettings.js';
import { dentalRuleWanted, dentalDraftText, DENTAL_RULE_TASK_KINDS } from './dentalRules.js';
import { DAY, outcomeUnknown, balanceOf, balanceOverdue, countedVisits, timeOfDay } from './dentalDomain.js';

const SCAN = 2000, ARABIC = /[؀-ۿ]/;
const RECORD_WEEK = 7 * DAY, CHARGE_WINDOW = 14 * DAY;
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const DENTAL_AUTO_TASKS = new Set(['visit_request', 'attendance_unrecorded', 'charges_unrecorded', 'balance_overdue', 'rebook_missed', ...DENTAL_RULE_TASK_KINDS]);
// Money tasks: only a manager sees and acts on them.
export const MANAGER_TASKS = new Set(['charges_unrecorded', 'balance_overdue', 'template_required', 'rule_balance_due']);
// Fire once per occasion: someone who closes one is not asked again for the same missed visit or rule firing.
const ONCE_TASKS = new Set([...DENTAL_RULE_TASK_KINDS, 'rebook_missed']);
// A receptionist closing "rebook" with one of these stops the recovery message too.
export const REBOOK_STOPS = new Set(['declined', 'hold']);

const groupBy = (rows, key) => { const m = new Map(); for (const r of rows) { const k = String(r[key]); m.set(k, [...(m.get(k) || []), r]); } return m; };
export const hourOf = (ms, tz) => Number(formatLocal(ms, tz).slice(11, 13));

/** Every visit of the clinic with its providers, chairs, charge orders and drafts, read once. */
export async function loadClinic(ctx, accountId, now) {
  const resources = await ctx.db.query('dentalResources').withIndex('by_account', q => q.eq('accountId', accountId)).take(500);
  const visits = await ctx.db.query('dentalVisits').withIndex('by_account_start', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  const drafts = await ctx.db.query('dentalDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  const resolvedRebooks = (await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(500))
    .filter(t => t.kind === 'rebook_missed' && REBOOK_STOPS.has(t.resolution));
  const resourceById = new Map(resources.map(r => [String(r._id), r]));
  const orders = new Map();
  for (const v of visits) if (v.orderId && !orders.has(String(v.orderId))) orders.set(String(v.orderId), await owned(ctx, v.orderId, accountId, 'hasibOrders'));
  const visitsOf = groupBy(visits, 'contactId');
  const firstVisit = new Map();
  for (const [contactId, rows] of visitsOf) { const first = countedVisits(rows)[0]; if (first) firstVisit.set(contactId, String(first._id)); }
  // A later visit (not cancelled) booked for the same patient.
  const bookedAfter = (v, t) => (visitsOf.get(String(v.contactId)) || []).some(o => o._id !== v._id && o.status !== 'cancelled' && o.createdAt > t);
  return { resources, resourceById, visits, visitsOf, drafts, orders, firstVisit,
    held: new Set(resolvedRebooks.map(t => t.entityId)),
    rebooked: v => bookedAfter(v, v.missedAt || v.updatedAt) || visits.some(o => String(o.replacementForId) === String(v._id) && o.status !== 'cancelled'),
    bookedSinceRecall: v => bookedAfter(v, v.recallSetAt || v.completedAt || 0),
    isNew: v => firstVisit.get(String(v.contactId)) === String(v._id),
    complete: visits.length < SCAN };
}

const name = async (ctx, accountId, id, cache) => {
  if (!id) return null;
  if (!cache.has(String(id))) { const c = await owned(ctx, id, accountId, 'blueContacts'); cache.set(String(id), c?.state === 'active' ? displayName(c).name : null); }
  return cache.get(String(id));
};

/** The next step a visit is waiting for, from its current facts. */
export function nextAction(v, clinic, now, manager) {
  const order = v.orderId ? clinic.orders.get(String(v.orderId)) : null;
  if (v.status === 'booked' && v.startsAt > now) return 'confirm';
  if (outcomeUnknown(v, now)) return 'record_outcome';
  if (['booked', 'confirmed'].includes(v.status)) return 'check_in';
  if (v.status === 'arrived') return 'complete';
  if (v.status === 'missed') return clinic.rebooked(v) ? null : 'rebook';
  if (v.status === 'completed' && manager && (!order || ['returned', 'cancelled'].includes(order.status))) return 'record_charges';
  if (v.status === 'completed' && manager && balanceOf(order) > 0) return 'collect_balance';
  return null;
}

/** One row per visit, the shape the schedule, list, record and drill-downs share. */
export async function describeVisits(ctx, accountId, actor, clinic, visits, now, { tz, dueTasks = new Set(), names = new Map() } = {}) {
  const manager = actor.role === 'manager', out = [];
  for (const v of visits) {
    const provider = clinic.resourceById.get(String(v.providerId)), chair = v.chairId ? clinic.resourceById.get(String(v.chairId)) : null;
    const order = v.orderId ? clinic.orders.get(String(v.orderId)) : null;
    const unknown = outcomeUnknown(v, now), start = tz ? formatLocal(v.startsAt, tz).slice(0, 10) : null, today = tz ? formatLocal(now, tz).slice(0, 10) : null;
    out.push({ id: v._id, contactId: String(v.contactId), contactName: await name(ctx, accountId, v.contactId, names),
      forMinor: !!v.forMinor, guardianContactId: v.guardianContactId || null, guardianName: v.guardianContactId ? await name(ctx, accountId, v.guardianContactId, names) : null,
      serviceItemId: v.serviceItemId || null, serviceName: v.serviceName || null, serviceCategory: v.serviceCategory || null,
      providerId: v.providerId, providerName: provider?.name || null, chairId: v.chairId || null, chairName: chair?.name || null,
      startsAt: v.startsAt, endsAt: v.endsAt, status: v.status, outcome: unknown ? 'unknown' : v.status, version: v.version, source: v.source || null,
      newPatient: clinic.isNew(v), timeOfDay: tz ? timeOfDay(hourOf(v.startsAt, tz)) : null,
      cancelReason: v.cancelReason || null, lateCancel: !!v.lateCancel, rescheduleCount: v.rescheduleCount || 0, replacementForId: v.replacementForId || null,
      recallDueAt: v.recallDueAt || null, recallSetAt: v.recallSetAt || null, recallVersion: v.recallVersion || 0,
      nextAction: nextAction(v, clinic, now, manager),
      flags: { today: !!start && start === today, unconfirmed: v.status === 'booked' && v.startsAt > now, missed: v.status === 'missed', followupDue: dueTasks.has(String(v._id)) || dueTasks.has(String(v.contactId)) },
      ...(manager ? { money: { orderId: v.orderId || null, orderStatus: order?.status || null, totalMinor: order?.totalMinor || 0, paidMinor: order?.paidMinor || 0, balanceMinor: balanceOf(order),
        chargeDueAt: v.chargeDueAt || null, overdue: balanceOverdue(v, order, now), disputed: !!v.disputed } } : {}) });
  }
  return out;
}

/** The tasks the records call for right now. */
function currentTasks(clinic, openRequests, now) {
  const wanted = [], add = (kind, entityType, id, reason, dueAt) => wanted.push({ kind, entityType, entityId: String(id), reason, dueAt });
  // A visit request stays open until the patient has a visit booked after it.
  for (const t of openRequests) if (!(clinic.visitsOf.get(t.entityId) || []).some(v => v.status !== 'cancelled' && v.createdAt >= t.createdAt)) add('visit_request', 'contact', t.entityId, t.reason, t.dueAt);
  for (const v of clinic.visits) {
    if (outcomeUnknown(v, now) && now - v.endsAt <= RECORD_WEEK) add('attendance_unrecorded', 'visit', v._id, 'Visit time has passed: record whether the patient came', v.endsAt);
    const order = v.orderId ? clinic.orders.get(String(v.orderId)) : null;
    if (v.status === 'completed' && (!order || ['returned', 'cancelled'].includes(order.status)) && now - (v.completedAt || v.endsAt) <= CHARGE_WINDOW)
      add('charges_unrecorded', 'visit', v._id, 'Visit completed: record its charges', v.completedAt || v.endsAt);
    if (balanceOverdue(v, order, now)) add('balance_overdue', 'visit', v._id, 'Visit balance past its due date', v.chargeDueAt);
    if (v.status === 'missed' && !clinic.rebooked(v) && now - (v.missedAt || v.endsAt) <= 30 * DAY) add('rebook_missed', 'visit', v._id, 'Missed visit: offer the patient another time', v.missedAt || v.endsAt);
  }
  return wanted;
}

/** Writes one draft in the recipient's language from recorded facts; never for an opted-out contact. */
export async function insertDraft(ctx, accountId, item, { timezone, currency }, now) {
  const contact = await ctx.db.get(item.contactId), { conversation, optedOut } = await conversationOf(ctx, accountId, item.contactId);
  if (optedOut || contact?.state !== 'active') return null;
  const last = conversation ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in')).order('desc').first() : null;
  const shown = displayName(contact).name;
  const text = dentalDraftText(item, { name: shown && !/^\+?\d/.test(shown) ? shown : '', timezone, currency, arabic: last?.text ? ARABIC.test(last.text) : true });
  return ctx.db.insert('dentalDrafts', { accountId, requestId: `rule:${item.key}`, contactId: item.contactId, visitId: item.visit._id, ...(conversation ? { conversationId: conversation._id } : {}),
    kind: item.rule.id, text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Brings tasks and rule drafts up to date with the records. Runs whenever the workspace is read. */
export async function refreshClinic(ctx, accountId, now) {
  const clinic = await loadClinic(ctx, accountId, now), base = await settingsFor(ctx, accountId), s = dentalSettings(base), timezone = await businessTimezone(ctx, accountId);
  const open = await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500);
  const wanted = currentTasks(clinic, open.filter(t => t.kind === 'visit_request'), now);
  const rules = dentalRuleWanted(clinic, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt });
  await reconcileTasks(ctx, { table: 'dentalTasks', accountId, wanted, autoKinds: DENTAL_AUTO_TASKS, ruleKinds: ONCE_TASKS, now });
  await reconcileRuleDrafts(ctx, { rules, drafts: clinic.drafts, insert: item => insertDraft(ctx, accountId, item, { timezone, currency: base.currency }, now), now });
  const drafts = await ctx.db.query('dentalDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  return { clinic: { ...clinic, drafts }, settings: s, timezone };
}

/** Open tasks due now, by the visit or patient they belong to (the "Follow-up due" filter). */
export async function dueTaskKeys(ctx, accountId, actor, now) {
  const open = await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500);
  return new Set(open.filter(t => (t.snoozedUntil || t.dueAt || t.createdAt) <= now && (actor.role === 'manager' || !MANAGER_TASKS.has(t.kind))).map(t => t.entityId));
}

/** Counts for the Needs attention strip. */
export async function dentalOverview(ctx, tenant, actor, now) {
  const { clinic, settings, timezone } = await refreshClinic(ctx, tenant.accountId, now);
  const open = await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', tenant.accountId).eq('status', 'open')).take(500);
  const manager = actor.role === 'manager', count = kind => open.filter(t => t.kind === kind).length;
  const today = formatLocal(now, timezone).slice(0, 10);
  const todays = clinic.visits.filter(v => formatLocal(v.startsAt, timezone).slice(0, 10) === today && v.status !== 'cancelled');
  const items = await ctx.db.query('hasibItems').withIndex('by_account_archived_updated', q => q.eq('accountId', tenant.accountId).eq('archived', false)).take(500);
  return ok({ workspaceRole: actor.role, settings, timezone,
    today: { visits: todays.length, unconfirmed: todays.filter(v => v.status === 'booked' && v.startsAt > now).length, arrived: todays.filter(v => v.status === 'arrived').length },
    attention: { requests: count('visit_request'), attendanceUnrecorded: count('attendance_unrecorded'), rebook: count('rebook_missed'),
      chargesUnrecorded: manager ? count('charges_unrecorded') : 0, balancesOverdue: manager ? count('balance_overdue') : 0,
      approvals: manager ? clinic.drafts.filter(d => d.status === 'draft').length : 0 },
    setup: { providers: clinic.resources.filter(r => r.kind === 'provider' && r.active).length, chairs: clinic.resources.filter(r => r.kind === 'chair' && r.active).length,
      treatments: items.filter(i => i.kind === 'service').length } });
}

