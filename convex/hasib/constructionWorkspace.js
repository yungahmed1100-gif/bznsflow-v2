// The six-tab Projects' own operations: Needs attention, Follow-ups, rule drafts the manager
// approves and the project card beside a chat. The contracting records stay with
// constructionState.js; this reads them, opens tasks and drafts, and sends through the kit.
import { owned } from '../blueTenant.js';
import { ok, fail, settingsFor } from './shared.js';
import { approveDraft, draftRefusal } from './workspace/drafts.js';
import { publicRow } from './workspace/rows.js';
import { ensureAutomation } from './workspace/schedule.js';
import { periodRange } from './period.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { constructionSettings } from './constructionSettings.js';
import { loadSite, refreshSite, siteAttention, CONSTRUCTION_AUTO_TASKS } from './constructionBoard.js';

export const CONSTRUCTION_WORKSPACE_OPERATIONS = new Set(['construction_followups', 'construction_task_resolve', 'construction_task_snooze', 'construction_draft_approve', 'construction_context']);
// What Layla, Hasib or Adiba may do in construction by themselves: read, and submit a variation the
// owner approved as an offer. Approving a variation, certifying, retention and the baseline stay with the manager.
export const CONSTRUCTION_AUTOMATION_ALLOWED = new Set(['construction_overview', 'construction_projects', 'construction_project', 'construction_variations', 'construction_variation_status',
  'construction_followups', 'construction_context']);

export const CONSTRUCTION_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const DECISION_TASKS = new Set(['site_visit_request', 'signed_variation_required', 'rule_approval_blocker']);
const WAITING_TASKS = new Set(['receivable_overdue']);
const SELF_CLOSING = new Set([...CONSTRUCTION_AUTO_TASKS].filter(k => !k.startsWith('rule_')));
const DRAFT_BUCKET = draftBuckets('decision');
// Money rows stay with the manager, as the money figures do.
const MONEY_TASKS = new Set(['receivable_overdue', 'rule_certified_balance_due']);

async function queueRows(ctx, tenant, actor, now, loaded = null) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const site = loaded || await loadSite(ctx, accountId, now), manager = actor.role === 'manager', rows = [];
  const projectOf = new Map(site.projects.map(p => [String(p._id), p]));
  const ofEntity = new Map([...site.variations, ...site.claims, ...site.commitments, ...site.milestones].map(r => [String(r._id), projectOf.get(String(r.projectId))]));
  for (const t of await taskRows(ctx, 'constructionTasks', accountId)) {
    if (!manager && MONEY_TASKS.has(t.kind)) continue;
    const p = t.entityType === 'project' ? projectOf.get(String(t.entityId)) : ofEntity.get(String(t.entityId));
    const { due, bucket } = taskTiming(t, now, today, { decision: DECISION_TASKS, waiting: WAITING_TASKS });
    rows.push({ ...taskBase(t, due, bucket), projectId: p?._id || null, contactId: t.entityType === 'contact' ? t.entityId : p?.contactId || null, assignedAccountId: t.assignedAccountId || p?.assignedAccountId || null, version: t.updatedAt, ...taskTail(t) });
  }
  if (manager) for (const d of site.drafts) {
    const row = draftRow(d, rows, DRAFT_BUCKET, 'draft', { projectId: d.projectId, contactId: d.contactId, conversationId: d.conversationId || null });
    if (row) rows.push(row);
  }
  for (const v of site.variations) if (v.status === 'submitted' && !v.customerApproval) rows.push({ id: v._id, source: 'variation', kind: 'variation_submitted', reason: `Variation ${v.reference} is with the client`,
    bucket: 'waiting', dueAt: v.submittedAt || v.createdAt, entityType: 'variation', entityId: String(v._id), projectId: v.projectId, contactId: projectOf.get(String(v.projectId))?.contactId || null, version: v.version });
  return { rows, site, projectOf };
}

async function decorate(ctx, accountId, projectOf, rows) {
  const names = new Map(), out = [];
  for (const r of rows) {
    const p = r.projectId ? projectOf.get(String(r.projectId)) : null;
    if (r.contactId && !names.has(String(r.contactId))) { const c = await owned(ctx, r.contactId, accountId, 'blueContacts'); names.set(String(r.contactId), c?.state === 'active' ? displayName(c).name : null); }
    out.push({ ...r, ref: p?.reference || null, title: p?.title || null, contactName: r.contactId ? names.get(String(r.contactId)) : null, status: p?.status || null });
  }
  return out;
}

export async function constructionFollowupQueue(ctx, tenant, actor, a, now, loaded = null) {
  const { rows, projectOf } = await queueRows(ctx, tenant, actor, now, loaded);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: CONSTRUCTION_FILTERS, order: ORDER, filter: a.filter, match: r => !a.projectId || String(r.projectId) === String(a.projectId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  return ok({ items: await decorate(ctx, tenant.accountId, projectOf, chosen), counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'constructionTasks');
  return task && (actor.role === 'manager' || !MONEY_TASKS.has(task.kind)) ? task : null;
}

async function draftApprove(ctx, tenant, actor, a, now) {
  if (actor.role !== 'manager') return fail('manager_required');
  const row = await owned(ctx, a.draftId, tenant.accountId, 'constructionDrafts'), refusal = draftRefusal(row, a);
  if (refusal) return fail(refusal);
  const saved = await approveDraft(ctx, tenant, actor, { row, keyPrefix: 'construction-draft', handoffReason: 'project_follow_up', taskTable: 'constructionTasks',
    links: async d => ({ messageLinks: { constructionDraftId: d._id }, recipientLinks: { constructionDraftId: d._id }, contactId: d.contactId }) }, now);
  return ok(publicRow(saved));
}

/** A client's live projects with their stage and open follow-ups, for Chats and Customers. */
async function context(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
  const { rows, site } = await queueRows(ctx, tenant, actor, now);
  const items = site.projects.filter(p => String(p.contactId) === String(contactId)).slice(0, 5).map(p => {
    const followups = rows.filter(r => String(r.projectId) === String(p._id) && r.bucket !== 'completed');
    return { id: p._id, ref: p.reference, title: p.title, status: p.status, forecastFinishAt: p.forecastFinishAt, followups: followups.slice(0, 3), openFollowups: followups.length };
  });
  return ok({ items });
}

/** The overview with the strip and Work badge; employees never see the money figures. It only reads. */
export async function siteOverview(ctx, tenant, actor, base, now) {
  const site = await loadSite(ctx, tenant.accountId, now), s = constructionSettings(await settingsFor(ctx, tenant.accountId));
  await ensureAutomation(ctx, tenant.accountId, 'construction', true, now);
  const queue = await constructionFollowupQueue(ctx, tenant, actor, {}, now, site);
  const metrics = actor.role === 'manager' ? base.metrics : base.metrics.filter(m => !['variation_exposure', 'overdue_receivables'].includes(m.key));
  return ok({ ...base, metrics, attention: siteAttention(site, actor, now, s), followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
}

/** @returns {Promise<object|null>} null when the operation is not the workspace's */
export async function executeConstructionWorkspace(ctx, tenant, actor, a, now) {
  if (!CONSTRUCTION_WORKSPACE_OPERATIONS.has(a.operation)) return null;
  switch (a.operation) {
    case 'construction_followups': await refreshSite(ctx, tenant.accountId, now); return constructionFollowupQueue(ctx, tenant, actor, a, now);
    case 'construction_task_resolve': return resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now, SELF_CLOSING);
    case 'construction_task_snooze': return snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);
    case 'construction_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'construction_context': return context(ctx, tenant, actor, a, now);
    default: return fail('invalid_action');
  }
}
