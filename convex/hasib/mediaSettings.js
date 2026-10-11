// Media's measurement windows, production defaults and follow-up rules (ascend/media.md).
// Every value is shown in Settings → Follow-up rules and named next to the KPI that uses it.
import { domainSettings } from './workspace/settings.js';

const spec = domainSettings('media',
  { quoteWindowDays: 30, revisionWindowDays: 60, prepCutoffHours: 48, reviewResponseHours: 72, revisionAllowance: 2, depositPercent: 20, extraRoundPriceMinor: 25000, resourceHoursPerDay: 8, holdHours: 48 },
  { quoteWindowDays: [1, 365], revisionWindowDays: [1, 365], prepCutoffHours: [1, 720], reviewResponseHours: [1, 720], revisionAllowance: [0, 20], depositPercent: [0, 100], extraRoundPriceMinor: [0, 100000000], resourceHoursPerDay: [1, 24], holdHours: [1, 720] },
  { prep_request: 2880, cut_approval: 720, delivery_balance: 1440 });

export const MEDIA_RULE_IDS = spec.RULE_IDS;
export const MEDIA_DEFAULTS = spec.DEFAULTS;
export const mediaSettings = spec.read;
export const mergeMediaSettings = spec.merge;
