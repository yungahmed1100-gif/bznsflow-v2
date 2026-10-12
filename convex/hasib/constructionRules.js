// Construction's four follow-up rules. Messages carry recorded facts only: the certificate reference,
// its certified balance and due date, the variation's reference, title and contract change. The
// internal cost effect of a variation (budgetDeltaMinor) is never put in front of the customer.
import { constructionSettings } from './constructionSettings.js';
import { greeting, localDay } from './workspace/text.js';

const MIN = 60000, DAY = 86400000, STALE_MS = 30 * DAY;
export const CONSTRUCTION_RULE_KINDS = Object.freeze({
  certified_balance_due: 'rule_certified_balance_due', variation_decision: 'rule_variation_decision', approval_blocker: 'rule_approval_blocker', milestone_dependency: 'rule_milestone_dependency',
});
export const CONSTRUCTION_RULE_TASK_KINDS = new Set(Object.values(CONSTRUCTION_RULE_KINDS));
const REASONS = {
  certified_balance_due: 'A certified payment is past its due date with a balance outstanding',
  variation_decision: 'A submitted variation is still waiting for the client’s decision',
  approval_blocker: 'A submitted variation has waited too long: it is holding the work up',
  milestone_dependency: 'A milestone is close to its planned finish and not complete',
};

/** What each enabled rule calls for right now. */
export function constructionRuleWanted({ projects, variations, claims, milestones, orders }, now, settings) {
  const rules = Object.fromEntries(constructionSettings(settings).rules.filter(r => r.enabled).map(r => [r.id, r]));
  const projectOf = new Map(projects.map(p => [String(p._id), p]));
  const out = [];
  const push = (rule, entityType, entity, dueAt, extra) => out.push({ rule, kind: CONSTRUCTION_RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt,
    reason: REASONS[rule.id], key: `${CONSTRUCTION_RULE_KINDS[rule.id]}:${entity._id}:${dueAt}`, ...extra });
  const fresh = at => now >= at && now - at <= STALE_MS;

  const balance = rules.certified_balance_due;
  if (balance) for (const c of claims) {
    const p = projectOf.get(String(c.projectId)), order = c.orderId ? orders.get(String(c.orderId)) : null;
    const owed = order ? Math.max(0, order.totalMinor - order.paidMinor) : 0;
    if (!p?.contactId || !['certified', 'part_paid'].includes(c.status) || !owed) continue;
    const at = c.dueAt + balance.offsetMinutes * MIN;
    if (fresh(at)) push(balance, 'claim', c, at, { project: p, claim: c, balanceMinor: owed, contactId: p.contactId, assignedAccountId: p.assignedAccountId });
  }
  for (const v of variations) {
    if (v.status !== 'submitted' || !v.submittedAt) continue;
    const p = projectOf.get(String(v.projectId));
    if (!p) continue;
    const decision = rules.variation_decision;
    if (decision && p.contactId && !v.customerApproval) {
      const at = v.submittedAt + decision.offsetMinutes * MIN;
      if (fresh(at)) push(decision, 'variation', v, at, { project: p, variation: v, contactId: p.contactId, assignedAccountId: p.assignedAccountId });
    }
    const blocker = rules.approval_blocker;
    if (blocker) {
      const at = v.submittedAt + blocker.offsetMinutes * MIN;
      if (now >= at) push({ ...blocker, mode: 'task' }, 'variation', v, at, { project: p, assignedAccountId: p.assignedAccountId });
    }
  }
  const dependency = rules.milestone_dependency;
  if (dependency) for (const m of milestones) {
    const p = projectOf.get(String(m.projectId));
    if (!p || m.actualProgressBps >= 10000 || !m.plannedFinishAt || m.plannedFinishAt <= now - STALE_MS) continue;
    const at = m.plannedFinishAt - dependency.offsetMinutes * MIN;
    if (now >= at) push({ ...dependency, mode: 'task' }, 'milestone', m, at, { project: p, assignedAccountId: p.assignedAccountId });
  }
  return out;
}

const omr = (minor, arabic) => `${(minor / 1000).toFixed(3)} ${arabic ? 'ر.ع.' : 'OMR'}`;

/** A rule's draft from the recorded facts only. */
export function constructionDraftText(item, { name, timezone, arabic }) {
  const hello = greeting(name, arabic), p = item.project;
  if (item.rule.id === 'certified_balance_due') {
    const c = item.claim;
    return arabic ? `${hello} شهادة الدفع ${c.reference} لمشروع ${p.title} مستحقة منذ ${localDay(c.dueAt, timezone)}، والرصيد المتبقي ${omr(item.balanceMinor, true)}.`
      : `${hello} payment certificate ${c.reference} for ${p.title} was due on ${localDay(c.dueAt, timezone)}. The balance outstanding is ${omr(item.balanceMinor, false)}.`;
  }
  const v = item.variation;
  return arabic ? `${hello} أمر التغيير ${v.reference} «${v.title}» لمشروع ${p.title} بقيمة ${omr(v.contractDeltaMinor, true)} بانتظار قرارك.`
    : `${hello} variation ${v.reference}, "${v.title}", on ${p.title} for ${omr(v.contractDeltaMinor, false)} is waiting for your decision.`;
}
