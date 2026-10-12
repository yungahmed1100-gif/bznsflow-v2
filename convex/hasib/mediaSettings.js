// Media's measurement windows, production defaults and follow-up rules (ascend/media.md).
// Every value is shown in Settings → Follow-up rules and named next to the KPI that uses it.
import { domainSettings, AUTO_RULE_MODES } from './workspace/settings.js';

const spec = domainSettings('media',
  { quoteWindowDays: 30, revisionWindowDays: 60, prepCutoffHours: 48, reviewResponseHours: 72, revisionAllowance: 2, depositPercent: 20, extraRoundPriceMinor: 25000, resourceHoursPerDay: 8, holdHours: 48, autoQuoteLimitMinor: 0 },
  { quoteWindowDays: [1, 365], revisionWindowDays: [1, 365], prepCutoffHours: [1, 720], reviewResponseHours: [1, 720], revisionAllowance: [0, 20], depositPercent: [0, 100], extraRoundPriceMinor: [0, 100000000], resourceHoursPerDay: [1, 24], holdHours: [1, 720],
    // 0 = off. Hasib quotes by himself only when every line has a fixed catalog price and the total is within this.
    autoQuoteLimitMinor: [0, 100000000] },
  { prep_request: 2880, cut_approval: 720, delivery_balance: 1440 },
  // Ahmed, 2026-10-12: a new studio sends these by itself; each message is built only from recorded facts.
  { prep_request: { enabled: true, mode: 'auto' }, cut_approval: { enabled: true, mode: 'auto' }, delivery_balance: { enabled: true, mode: 'auto' } },
  AUTO_RULE_MODES);

export const MEDIA_RULE_IDS = spec.RULE_IDS;
export const MEDIA_DEFAULTS = spec.DEFAULTS;
export const mediaSettings = spec.read;
export const mergeMediaSettings = spec.merge;

/**
 * A studio always runs on Hasib's schedule: even with every rule off, Adiba drafts the quotes and
 * extra-scope offers that need the owner. Auto settings decide only what is sent without the owner.
 */
export const mediaNeedsAutomation = () => true;
