// Automotive's shared reads for the six-tab Workshop: the workshop's records read once, the tasks
// they call for (each closes itself once its cause is gone), the rule drafts, and the estimates
// Adiba turns into offers for the customer. Every write here goes through the kit; nothing sends.
import { owned } from '../blueTenant.js';
import { ensureAutomation } from './workspace/schedule.js';
import { reconcileTasks } from './workspace/tasks.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { conversationOf } from './workspace/conversation.js';
import { settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { automotiveSettings } from './automotiveSettings.js';
import { automotiveRuleWanted, automotiveDraftText, latestEstimates, AUTOMOTIVE_RULE_TASK_KINDS } from './automotiveRules.js';

const SCAN = 500, MAX_NEW_TASKS = 100, HOUR = 3600000, ARABIC = /[؀-ۿ]/;
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const AUTOMOTIVE_AUTO_TASKS = new Set(['appointment_request', 'approval_waiting', 'past_promise', 'ready_uncollected', 'parts_blocking', ...AUTOMOTIVE_RULE_TASK_KINDS]);
const DONE = new Set(['collected', 'closed', 'cancelled']);

const scan = (ctx, table, accountId, index = 'by_account_created', limit = SCAN) => ctx.db.query(table).withIndex(index, q => q.eq('accountId', accountId)).order('desc').take(limit);
const byStatus = (ctx, table, accountId, statuses, limit) => Promise.all(statuses.map(status => ctx.db.query(table).withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', status)).order('desc').take(limit))).then(r => r.flat());
// Follow-ups are about live work: the active stages, read through their index and capped, never the archive.
const ACTIVE = ['intake', 'inspection', 'awaiting_approval', 'approved', 'in_progress', 'quality_check', 'ready'];
const ACTIVE_CAP = 300;

/** The live workshop the follow-ups read, once, bounded however large the history is. */
export async function loadWorkshop(ctx, accountId) {
  const workOrders = await byStatus(ctx, 'automotiveWorkOrders', accountId, ACTIVE, ACTIVE_CAP);
  const estimates = await byStatus(ctx, 'automotiveEstimates', accountId, ['draft', 'issued'], ACTIVE_CAP);
  const parts = (await Promise.all(workOrders.filter(w => w.status === 'in_progress').map(w => ctx.db.query('automotivePartAllocations').withIndex('by_work_order', q => q.eq('workOrderId', w._id)).take(50)))).flat();
  const requests = await byStatus(ctx, 'automotiveRequests', accountId, ['new'], 200);
  const [vehicles, drafts] = [await scan(ctx, 'automotiveVehicles', accountId, 'by_account_created', 500), await scan(ctx, 'automotiveDrafts', accountId, 'by_account_created', 500)];
  const orders = new Map();
  // The ready message states the balance, so only ready work needs its charge read.
  for (const w of workOrders) if (w.orderId && w.status === 'ready') orders.set(String(w.orderId), await owned(ctx, w.orderId, accountId, 'hasibOrders'));
  return { workOrders, estimates, vehicles, parts, requests, drafts, orders };
}

/** Technicians see their own work; managers and service advisors see the workshop. */
export const canSeeWork = (actor, w) => !(actor.role === 'employee' && actor.operationalRole === 'technician') || String(w.technicianAccountId) === String(actor.actorAccountId);

function currentTasks(shop, now, s) {
  const wanted = [], add = (kind, entityType, entity, reason, dueAt, assignedAccountId) => wanted.push({ kind, entityType, entityId: String(entity._id), reason, dueAt, assignedAccountId });
  const latest = latestEstimates(shop.estimates);
  for (const r of shop.requests) if (r.status === 'new') add('appointment_request', 'request', r, r.source === 'layla' ? 'New request from Layla: offer the customer a slot' : 'New appointment request: offer a slot', r.createdAt, r.assignedAccountId);
  for (const w of shop.workOrders) {
    if (DONE.has(w.status)) continue;
    const e = latest.get(String(w._id)), advisor = w.assignedAdvisorAccountId;
    if (w.status === 'awaiting_approval' && e?.status === 'issued' && (e.issuedAt || e.createdAt) + s.approvalWaitHours * HOUR <= now)
      add('approval_waiting', 'work_order', w, `Estimate ${e.estimateNumber} has waited ${s.approvalWaitHours} hours for the customer’s approval`, (e.issuedAt || e.createdAt) + s.approvalWaitHours * HOUR, advisor);
    if (w.promisedAt && w.promisedAt < now && w.status !== 'ready') add('past_promise', 'work_order', w, 'The promised time has passed and the vehicle is not ready', w.promisedAt, advisor);
    if (w.status === 'ready' && w.readyAt && w.readyAt + s.readyUncollectedHours * HOUR <= now)
      add('ready_uncollected', 'work_order', w, `Ready for ${s.readyUncollectedHours} hours and not collected yet`, w.readyAt + s.readyUncollectedHours * HOUR, advisor);
    if (w.status === 'in_progress' && shop.parts.some(p => String(p.workOrderId) === String(w._id) && p.status === 'requested'))
      add('parts_blocking', 'work_order', w, 'A part is requested but not reserved: the job is waiting on it', w.updatedAt, w.technicianAccountId);
  }
  return wanted;
}

/** A rule draft in the customer's language, from the records only. */
async function insertRuleDraft(ctx, accountId, item, timezone, now) {
  const contact = await ctx.db.get(item.contactId);
  if (!contact) return;
  const { conversation } = await conversationOf(ctx, accountId, item.contactId);
  const last = conversation ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in')).order('desc').first() : null;
  const name = contact.state === 'active' ? displayName(contact).name : '';
  const text = automotiveDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', timezone, arabic: last?.text ? ARABIC.test(last.text) : true });
  await ctx.db.insert('automotiveDrafts', { accountId, requestId: `rule:${item.key}`, ...(item.workOrder ? { workOrderId: item.workOrder._id } : {}), ...(item.vehicle ? { vehicleId: item.vehicle._id } : {}),
    contactId: item.contactId, ...(conversation ? { conversationId: conversation._id } : {}), kind: item.rule.id, text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Brings tasks and rule drafts up to date with the records. */
export async function refreshWorkshop(ctx, accountId, now) {
  const shop = await loadWorkshop(ctx, accountId), base = await settingsFor(ctx, accountId), s = automotiveSettings(base), timezone = await businessTimezone(ctx, accountId);
  const wanted = currentTasks(shop, now, s);
  const rules = automotiveRuleWanted(shop, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt, assignedAccountId: item.assignedAccountId });
  // The most pressing first, and a bounded number per refresh: a backlog opens over a few runs, not in one write.
  wanted.sort((x, y) => (x.dueAt || 0) - (y.dueAt || 0));
  await reconcileTasks(ctx, { table: 'automotiveTasks', accountId, wanted, maxNew: MAX_NEW_TASKS, autoKinds: AUTOMOTIVE_AUTO_TASKS, ruleKinds: AUTOMOTIVE_RULE_TASK_KINDS, now });
  await reconcileRuleDrafts(ctx, { rules, drafts: shop.drafts, insert: item => insertRuleDraft(ctx, accountId, item, timezone, now), now });
  await ensureAutomation(ctx, accountId, 'automotive', true, now);
  return { shop: { ...shop, drafts: await scan(ctx, 'automotiveDrafts', accountId, 'by_account_created', 500) }, settings: s, timezone };
}

/** The counts the Needs attention strip reads. */
export function workshopAttention(shop, actor, now) {
  const mine = shop.workOrders.filter(w => canSeeWork(actor, w) && !DONE.has(w.status)), latest = latestEstimates(shop.estimates);
  return {
    awaitingApproval: mine.filter(w => w.status === 'awaiting_approval' && latest.get(String(w._id))?.status === 'issued').length,
    pastPromise: mine.filter(w => w.promisedAt && w.promisedAt < now && w.status !== 'ready').length,
    partsNeeded: mine.filter(w => shop.parts.some(p => String(p.workOrderId) === String(w._id) && ['requested', 'reserved'].includes(p.status))).length,
    ready: mine.filter(w => w.status === 'ready').length,
    requests: actor.operationalRole === 'technician' ? 0 : shop.requests.filter(r => r.status === 'new').length,
    approvals: actor.role === 'manager' ? shop.drafts.filter(d => d.status === 'draft').length : 0,
  };
}
