// The Follow-ups queue every six-tab sector shares: tasks (open and recently resolved), the drafts
// Hasib wrote, and dated follow-ups, put into the same buckets, counted, sorted and cut the same
// way. A sector supplies only who may see a row and what it adds to it. Nothing here sends.
import { owned } from '../../blueTenant.js';
import { ok, fail } from '../shared.js';
import { audit } from '../workspaceState.js';
import { publicRow } from './rows.js';
import { dueBucket, sortQueue, validSnooze } from './queue.js';

export const SCAN = 500, DONE_SCAN = 50;
export const BLOCKED_TASKS = new Set(['template_required', 'send_failed']);
const NONE = new Set();

/** Where a draft sits by its send status; `decision` is the sector's name for "waiting for approval". */
export const draftBuckets = (decision = 'decision') => ({
  draft: decision, blocked: 'blocked', template_required: 'blocked', failed: 'blocked',
  queued: 'completed', queued_template: 'completed', provider_submitted: 'completed', delivered: 'completed', read: 'completed', cancelled: 'completed',
});

/** Open tasks, then the most recently resolved ones. */
export async function taskRows(ctx, table, accountId) {
  const open = await ctx.db.query(table).withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const resolved = await ctx.db.query(table).withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(DONE_SCAN);
  return [...open, ...resolved];
}

/** A task's due time (a snooze moves it) and its bucket. */
export function taskTiming(t, now, today, { blocked = BLOCKED_TASKS, decision = NONE, waiting = NONE } = {}) {
  const due = t.snoozedUntil || t.dueAt || t.createdAt;
  const bucket = t.status !== 'open' ? 'completed' : blocked.has(t.kind) ? 'blocked' : decision.has(t.kind) ? 'decision' : waiting.has(t.kind) ? 'waiting' : dueBucket(due, now, today);
  return { due, bucket };
}

/** The fields every task row carries, before the sector's own. */
export const taskBase = (t, due, bucket) => ({ id: t._id, source: 'task', kind: t.kind, reason: t.reason, bucket, dueAt: due, entityType: t.entityType, entityId: t.entityId });
export const taskTail = t => ({ ...(t.snoozedUntil ? { snoozedUntil: t.snoozedUntil } : {}), ...(t.resolution ? { resolution: t.resolution, resolvedAt: t.resolvedAt } : {}) });

/** A draft's row, or null once the completed list is full. `reason` is the rule, else the sector's fallback. */
export function draftRow(d, rows, buckets, fallbackReason, extra) {
  const bucket = buckets[d.status] || 'blocked';
  if (bucket === 'completed' && rows.filter(r => r.bucket === 'completed').length >= DONE_SCAN) return null;
  return { id: d._id, source: 'draft', kind: d.kind, reason: d.ruleId ? `rule:${d.ruleId}` : fallbackReason, bucket, dueAt: d.approvedAt || d.createdAt, entityType: 'draft', entityId: String(d._id),
    ...extra, version: d.version, sendStatus: d.status, text: d.text, ...(d.ruleId ? { ruleId: d.ruleId } : {}) };
}

/** Dated follow-ups (hasibFollowups) linked to one kind of sector record. */
export async function datedFollowups(ctx, accountId, linkedType) {
  return (await ctx.db.query('hasibFollowups').withIndex('by_account_due', q => q.eq('accountId', accountId)).order('desc').take(SCAN)).filter(f => f.linkedType === linkedType);
}
export const datedBucket = (f, now, today) => f.status === 'completed' ? 'completed' : dueBucket(f.dueAt, now, today);

/** Counts per filter, then the chosen filter's rows sorted and capped, and what needs someone now. */
export function queueSelection(rows, { filters, order, filter, match = () => true, actionable, limit = 200 }) {
  const chosenFilter = filter && filters.includes(filter) ? filter : null;
  const counts = Object.fromEntries(filters.map(f => [f, rows.filter(r => r.bucket === f).length]));
  const chosen = sortQueue(rows.filter(r => (!chosenFilter || r.bucket === chosenFilter) && match(r)), order).slice(0, limit);
  return { counts, chosen, actionable: actionable.reduce((n, b) => n + counts[b], 0) };
}

/** Closes a task the actor may see. A self-closing task waits for its fact instead. */
export async function resolveTask(ctx, tenant, actor, task, a, now, selfClosing = NONE) {
  if (!task) return fail('task_not_found');
  if (selfClosing.has(task.kind)) return fail('task_closes_itself');
  if (task.status !== 'open') return ok(publicRow(task));
  await ctx.db.patch(task._id, { status: 'resolved', resolvedAt: now, resolvedBy: String(actor.actorAccountId), resolution: String(a.reason || 'done').slice(0, 200), updatedAt: now });
  await audit(ctx, tenant, actor, 'task_resolved', 'task', task._id, now, task.kind);
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** Moves an open task later. The version is its last update, so a stale screen cannot snooze twice. */
export async function snoozeTask(ctx, tenant, actor, task, a, now) {
  if (!task || task.status !== 'open') return fail('task_not_found');
  if (a.version !== task.updatedAt) return fail('task_conflict');
  if (!validSnooze(a.dueAt, now)) return fail('invalid_snooze');
  await ctx.db.patch(task._id, { snoozedUntil: a.dueAt, updatedAt: now });
  await audit(ctx, tenant, actor, 'task_snoozed', 'task', task._id, now, String(a.dueAt));
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** The customer a context card is for: by contact, or by the conversation's contact, owned by the tenant. */
export async function contextContact(ctx, tenant, a) {
  let contactId = a.contactId;
  if (!contactId && a.conversationId) contactId = (await owned(ctx, a.conversationId, tenant.accountId, 'blueConversations'))?.contactId;
  return contactId && await owned(ctx, contactId, tenant.accountId, 'blueContacts') ? contactId : null;
}
