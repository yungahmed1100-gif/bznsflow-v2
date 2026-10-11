// Memberships → Follow-ups: one queue built from tasks, drafts and dated follow-ups linked to a
// membership. Chats and Customers read these same rows. Automatic tasks close themselves when the
// fact they wait for is recorded, so they cannot be marked done by hand.
import { owned } from '../blueTenant.js';
import { ok, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, datedFollowups, datedBucket, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { loadGym, describeMembers } from './fitnessGym.js';
import { fitnessSettings } from './fitnessSettings.js';

export const FITNESS_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const WAITING_TASKS = new Set(['payment_due']);
// Closed by a recorded fact (payment, attendance, renewal), never by a click.
export const SELF_CLOSING = new Set(['payment_due', 'attendance_unrecorded', 'in_grace']);
const DRAFT_BUCKET = draftBuckets('decision');

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
  for (const t of await taskRows(ctx, 'fitnessTasks', accountId)) {
    const contactId = ownerOf(gym, t), klass = t.entityType === 'class' ? gym.classById.get(t.entityId) : null;
    if (!contactId && !klass) continue;
    // Staff see their own assigned work and everything unassigned.
    if (actor.role === 'employee' && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const { due, bucket } = taskTiming(t, now, today, { waiting: WAITING_TASKS });
    rows.push({ ...taskBase(t, due, bucket), contactId: contactId ? String(contactId) : null, classId: klass ? klass._id : null, classTitle: klass?.title || null,
      assignedAccountId: t.assignedAccountId || null, version: t.updatedAt, selfClosing: SELF_CLOSING.has(t.kind), ...taskTail(t) });
  }
  if (actor.role === 'manager') for (const d of gym.drafts) {
    const row = draftRow(d, rows, DRAFT_BUCKET, d.kind, { contactId: String(d.contactId) });
    if (row) rows.push(row);
  }
  for (const f of await datedFollowups(ctx, accountId, 'membership')) rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: datedBucket(f, now, today), dueAt: f.dueAt,
    entityType: 'membership', entityId: String(f.linkedId), contactId: String(f.contactId), version: f.version });
  return { rows, gym };
}

export async function fitnessFollowupQueue(ctx, tenant, actor, a, now) {
  const { rows } = await queueRows(ctx, tenant, actor, now);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: FITNESS_FILTERS, order: ORDER, filter: a.filter, match: r => !a.contactId || r.contactId === String(a.contactId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  const names = new Map();
  for (const id of new Set(chosen.map(r => r.contactId).filter(Boolean))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(id, c?.state === 'active' ? displayName(c).name : null); }
  return ok({ items: chosen.map(r => ({ ...r, contactName: r.contactId ? names.get(r.contactId) : null })), counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'fitnessTasks');
  if (!task) return null;
  if (actor.role === 'employee' && task.assignedAccountId && String(task.assignedAccountId) !== String(actor.actorAccountId)) return null;
  return task;
}

export const resolveFitnessTask = async (ctx, tenant, actor, a, now) => resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now, SELF_CLOSING);
export const snoozeFitnessTask = async (ctx, tenant, actor, a, now) => snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);

/** A customer's membership, next class and open follow-ups, for Chats and Customers. */
export async function fitnessContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
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
