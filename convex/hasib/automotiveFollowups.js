// Workshop → Follow-ups: one queue built from the tasks the records open, the rule drafts and the
// estimates waiting on the customer. Chats and Customers read the same rows for one customer.
import { owned } from '../blueTenant.js';
import { ok } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { loadWorkshop, canSeeWork, AUTOMOTIVE_AUTO_TASKS } from './automotiveBoard.js';
import { latestEstimates } from './automotiveRules.js';

export const AUTOMOTIVE_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const DECISION_TASKS = new Set(['appointment_request']);
const WAITING_TASKS = new Set(['approval_waiting', 'ready_uncollected']);
const DRAFT_BUCKET = draftBuckets('decision');
// Tasks that close themselves once the fact is recorded; marking them done would only hide the cause.
const SELF_CLOSING = new Set([...AUTOMOTIVE_AUTO_TASKS].filter(k => !k.startsWith('rule_')));

async function queueRows(ctx, tenant, actor, now, loaded = null) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const shop = loaded || await loadWorkshop(ctx, accountId), rows = [];
  const work = new Map(shop.workOrders.map(w => [String(w._id), w])), estimates = new Map(shop.estimates.map(e => [String(e._id), e]));
  const workOf = (type, id) => type === 'work_order' ? work.get(String(id)) : type === 'estimate' ? work.get(String(estimates.get(String(id))?.workOrderId)) : null;
  const technician = actor.role === 'employee' && actor.operationalRole === 'technician';
  const visible = (type, id) => { const w = workOf(type, id); return w ? canSeeWork(actor, w) : !technician; };
  for (const t of await taskRows(ctx, 'automotiveTasks', accountId)) {
    if (!visible(t.entityType, t.entityId)) continue;
    const { due, bucket } = taskTiming(t, now, today, { decision: DECISION_TASKS, waiting: WAITING_TASKS });
    const w = workOf(t.entityType, t.entityId);
    rows.push({ ...taskBase(t, due, bucket), workOrderId: w?._id || null, contactId: w?.contactId || null, assignedAccountId: t.assignedAccountId || w?.assignedAdvisorAccountId || null, version: t.updatedAt, ...taskTail(t) });
  }
  if (!technician) for (const d of shop.drafts) {
    const row = draftRow(d, rows, DRAFT_BUCKET, 'draft', { workOrderId: d.workOrderId || null, contactId: d.contactId, conversationId: d.conversationId || null });
    if (row) rows.push(row);
  }
  // An issued estimate is the customer's to decide: waiting on them until someone follows up.
  const latest = latestEstimates(shop.estimates);
  for (const w of shop.workOrders) {
    const e = latest.get(String(w._id));
    if (w.status !== 'awaiting_approval' || e?.status !== 'issued' || !canSeeWork(actor, w)) continue;
    rows.push({ id: e._id, source: 'estimate', kind: 'estimate_issued', reason: `Estimate ${e.estimateNumber} is with the customer`, bucket: 'waiting', dueAt: e.issuedAt || e.createdAt,
      entityType: 'estimate', entityId: String(e._id), workOrderId: w._id, contactId: w.contactId, assignedAccountId: w.assignedAdvisorAccountId || null, version: e.version });
  }
  return { rows, shop, work };
}

/** Each row's work order number, vehicle and customer, for the list. */
async function decorate(ctx, accountId, shop, rows) {
  const vehicles = new Map(shop.vehicles.map(x => [String(x._id), x])), work = new Map(shop.workOrders.map(w => [String(w._id), w])), names = new Map();
  const out = [];
  for (const r of rows) {
    const w = r.workOrderId ? work.get(String(r.workOrderId)) : null, v = w ? vehicles.get(String(w.vehicleId)) : null;
    if (r.contactId && !names.has(String(r.contactId))) { const c = await owned(ctx, r.contactId, accountId, 'blueContacts'); names.set(String(r.contactId), c?.state === 'active' ? displayName(c).name : null); }
    out.push({ ...r, ref: w ? `#${w.number}` : null, title: v ? `${v.plate} · ${v.make} ${v.model}` : w?.concern || null, contactName: r.contactId ? names.get(String(r.contactId)) : null, status: w?.status || null });
  }
  return out;
}

export async function automotiveFollowupQueue(ctx, tenant, actor, a, now, loaded = null) {
  const { rows, shop } = await queueRows(ctx, tenant, actor, now, loaded);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: AUTOMOTIVE_FILTERS, order: ORDER, filter: a.filter, match: r => !a.workOrderId || String(r.workOrderId) === String(a.workOrderId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  return ok({ items: await decorate(ctx, tenant.accountId, shop, chosen), counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'automotiveTasks');
  if (!task) return null;
  const workId = task.entityType === 'work_order' ? task.entityId : task.entityType === 'estimate' ? (await owned(ctx, task.entityId, tenant.accountId, 'automotiveEstimates'))?.workOrderId : null;
  const w = workId ? await owned(ctx, workId, tenant.accountId, 'automotiveWorkOrders') : null;
  if (w) return canSeeWork(actor, w) ? task : null;
  return actor.operationalRole === 'technician' && actor.role === 'employee' ? null : task;
}

export const resolveAutomotiveTask = async (ctx, tenant, actor, a, now) => resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now, SELF_CLOSING);
export const snoozeAutomotiveTask = async (ctx, tenant, actor, a, now) => snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);

/** A customer's vehicles in the workshop with their stage and open follow-ups, for Chats and Customers. */
export async function automotiveContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId || (actor.role === 'employee' && actor.operationalRole === 'technician')) return ok({ items: [] });
  const { rows, shop } = await queueRows(ctx, tenant, actor, now);
  const mine = shop.workOrders.filter(w => String(w.contactId) === String(contactId)).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 5);
  const vehicles = new Map(shop.vehicles.map(x => [String(x._id), x])), latest = latestEstimates(shop.estimates);
  const items = mine.map(w => {
    const v = vehicles.get(String(w.vehicleId)), e = latest.get(String(w._id));
    const followups = rows.filter(r => String(r.workOrderId) === String(w._id) && r.bucket !== 'completed');
    return { id: w._id, ref: `#${w.number}`, title: v ? `${v.plate} · ${v.make} ${v.model}` : w.concern, status: w.status, promisedAt: w.promisedAt || null,
      estimate: e ? { number: e.estimateNumber, status: e.status, ...(actor.role === 'manager' || actor.operationalRole !== 'technician' ? { totalMinor: e.totalMinor } : {}) } : null,
      followups: followups.slice(0, 3), openFollowups: followups.length };
  });
  return ok({ items });
}
