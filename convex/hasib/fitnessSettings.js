// Fitness's measurement windows and follow-up rules (ascend/fitness.md). The three rules start on
// in draft mode: Hasib writes the message, and nothing is sent until a manager approves it.
import { domainSettings } from './workspace/settings.js';

const spec = domainSettings('fitness',
  { conversionWindowDays: 14, gapDays: 14, minObservationDays: 14, renewalNoticeDays: 14 },
  { conversionWindowDays: [1, 90], gapDays: [1, 90], minObservationDays: [0, 90], renewalNoticeDays: [1, 90] },
  { trial_reminder: 1440, attendance_gap: 60, renewal: 10080 },
  { enabled: true, mode: 'draft' });

export const FITNESS_RULE_IDS = spec.RULE_IDS;
export const FITNESS_DEFAULTS = spec.DEFAULTS;
export const fitnessSettings = spec.read;
export const mergeFitnessSettings = spec.merge;
