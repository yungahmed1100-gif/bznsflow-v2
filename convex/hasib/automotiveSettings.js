// Automotive's windows and follow-up rules (ascend/automotive.md, "Follow-ups within Workshop").
// Ahmed, 2026-10-12: as in Media, a message built only from recorded facts sends by itself; anything
// that asks the customer to decide waits as a draft, and a promise at risk is the team's task.
import { domainSettings, AUTO_RULE_MODES } from './workspace/settings.js';

const spec = domainSettings('automotive',
  { approvalWaitHours: 24, readyUncollectedHours: 24, autoQuoteLimitMinor: 0 },
  { approvalWaitHours: [1, 720], readyUncollectedHours: [1, 720],
    // 0 = off. Hasib sends an estimate by himself only when every line is priced from the service list or a part's fixed price, within this.
    autoQuoteLimitMinor: [0, 100000000] },
  { ready_for_collection: 30, estimate_reminder: 1440, service_due: 10080, promise_risk: 120 },
  { ready_for_collection: { enabled: true, mode: 'auto' }, estimate_reminder: { enabled: true, mode: 'draft' }, service_due: { enabled: true, mode: 'draft' }, promise_risk: { enabled: true, mode: 'task' } },
  AUTO_RULE_MODES);

export const AUTOMOTIVE_RULE_IDS = spec.RULE_IDS;
export const AUTOMOTIVE_DEFAULTS = spec.DEFAULTS;
export const automotiveSettings = spec.read;
export const mergeAutomotiveSettings = spec.merge;
