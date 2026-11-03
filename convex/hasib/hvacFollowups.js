// Jobs → Follow-ups: one queue built from the business's tasks and drafts. Chats and Customers read
// these same rows. Automatic tasks close themselves when the fact they wait for is recorded (a
// triage, a booked visit, an arrival), so they cannot be marked done by hand. A technician sees only
// tasks assigned to them; money and decision drafts are the manager's.
import { owned } from '../blueTenant.js';
import { ok } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { loadShop, describeJobs, dueTaskKeys, technicians, MANAGER_TASKS } from './hvacBoard.js';
import { OPEN_JOB } from './hvacDomain.js';

export const HVAC_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const WAITING_TASKS = new Set(['rule_parts_delay']);
// Closed by a recorded fact (a triage, a booked visit, an arrival), never by a click.
export const SELF_CLOSING = new Set(['triage_request', 'schedule_job', 'arrival_unrecorded']);
const DRAFT_BUCKET = draftBuckets('decision');

/** The customer each task belongs to, and its job when there is one. */
function ownerOf(shop, t) {
  if (t.entityType === 'contact') return { contactId: t.entityId, job: null };
  if (t.entityType === 'job') { const job = shop.jobById.get(t.entityId); return { contactId: job?.contactId, job }; }
  if (t.entityType === 'visit') { const v = shop.visits.find(x => String(x._id) === t.entityId), job = v ? shop.jobById.get(String(v.jobId)) : null; return { contactId: job?.contactId, job }; }
  if (t.entityType === 'unit') return { contactId: shop.unitById.get(t.entityId)?.contactId, job: null };
  if (t.entityType === 'contract') return { contactId: shop.contractById.get(t.entityId)?.contactId, job: null };
  if (t.entityType === 'draft') { const d = shop.drafts.find(x => String(x._id) === t.entityId); return { contactId: d?.contactId, job: d?.jobId ? shop.jobById.get(String(d.jobId)) : null }; }
  return { contactId: null, job: null };
}

async function queueRows(ctx, tenant, actor, now, loaded) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const shop = loaded || await loadShop(ctx, accountId, now), rows = [], manager = actor.role === 'manager';
  const tech = actor.operationalRole === 'technician';
  for (const t of await taskRows(ctx, 'hvacTasks', accountId)) {
    if (!manager && MANAGER_TASKS.has(t.kind)) continue;
    const { contactId, job } = ownerOf(shop, t);
    if (!contactId) continue;
    if (!manager && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    if (tech && String(job?.technicianAccountId) !== String(actor.actorAccountId)) continue;
    const { due, bucket } = taskTiming(t, now, today, { waiting: WAITING_TASKS });
    rows.push({ ...taskBase(t, due, bucket), contactId: String(contactId), jobId: job?._id || null, jobNumber: job?.number ?? null, assignedAccountId: t.assignedAccountId || null,
      version: t.updatedAt, selfClosing: SELF_CLOSING.has(t.kind), ...taskTail(t) });
  }
  if (manager) for (const d of shop.drafts) {
    const job = d.jobId ? shop.jobById.get(String(d.jobId)) : null;
    const row = draftRow(d, rows, DRAFT_BUCKET, d.kind, { contactId: String(d.contactId), jobId: job?._id || null, jobNumber: job?.number ?? null, contractId: d.contractId || null, autoSkip: d.autoSkip || null });
    if (row) rows.push(row);
  }
  return { rows, shop };
}

export async function hvacFollowupQueue(ctx, tenant, actor, a, now, loaded) {
  const { rows } = await queueRows(ctx, tenant, actor, now, loaded);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: HVAC_FILTERS, order: ORDER, filter: a.filter, match: r => !a.contactId || r.contactId === String(a.contactId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  const names = new Map();
  for (const id of new Set(chosen.map(r => r.contactId))) { const c = await owned(ctx, id, tenant.accountId, 'blueContacts'); names.set(id, c?.state === 'active' ? displayName(c).name : null); }
  return ok({ items: chosen.map(r => ({ ...r, contactName: names.get(r.contactId) })), counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'hvacTasks');
  if (!task) return null;
  if (actor.role !== 'manager' && (MANAGER_TASKS.has(task.kind) || (task.assignedAccountId && String(task.assignedAccountId) !== String(actor.actorAccountId)))) return null;
  return task;
}

export const resolveHvacTask = async (ctx, tenant, actor, a, now) => resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now, SELF_CLOSING);
export const snoozeHvacTask = async (ctx, tenant, actor, a, now) => snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);

/** A customer's open job, units, contract and follow-ups, for Chats and Customers. */
export async function hvacContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
  const { rows, shop } = await queueRows(ctx, tenant, actor, now);
  const jobs = shop.jobsOfContact(contactId), units = shop.units.filter(u => String(u.contactId) === String(contactId) && !u.retiredAt);
  const contract = shop.contracts.filter(c => String(c.contactId) === String(contactId) && c.status === 'active').sort((x, y) => y.endsAt - x.endsAt)[0];
  const followups = rows.filter(r => r.contactId === String(contactId) && r.bucket !== 'completed');
  if (!jobs.length && !units.length && !followups.length) return ok({ items: [] });
  const tz = await businessTimezone(ctx, tenant.accountId), team = await technicians(ctx, tenant.accountId, now);
  const open = jobs.filter(j => OPEN_JOB.has(j.status)).sort((x, y) => y.createdAt - x.createdAt)[0];
  const last = jobs.filter(j => j.status === 'completed').sort((x, y) => y.completedAt - x.completedAt)[0];
  const cards = await describeJobs(ctx, tenant.accountId, actor, shop, [open, last].filter(Boolean), now, { tz, team, dueTasks: await dueTaskKeys(ctx, tenant.accountId, actor, now) });
  return ok({ items: [{ contactId: String(contactId), jobs: jobs.length, units: units.map(u => ({ id: u._id, label: u.label, unitType: u.unitType, nextServiceAt: u.nextServiceAt || null })),
    contract: contract ? { id: contract._id, reference: contract.reference, endsAt: contract.endsAt, visitsPerYear: contract.visitsPerYear } : null,
    openJob: open ? cards.find(c => String(c.id) === String(open._id)) : null, lastJob: last ? cards.find(c => String(c.id) === String(last._id)) : null,
    followups: followups.slice(0, 3), openFollowups: followups.length }] });
}
