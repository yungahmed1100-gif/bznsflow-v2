// Visits → Follow-ups: one queue built from the clinic's tasks and drafts. Chats and Customers
// read these same rows. Automatic tasks close themselves when the fact they wait for is recorded
// (attendance, charges, payment), so they cannot be marked done by hand. Receptionists never see
// money tasks or drafts.
import { owned } from '../blueTenant.js';
import { ok, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { loadClinic, describeVisits, dueTaskKeys, MANAGER_TASKS } from './dentalClinic.js';
import { dentalSettings } from './dentalSettings.js';

export const DENTAL_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const WAITING_TASKS = new Set(['balance_overdue']);
// Closed by a recorded fact (attendance, charges, payment or dispute), never by a click.
export const SELF_CLOSING = new Set(['attendance_unrecorded', 'charges_unrecorded', 'balance_overdue']);
const DRAFT_BUCKET = draftBuckets('decision');

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
  for (const t of await taskRows(ctx, 'dentalTasks', accountId)) {
    if (!manager && MANAGER_TASKS.has(t.kind)) continue;
    const { contactId, visit } = ownerOf(clinic, t);
    if (!contactId) continue;
    if (!manager && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const { due, bucket } = taskTiming(t, now, today, { waiting: WAITING_TASKS });
    rows.push({ ...taskBase(t, due, bucket), contactId: String(contactId), visitId: visit?._id || null, visitStartsAt: visit?.startsAt || null, assignedAccountId: t.assignedAccountId || null,
      version: t.updatedAt, selfClosing: SELF_CLOSING.has(t.kind), ...taskTail(t) });
  }
  if (manager) for (const d of clinic.drafts) {
    const visit = d.visitId ? clinic.visits.find(v => String(v._id) === String(d.visitId)) : null;
    const row = draftRow(d, rows, DRAFT_BUCKET, d.kind, { contactId: String(d.contactId), visitId: visit?._id || null, visitStartsAt: visit?.startsAt || null });
    if (row) rows.push(row);
  }
  return { rows, clinic };
}

export async function dentalFollowupQueue(ctx, tenant, actor, a, now) {
  const { rows } = await queueRows(ctx, tenant, actor, now);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: DENTAL_FILTERS, order: ORDER, filter: a.filter, match: r => !a.contactId || r.contactId === String(a.contactId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  const names = new Map();
  for (const id of new Set(chosen.map(r => r.contactId))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(id, c?.state === 'active' ? displayName(c).name : null); }
  return ok({ items: chosen.map(r => ({ ...r, contactName: names.get(r.contactId) })), counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'dentalTasks');
  if (!task) return null;
  if (actor.role !== 'manager' && (MANAGER_TASKS.has(task.kind) || (task.assignedAccountId && String(task.assignedAccountId) !== String(actor.actorAccountId)))) return null;
  return task;
}

/** Closes a task with a reason. "declined" or "hold" on a missed visit also stops its recovery message. */
export const resolveDentalTask = async (ctx, tenant, actor, a, now) => resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now, SELF_CLOSING);
export const snoozeDentalTask = async (ctx, tenant, actor, a, now) => snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);

/** A patient's next visit, latest visit and open follow-ups, for Chats and Customers. */
export async function dentalContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
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
