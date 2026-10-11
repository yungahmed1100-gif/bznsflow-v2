// Visits → Follow-ups: one queue built from the clinic's tasks and drafts. Chats and Customers
// read these same rows. Automatic tasks close themselves when the fact they wait for is recorded
// (attendance, charges, payment), so they cannot be marked done by hand. Receptionists never see
// money tasks or drafts.
import { owned } from '../blueTenant.js';
import { ok, fail, settingsFor } from './shared.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { publicRow } from './workspace/rows.js';
import { dueBucket, sortQueue, validSnooze } from './workspace/queue.js';
import { loadClinic, describeVisits, dueTaskKeys, MANAGER_TASKS } from './dentalClinic.js';
import { dentalSettings } from './dentalSettings.js';

const DONE_SCAN = 50, SCAN = 500;
export const DENTAL_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const BLOCKED_TASKS = new Set(['template_required', 'send_failed']);
const WAITING_TASKS = new Set(['balance_overdue']);
// Closed by a recorded fact (attendance, charges, payment or dispute), never by a click.
export const SELF_CLOSING = new Set(['attendance_unrecorded', 'charges_unrecorded', 'balance_overdue']);
const DRAFT_BUCKET = {
  draft: 'decision', blocked: 'blocked', template_required: 'blocked', failed: 'blocked',
  queued: 'completed', queued_template: 'completed', provider_submitted: 'completed', delivered: 'completed', read: 'completed', cancelled: 'completed',
};

/** The patient each task entity belongs to, and its visit when there is one. */
function ownerOf(clinic, t) {
  if (t.entityType === 'contact') return { contactId: t.entityId, visit: null };
  if (t.entityType === 'visit') { const visit = clinic.visits.find(v => String(v._id) === t.entityId); return { contactId: visit?.contactId, visit }; }
  if (t.entityType === 'draft') { const d = clinic.drafts.find(x => String(x._id) === t.entityId); return { contactId: d?.contactId, visit: d?.visitId ? clinic.visits.find(v => String(v._id) === String(d.visitId)) : null }; }
  return { contactId: null, visit: null };
}

async function queueRows(ctx, tenant, actor, now) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const clinic = await loadClinic(ctx, accountId, now), rows = [], manager = actor.role === 'manager';
  const open = await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const resolved = await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(DONE_SCAN);
  for (const t of [...open, ...resolved]) {
    if (!manager && MANAGER_TASKS.has(t.kind)) continue;
    const { contactId, visit } = ownerOf(clinic, t);
    if (!contactId) continue;
    if (!manager && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const due = t.snoozedUntil || t.dueAt || t.createdAt;
    const bucket = t.status !== 'open' ? 'completed' : BLOCKED_TASKS.has(t.kind) ? 'blocked' : WAITING_TASKS.has(t.kind) ? 'waiting' : dueBucket(due, now, today);
    rows.push({ id: t._id, source: 'task', kind: t.kind, reason: t.reason, bucket, dueAt: due, entityType: t.entityType, entityId: t.entityId, contactId: String(contactId),
      visitId: visit?._id || null, visitStartsAt: visit?.startsAt || null, assignedAccountId: t.assignedAccountId || null, version: t.updatedAt, selfClosing: SELF_CLOSING.has(t.kind),
      ...(t.snoozedUntil ? { snoozedUntil: t.snoozedUntil } : {}), ...(t.resolution ? { resolution: t.resolution, resolvedAt: t.resolvedAt } : {}) });
  }
  if (manager) for (const d of clinic.drafts) {
    const bucket = DRAFT_BUCKET[d.status] || 'blocked';
    if (bucket === 'completed' && rows.filter(r => r.bucket === 'completed').length >= DONE_SCAN) continue;
    const visit = d.visitId ? clinic.visits.find(v => String(v._id) === String(d.visitId)) : null;
    rows.push({ id: d._id, source: 'draft', kind: d.kind, reason: d.ruleId ? `rule:${d.ruleId}` : d.kind, bucket, dueAt: d.approvedAt || d.createdAt, entityType: 'draft', entityId: String(d._id),
      contactId: String(d.contactId), visitId: visit?._id || null, visitStartsAt: visit?.startsAt || null, version: d.version, sendStatus: d.status, text: d.text, ...(d.ruleId ? { ruleId: d.ruleId } : {}) });
  }
  return { rows, clinic };
}

export async function dentalFollowupQueue(ctx, tenant, actor, a, now) {
  const filter = a.filter && DENTAL_FILTERS.includes(a.filter) ? a.filter : null;
  const { rows } = await queueRows(ctx, tenant, actor, now);
  const counts = Object.fromEntries(DENTAL_FILTERS.map(f => [f, rows.filter(r => r.bucket === f).length]));
  const chosen = sortQueue(rows.filter(r => (!filter || r.bucket === filter) && (!a.contactId || r.contactId === String(a.contactId))), ORDER).slice(0, 200);
  const names = new Map();
  for (const id of new Set(chosen.map(r => r.contactId))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(id, c?.state === 'active' ? displayName(c).name : null); }
  return ok({ items: chosen.map(r => ({ ...r, contactName: names.get(r.contactId) })), counts, actionable: counts.today + counts.overdue + counts.decision + counts.blocked });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'dentalTasks');
  if (!task) return null;
  if (actor.role !== 'manager' && (MANAGER_TASKS.has(task.kind) || (task.assignedAccountId && String(task.assignedAccountId) !== String(actor.actorAccountId)))) return null;
  return task;
}

/** Closes a task with a reason. "declined" or "hold" on a missed visit also stops its recovery message. */
export async function resolveDentalTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task) return fail('task_not_found');
  if (SELF_CLOSING.has(task.kind)) return fail('task_closes_itself');
  if (task.status !== 'open') return ok(publicRow(task));
  await ctx.db.patch(task._id, { status: 'resolved', resolvedAt: now, resolvedBy: String(actor.actorAccountId), resolution: String(a.reason || 'done').slice(0, 200), updatedAt: now });
  await audit(ctx, tenant, actor, 'task_resolved', 'task', task._id, now, task.kind);
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** Moves an open task later. The version is its last update, so a stale screen cannot snooze twice. */
export async function snoozeDentalTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task || task.status !== 'open') return fail('task_not_found');
  if (a.version !== task.updatedAt) return fail('task_conflict');
  if (!validSnooze(a.dueAt, now)) return fail('invalid_snooze');
  await ctx.db.patch(task._id, { snoozedUntil: a.dueAt, updatedAt: now });
  await audit(ctx, tenant, actor, 'task_snoozed', 'task', task._id, now, String(a.dueAt));
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** A patient's next visit, latest visit and open follow-ups, for Chats and Customers. */
export async function dentalContext(ctx, tenant, actor, a, now) {
  let contactId = a.contactId;
  if (!contactId && a.conversationId) contactId = (await owned(ctx, a.conversationId, tenant.accountId, 'blueConversations'))?.contactId;
  if (!contactId || !await owned(ctx, contactId, tenant.accountId, 'blueContacts')) return ok({ items: [] });
  const { rows, clinic } = await queueRows(ctx, tenant, actor, now);
  const visits = clinic.visitsOf.get(String(contactId)) || [];
  const followups = rows.filter(r => r.contactId === String(contactId) && r.bucket !== 'completed');
  if (!visits.length && !followups.length) return ok({ items: [] });
  const tz = await businessTimezone(ctx, tenant.accountId), s = dentalSettings(await settingsFor(ctx, tenant.accountId));
  const upcoming = visits.filter(v => ['booked', 'confirmed', 'arrived'].includes(v.status) && v.endsAt > now).sort((x, y) => x.startsAt - y.startsAt)[0];
  const latest = [...visits].sort((x, y) => y.startsAt - x.startsAt).find(v => v.startsAt <= now);
  const cards = await describeVisits(ctx, tenant.accountId, actor, clinic, [upcoming, latest].filter(Boolean), now, { tz, dueTasks: await dueTaskKeys(ctx, tenant.accountId, actor, now) });
  const recall = visits.filter(v => v.recallDueAt).sort((x, y) => (y.recallSetAt || 0) - (x.recallSetAt || 0))[0];
  return ok({ items: [{ contactId: String(contactId), visits: visits.length, settings: { visitMinutes: s.visitMinutes },
    nextVisit: upcoming ? cards.find(c => String(c.id) === String(upcoming._id)) : null, lastVisit: latest ? cards.find(c => String(c.id) === String(latest._id)) : null,
    recallDueAt: recall?.recallDueAt || null, followups: followups.slice(0, 3), openFollowups: followups.length }] });
}
