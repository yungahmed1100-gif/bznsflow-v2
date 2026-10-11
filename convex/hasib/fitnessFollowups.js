// Memberships → Follow-ups: one queue built from tasks, drafts and dated follow-ups linked to a
// membership. Chats and Customers read these same rows. Automatic tasks close themselves when the
// fact they wait for is recorded, so they cannot be marked done by hand.
import { owned } from '../blueTenant.js';
import { ok, fail, settingsFor } from './shared.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { publicRow } from './workspace/rows.js';
import { dueBucket, sortQueue, validSnooze } from './workspace/queue.js';
import { loadGym, describeMembers } from './fitnessGym.js';
import { fitnessSettings } from './fitnessSettings.js';

const DONE_SCAN = 50, SCAN = 500;
export const FITNESS_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const BLOCKED_TASKS = new Set(['template_required', 'send_failed']);
const WAITING_TASKS = new Set(['payment_due']);
// Closed by a recorded fact (payment, attendance, renewal), never by a click.
export const SELF_CLOSING = new Set(['payment_due', 'attendance_unrecorded', 'in_grace']);
const DRAFT_BUCKET = {
  draft: 'decision', blocked: 'blocked', template_required: 'blocked', failed: 'blocked',
  queued: 'completed', queued_template: 'completed', provider_submitted: 'completed', delivered: 'completed', read: 'completed', cancelled: 'completed',
};

/** The member (contact) each task entity belongs to. */
function ownerOf(gym, t) {
  if (t.entityType === 'contact') return t.entityId;
  if (t.entityType === 'membership') return gym.memberships.find(m => String(m._id) === t.entityId)?.contactId;
  if (t.entityType === 'seat') return gym.seats.find(s => String(s._id) === t.entityId)?.contactId;
  if (t.entityType === 'draft') return gym.drafts.find(d => String(d._id) === t.entityId)?.contactId;
  return null;
}

async function queueRows(ctx, tenant, actor, now) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const gym = await loadGym(ctx, accountId, now), rows = [];
  const open = await ctx.db.query('fitnessTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const resolved = await ctx.db.query('fitnessTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(DONE_SCAN);
  for (const t of [...open, ...resolved]) {
    const contactId = ownerOf(gym, t), klass = t.entityType === 'class' ? gym.classById.get(t.entityId) : null;
    if (!contactId && !klass) continue;
    // Staff see their own assigned work and everything unassigned.
    if (actor.role === 'employee' && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const due = t.snoozedUntil || t.dueAt || t.createdAt;
    const bucket = t.status !== 'open' ? 'completed' : BLOCKED_TASKS.has(t.kind) ? 'blocked' : WAITING_TASKS.has(t.kind) ? 'waiting' : dueBucket(due, now, today);
    rows.push({ id: t._id, source: 'task', kind: t.kind, reason: t.reason, bucket, dueAt: due, entityType: t.entityType, entityId: t.entityId, contactId: contactId ? String(contactId) : null,
      classId: klass ? klass._id : null, classTitle: klass?.title || null, assignedAccountId: t.assignedAccountId || null, version: t.updatedAt, selfClosing: SELF_CLOSING.has(t.kind),
      ...(t.snoozedUntil ? { snoozedUntil: t.snoozedUntil } : {}), ...(t.resolution ? { resolution: t.resolution, resolvedAt: t.resolvedAt } : {}) });
  }
  if (actor.role === 'manager') for (const d of gym.drafts) {
    const bucket = DRAFT_BUCKET[d.status] || 'blocked';
    if (bucket === 'completed' && rows.filter(r => r.bucket === 'completed').length >= DONE_SCAN) continue;
    rows.push({ id: d._id, source: 'draft', kind: d.kind, reason: d.ruleId ? `rule:${d.ruleId}` : d.kind, bucket, dueAt: d.approvedAt || d.createdAt, entityType: 'draft', entityId: String(d._id),
      contactId: String(d.contactId), version: d.version, sendStatus: d.status, text: d.text, ...(d.ruleId ? { ruleId: d.ruleId } : {}) });
  }
  const dated = await ctx.db.query('hasibFollowups').withIndex('by_account_due', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  for (const f of dated) {
    if (f.linkedType !== 'membership') continue;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: f.status === 'completed' ? 'completed' : dueBucket(f.dueAt, now, today), dueAt: f.dueAt,
      entityType: 'membership', entityId: String(f.linkedId), contactId: String(f.contactId), version: f.version });
  }
  return { rows, gym };
}

export async function fitnessFollowupQueue(ctx, tenant, actor, a, now) {
  const filter = a.filter && FITNESS_FILTERS.includes(a.filter) ? a.filter : null;
  const { rows } = await queueRows(ctx, tenant, actor, now);
  const counts = Object.fromEntries(FITNESS_FILTERS.map(f => [f, rows.filter(r => r.bucket === f).length]));
  const chosen = sortQueue(rows.filter(r => (!filter || r.bucket === filter) && (!a.contactId || r.contactId === String(a.contactId))), ORDER).slice(0, 200);
  const names = new Map();
  for (const id of new Set(chosen.map(r => r.contactId).filter(Boolean))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(id, c?.state === 'active' ? displayName(c).name : null); }
  return ok({ items: chosen.map(r => ({ ...r, contactName: r.contactId ? names.get(r.contactId) : null })), counts, actionable: counts.today + counts.overdue + counts.decision + counts.blocked });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'fitnessTasks');
  if (!task) return null;
  if (actor.role === 'employee' && task.assignedAccountId && String(task.assignedAccountId) !== String(actor.actorAccountId)) return null;
  return task;
}

export async function resolveFitnessTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task) return fail('task_not_found');
  if (SELF_CLOSING.has(task.kind)) return fail('task_closes_itself');
  if (task.status !== 'open') return ok(publicRow(task));
  await ctx.db.patch(task._id, { status: 'resolved', resolvedAt: now, resolvedBy: String(actor.actorAccountId), resolution: String(a.reason || 'done').slice(0, 200), updatedAt: now });
  await audit(ctx, tenant, actor, 'task_resolved', 'task', task._id, now, task.kind);
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** Moves an open task later. The version is its last update, so a stale screen cannot snooze twice. */
export async function snoozeFitnessTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task || task.status !== 'open') return fail('task_not_found');
  if (a.version !== task.updatedAt) return fail('task_conflict');
  if (!validSnooze(a.dueAt, now)) return fail('invalid_snooze');
  await ctx.db.patch(task._id, { snoozedUntil: a.dueAt, updatedAt: now });
  await audit(ctx, tenant, actor, 'task_snoozed', 'task', task._id, now, String(a.dueAt));
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** A customer's membership, next class and open follow-ups, for Chats and Customers. */
export async function fitnessContext(ctx, tenant, actor, a, now) {
  let contactId = a.contactId;
  if (!contactId && a.conversationId) contactId = (await owned(ctx, a.conversationId, tenant.accountId, 'blueConversations'))?.contactId;
  if (!contactId || !await owned(ctx, contactId, tenant.accountId, 'blueContacts')) return ok({ items: [] });
  const { rows, gym } = await queueRows(ctx, tenant, actor, now);
  const known = gym.membershipsOf.has(String(contactId)) || gym.seatsByContact.has(String(contactId)) || rows.some(r => r.contactId === String(contactId));
  if (!known) return ok({ items: [] });
  const s = fitnessSettings(await settingsFor(ctx, tenant.accountId));
  const [card] = await describeMembers(ctx, tenant.accountId, actor, gym, [String(contactId)], now, s);
  const next = (gym.seatsByContact.get(String(contactId)) || []).filter(x => x.status === 'confirmed').map(x => ({ seat: x, klass: gym.classById.get(String(x.classId)) }))
    .filter(x => x.klass && x.klass.startsAt > now).sort((x, y) => x.klass.startsAt - y.klass.startsAt)[0];
  const followups = rows.filter(r => r.contactId === String(contactId) && r.bucket !== 'completed');
  return ok({ items: card ? [{ ...card, nextClass: next ? { title: next.klass.title, startsAt: next.klass.startsAt, trial: next.seat.trial } : null, followups: followups.slice(0, 3), openFollowups: followups.length }] : [] });
}
