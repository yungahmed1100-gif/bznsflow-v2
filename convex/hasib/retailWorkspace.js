// The six-tab Work for the two store packs (retail and retail-tech): Needs attention, Follow-ups and
// the rule drafts the manager approves. Orders, stock, requests, IMEIs and repairs keep their own
// operations; this reads them, opens tasks and drafts, and sends through the kit.
import { owned } from '../blueTenant.js';
import { STORE_OPERATIONS } from '../../config/hasib-workflow-operations.js';
import { ok, fail } from './shared.js';
import { approveDraft, draftRefusal } from './workspace/drafts.js';
import { publicRow } from './workspace/rows.js';
import { ensureAutomation } from './workspace/schedule.js';
import { periodRange } from './period.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, queueSelection, resolveTask, snoozeTask, contextContact, datedBucket, SCAN } from './workspace/followups.js';
import { loadStore, refreshStore, storeAttention, RETAIL_AUTO_TASKS } from './retailBoard.js';
import { quoteWaiting } from './repairOffer.js';

export const STORE_PACKS = new Set(['retail', 'retail-tech']);
export const STORE_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const DECISION_TASKS = new Set(['rule_order_unconfirmed', 'repair_request']);
const WAITING_TASKS = new Set(['ready_uncollected', 'repair_ready_uncollected']);
const SELF_CLOSING = new Set([...RETAIL_AUTO_TASKS].filter(k => !k.startsWith('rule_')));
const DRAFT_BUCKET = draftBuckets('decision');

async function queueRows(ctx, tenant, actor, now, loaded = null) {
  const accountId = tenant.accountId, packId = tenant.pack.id, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const store = loaded || await loadStore(ctx, accountId, packId), rows = [];
  const orderOf = new Map(store.orders.map(o => [String(o._id), o])), repairOf = new Map(store.repairs.map(r => [String(r._id), r]));
  for (const t of await taskRows(ctx, 'retailTasks', accountId)) {
    const { due, bucket } = taskTiming(t, now, today, { decision: DECISION_TASKS, waiting: WAITING_TASKS });
    const order = t.entityType === 'order' ? orderOf.get(String(t.entityId)) : null, repair = t.entityType === 'repair' ? repairOf.get(String(t.entityId)) : null;
    rows.push({ ...taskBase(t, due, bucket), orderId: order?._id || null, repairId: repair?._id || null, contactId: t.entityType === 'contact' ? t.entityId : order?.contactId || repair?.contactId || null,
      ref: order ? `#${order.number}` : repair ? `#${repair.number}` : null, title: repair?.device || null, version: t.updatedAt, ...taskTail(t) });
  }
  if (actor.role === 'manager') for (const d of store.drafts) {
    const row = draftRow(d, rows, DRAFT_BUCKET, 'draft', { orderId: d.orderId || null, repairId: d.repairId || null, contactId: d.contactId, conversationId: d.conversationId || null });
    if (row) rows.push(row);
  }
  // A repair quote is the customer's to approve: waiting on them until someone follows up.
  for (const r of store.repairs) if (quoteWaiting(r))
    rows.push({ id: r._id, source: 'repair', kind: 'repair_quote_waiting', reason: `Repair #${r.number} quote is with the customer`, bucket: 'waiting', dueAt: r.updatedAt,
      entityType: 'repair', entityId: String(r._id), repairId: r._id, contactId: r.contactId || null, ref: `#${r.number}`, title: r.device, version: r.version });
  // The team's own dated follow-ups (Customers → Add follow-up): unlinked or on an order.
  for (const f of (await ctx.db.query('hasibFollowups').withIndex('by_account_due', q => q.eq('accountId', accountId)).order('desc').take(SCAN)).filter(f => !f.linkedType || f.linkedType === 'order')) {
    const order = f.linkedType === 'order' ? orderOf.get(String(f.linkedId)) : null;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: datedBucket(f, now, today), dueAt: f.dueAt, entityType: order ? 'order' : 'contact',
      entityId: String(order?._id || f.contactId || f._id), orderId: order?._id || null, contactId: f.contactId || order?.contactId || null, ref: order ? `#${order.number}` : null, version: f.version });
  }
  return { rows, store };
}

async function decorate(ctx, accountId, rows) {
  const names = new Map(), out = [];
  for (const r of rows) {
    if (r.contactId && !names.has(String(r.contactId))) { const c = await owned(ctx, r.contactId, accountId, 'blueContacts'); names.set(String(r.contactId), c?.state === 'active' ? displayName(c).name : null); }
    out.push({ ...r, contactName: r.contactId ? names.get(String(r.contactId)) : null });
  }
  return out;
}

export async function storeFollowupQueue(ctx, tenant, actor, a, now, loaded = null) {
  const { rows } = await queueRows(ctx, tenant, actor, now, loaded);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: STORE_FILTERS, order: ORDER, filter: a.filter, actionable: ['today', 'overdue', 'decision', 'blocked'] });
  return ok({ items: await decorate(ctx, tenant.accountId, chosen), counts, actionable });
}

async function draftApprove(ctx, tenant, actor, a, now) {
  if (actor.role !== 'manager') return fail('manager_required');
  const row = await owned(ctx, a.draftId, tenant.accountId, 'retailDrafts'), refusal = draftRefusal(row, a);
  if (refusal) return fail(refusal);
  const saved = await approveDraft(ctx, tenant, actor, { row, keyPrefix: 'retail-draft', handoffReason: 'store_follow_up', taskTable: 'retailTasks',
    links: async d => ({ messageLinks: { retailDraftId: d._id }, recipientLinks: { retailDraftId: d._id }, contactId: d.contactId }) }, now);
  return ok(publicRow(saved));
}

/** The card beside a chat or customer: their open orders and repairs, each with its open follow-ups. Amounts are the manager's. */
async function storeContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
  const { rows, store } = await queueRows(ctx, tenant, actor, now);
  const mine = x => String(x.contactId) === String(contactId), open = (key, id) => rows.filter(r => String(r[key]) === String(id) && r.bucket !== 'completed');
  const money = minor => (actor.role === 'manager' ? { totalMinor: minor } : {});
  const items = [
    ...store.repairs.filter(mine).map(r => ({ id: r._id, type: 'repair', ref: `#${r.number}`, title: r.device, status: r.status, approvalStatus: r.approvalStatus || 'awaiting', dueAt: r.dueAt || null, updatedAt: r.updatedAt, followups: open('repairId', r._id) })),
    ...store.orders.filter(o => mine(o) && o.kind !== 'repair').map(o => ({ id: o._id, type: 'order', ref: `#${o.number}`, title: null, status: o.status, ...money(o.totalMinor), updatedAt: o.updatedAt, followups: open('orderId', o._id) })),
  ].sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 5).map(({ followups, ...x }) => ({ ...x, followups: followups.slice(0, 3), openFollowups: followups.length }));
  return ok({ items });
}

/** @returns {Promise<object|null>} null when the operation is not the store workspace's */
export async function executeStore(ctx, tenant, actor, a, now) {
  if (!STORE_OPERATIONS.includes(a.operation)) return null;
  if (!STORE_PACKS.has(tenant.pack.id)) return fail('module_unavailable');
  switch (a.operation) {
    case 'store_overview': {
      const store = await loadStore(ctx, tenant.accountId, tenant.pack.id);
      await ensureAutomation(ctx, tenant.accountId, tenant.pack.id, true, now);
      const queue = await storeFollowupQueue(ctx, tenant, actor, {}, now, store);
      return ok({ workspaceRole: actor.role, attention: storeAttention(store, actor), followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
    }
    case 'store_followups': await refreshStore(ctx, tenant.accountId, tenant.pack.id, now); return storeFollowupQueue(ctx, tenant, actor, a, now);
    case 'store_task_resolve': return resolveTask(ctx, tenant, actor, await owned(ctx, a.taskId, tenant.accountId, 'retailTasks'), a, now, SELF_CLOSING);
    case 'store_task_snooze': return snoozeTask(ctx, tenant, actor, await owned(ctx, a.taskId, tenant.accountId, 'retailTasks'), a, now);
    case 'store_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'store_context': return storeContext(ctx, tenant, actor, a, now);
    default: return fail('invalid_action');
  }
}
