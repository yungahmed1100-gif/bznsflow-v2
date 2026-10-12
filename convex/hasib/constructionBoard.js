// Construction's shared reads for the six-tab Projects: the live projects and what hangs on them,
// read once and bounded; the tasks they call for (each closes itself once its cause is gone); and
// the rule drafts. Every write goes through the kit; nothing here sends.
import { owned } from '../blueTenant.js';
import { ensureAutomation } from './workspace/schedule.js';
import { reconcileTasks } from './workspace/tasks.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { conversationOf } from './workspace/conversation.js';
import { settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { constructionSettings } from './constructionSettings.js';
import { constructionRuleWanted, constructionDraftText, CONSTRUCTION_RULE_TASK_KINDS } from './constructionRules.js';

const DAY = 86400000, CAP = 300, MAX_NEW_TASKS = 100, ARABIC = /[؀-ۿ]/;
const LIVE = ['tender', 'quoted', 'awarded', 'active', 'practical_completion', 'defects_liability'];
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const CONSTRUCTION_AUTO_TASKS = new Set(['materials_due', 'receivable_overdue', ...CONSTRUCTION_RULE_TASK_KINDS]);

const byStatus = (ctx, table, accountId, statuses, limit = CAP) => Promise.all(statuses.map(status => ctx.db.query(table).withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', status)).order('desc').take(limit))).then(r => r.flat());

/** The live contracting business, bounded however long its history. */
export async function loadSite(ctx, accountId, now = Date.now()) {
  const projects = await byStatus(ctx, 'constructionProjects', accountId, LIVE);
  const live = new Set(projects.map(p => String(p._id)));
  const variations = (await byStatus(ctx, 'constructionVariations', accountId, ['draft', 'submitted'])).filter(v => live.has(String(v.projectId)));
  const claims = (await byStatus(ctx, 'constructionClaims', accountId, ['certified', 'part_paid'])).filter(c => live.has(String(c.projectId)));
  const commitments = (await byStatus(ctx, 'constructionCommitments', accountId, ['approved', 'ordered'])).filter(c => live.has(String(c.projectId)));
  // Milestones finishing within the rules' reach (a month either side), through the finish index: one bounded read.
  const active = new Set(projects.filter(p => p.status === 'active').map(p => String(p._id)));
  const milestones = (await ctx.db.query('constructionMilestones').withIndex('by_account_finish', q => q.eq('accountId', accountId).gte('plannedFinishAt', now - 30 * DAY).lte('plannedFinishAt', now + 30 * DAY)).take(500))
    .filter(m => active.has(String(m.projectId)));
  const drafts = await ctx.db.query('constructionDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(500);
  const orders = new Map();
  for (const c of claims) if (c.orderId) orders.set(String(c.orderId), await owned(ctx, c.orderId, accountId, 'hasibOrders'));
  return { projects, variations, claims, commitments, milestones, drafts, orders };
}

function currentTasks(site, now, s) {
  const wanted = [], add = (kind, entityType, entity, reason, dueAt, assignedAccountId) => wanted.push({ kind, entityType, entityId: String(entity._id), reason, dueAt, assignedAccountId });
  const projectOf = new Map(site.projects.map(p => [String(p._id), p]));
  for (const c of site.commitments) {
    if (c.deliveredAt || !c.requiredAt || c.requiredAt - s.materialsLeadDays * DAY > now) continue;
    add('materials_due', 'commitment', c, `${c.label} from ${c.supplier} is needed on site and not delivered yet`, c.requiredAt - s.materialsLeadDays * DAY, projectOf.get(String(c.projectId))?.assignedAccountId);
  }
  for (const c of site.claims) {
    const order = c.orderId ? site.orders.get(String(c.orderId)) : null;
    if (c.dueAt < now && order && order.totalMinor > order.paidMinor) add('receivable_overdue', 'claim', c, `Certificate ${c.reference} is past due with a balance outstanding`, c.dueAt, projectOf.get(String(c.projectId))?.assignedAccountId);
  }
  return wanted;
}

async function insertRuleDraft(ctx, accountId, item, timezone, now) {
  const contact = await ctx.db.get(item.contactId);
  if (!contact) return;
  const { conversation } = await conversationOf(ctx, accountId, item.contactId);
  const last = conversation ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in')).order('desc').first() : null;
  const name = contact.state === 'active' ? displayName(contact).name : '';
  const text = constructionDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', timezone, arabic: last?.text ? ARABIC.test(last.text) : true });
  await ctx.db.insert('constructionDrafts', { accountId, requestId: `rule:${item.key}`, projectId: item.project._id, contactId: item.contactId, ...(conversation ? { conversationId: conversation._id } : {}),
    kind: item.rule.id, text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Brings tasks and rule drafts up to date with the records. */
export async function refreshSite(ctx, accountId, now) {
  const site = await loadSite(ctx, accountId, now), base = await settingsFor(ctx, accountId), s = constructionSettings(base), timezone = await businessTimezone(ctx, accountId);
  const wanted = currentTasks(site, now, s);
  const rules = constructionRuleWanted(site, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt, assignedAccountId: item.assignedAccountId });
  wanted.sort((x, y) => (x.dueAt || 0) - (y.dueAt || 0));
  await reconcileTasks(ctx, { table: 'constructionTasks', accountId, wanted, maxNew: MAX_NEW_TASKS, autoKinds: CONSTRUCTION_AUTO_TASKS, ruleKinds: CONSTRUCTION_RULE_TASK_KINDS, now });
  await reconcileRuleDrafts(ctx, { rules, drafts: site.drafts, insert: item => insertRuleDraft(ctx, accountId, item, timezone, now), now });
  await ensureAutomation(ctx, accountId, 'construction', true, now);
  return { site: { ...site, drafts: await ctx.db.query('constructionDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(500) }, settings: s, timezone };
}

/** The counts the Needs attention strip reads. Money stays with the manager. */
export function siteAttention(site, actor, now, s) {
  const manager = actor.role === 'manager';
  return {
    atRisk: site.projects.filter(p => p.status === 'active' && p.forecastFinishAt > p.contractFinishAt).length,
    approvalsOverdue: site.variations.filter(v => v.status === 'submitted' && v.submittedAt && v.submittedAt + s.approvalWaitDays * DAY <= now).length,
    materialsDue: site.commitments.filter(c => !c.deliveredAt && c.requiredAt && c.requiredAt - s.materialsLeadDays * DAY <= now).length,
    receivablesOverdue: manager ? site.claims.filter(c => c.dueAt < now && (site.orders.get(String(c.orderId))?.totalMinor || 0) > (site.orders.get(String(c.orderId))?.paidMinor || 0)).length : 0,
    approvals: manager ? site.drafts.filter(d => d.status === 'draft').length : 0,
  };
}
