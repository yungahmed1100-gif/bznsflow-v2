// Construction's windows and follow-up rules (ascend/construction.md, "Follow-ups within Projects").
// Ahmed, 2026-10-12: a message stating a recorded fact (a certified balance and its due date) sends by
// itself; a variation is a contract change, so its reminder waits as a draft and its blockers are tasks.
import { domainSettings, AUTO_RULE_MODES } from './workspace/settings.js';

const spec = domainSettings('construction',
  { approvalWaitDays: 7, materialsLeadDays: 3 },
  { approvalWaitDays: [1, 90], materialsLeadDays: [0, 60] },
  { certified_balance_due: 1440, variation_decision: 4320, approval_blocker: 10080, milestone_dependency: 4320 },
  { certified_balance_due: { enabled: true, mode: 'auto' }, variation_decision: { enabled: true, mode: 'draft' }, approval_blocker: { enabled: true, mode: 'task' }, milestone_dependency: { enabled: true, mode: 'task' } },
  AUTO_RULE_MODES);

export const CONSTRUCTION_RULE_IDS = spec.RULE_IDS;
export const constructionSettings = spec.read;
export const mergeConstructionSettings = spec.merge;
