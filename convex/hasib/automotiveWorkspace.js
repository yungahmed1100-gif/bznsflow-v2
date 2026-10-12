// The six-tab Workshop's own operations: the Needs attention counts, Follow-ups, rule drafts the
// manager approves, and the work card beside a chat. The workshop's records stay with
// automotiveState.js; this only reads them, opens tasks and drafts, and sends through the kit.
import { owned } from '../blueTenant.js';
import { ok, fail } from './shared.js';
import { approveDraft, draftRefusal } from './workspace/drafts.js';
import { publicRow } from './workspace/rows.js';
import { ensureAutomation } from './workspace/schedule.js';
import { refreshWorkshop, loadWorkshop, workshopAttention } from './automotiveBoard.js';
import { automotiveFollowupQueue, resolveAutomotiveTask, snoozeAutomotiveTask, automotiveContext } from './automotiveFollowups.js';

export const AUTOMOTIVE_WORKSPACE_OPERATIONS = new Set(['automotive_followups', 'automotive_task_resolve', 'automotive_task_snooze', 'automotive_draft_approve', 'automotive_context']);

// What Layla, Hasib or Adiba may do in the workshop by themselves: read the records, take in an
// appointment request, issue an estimate the owner (or the service list) priced, and record the
// customer's yes to it. Never payments, cancellations, quality checks, parts or the vehicle's stages.
export const AUTOMOTIVE_AUTOMATION_ALLOWED = new Set(['automotive_overview', 'automotive_work_orders', 'automotive_work_order', 'automotive_estimates', 'automotive_request_save',
  'automotive_estimate_save', 'automotive_estimate_status', 'automotive_approval_record', 'automotive_followups', 'automotive_context']);

async function draftApprove(ctx, tenant, actor, a, now) {
  if (actor.role !== 'manager') return fail('manager_required');
  const row = await owned(ctx, a.draftId, tenant.accountId, 'automotiveDrafts'), refusal = draftRefusal(row, a);
  if (refusal) return fail(refusal);
  const saved = await approveDraft(ctx, tenant, actor, { row, keyPrefix: 'automotive-draft', handoffReason: 'workshop_follow_up', taskTable: 'automotiveTasks',
    links: async d => ({ messageLinks: { automotiveDraftId: d._id }, recipientLinks: { automotiveDraftId: d._id }, contactId: d.contactId }) }, now);
  return ok(publicRow(saved));
}

/**
 * The workshop overview with what the six-tab strip and Work badge read. It only reads: tasks and
 * drafts are refreshed by Hasib's run every five minutes and when Follow-ups opens, so a busy
 * workshop's dashboard stays cheap.
 */
export async function workshopOverview(ctx, tenant, actor, base, now) {
  const shop = await loadWorkshop(ctx, tenant.accountId);
  await ensureAutomation(ctx, tenant.accountId, 'automotive', true, now);
  const queue = await automotiveFollowupQueue(ctx, tenant, actor, {}, now, shop);
  return ok({ ...base, attention: workshopAttention(shop, actor, now), followups: { counts: queue.value.counts, actionable: queue.value.actionable } });
}

/** @returns {Promise<object|null>} null when the operation is not the workspace's */
export async function executeAutomotiveWorkspace(ctx, tenant, actor, a, now) {
  if (!AUTOMOTIVE_WORKSPACE_OPERATIONS.has(a.operation)) return null;
  switch (a.operation) {
    case 'automotive_followups': await refreshWorkshop(ctx, tenant.accountId, now); return automotiveFollowupQueue(ctx, tenant, actor, a, now);
    case 'automotive_task_resolve': return resolveAutomotiveTask(ctx, tenant, actor, a, now);
    case 'automotive_task_snooze': return snoozeAutomotiveTask(ctx, tenant, actor, a, now);
    case 'automotive_draft_approve': return draftApprove(ctx, tenant, actor, a, now);
    case 'automotive_context': return automotiveContext(ctx, tenant, actor, a, now);
    default: return fail('invalid_action');
  }
}
