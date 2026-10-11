// A dental clinic's visit defaults, measurement windows and follow-up rules (ascend/dental.md).
// The four rules start on in draft mode: Hasib writes the message, and nothing is sent until a
// manager approves it.
import { domainSettings } from './workspace/settings.js';

const spec = domainSettings('dental',
  { visitMinutes: 30, lateCancelHours: 24, balanceDueDays: 7, recallWindowDays: 30, chairDayMinutes: 480, openDaysPerWeek: 6 },
  { visitMinutes: [5, 480], lateCancelHours: [1, 168], balanceDueDays: [0, 90], recallWindowDays: [7, 180], chairDayMinutes: [60, 1440], openDaysPerWeek: [1, 7] },
  { visit_confirmation: 1440, missed_recovery: 120, recall: 20160, balance_due: 1440 },
  { enabled: true, mode: 'draft' });

export const DENTAL_RULE_IDS = spec.RULE_IDS;
export const DENTAL_DEFAULTS = spec.DEFAULTS;
export const dentalSettings = spec.read;
export const mergeDentalSettings = spec.merge;
