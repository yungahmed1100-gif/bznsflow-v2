// Real Estate's measurement windows and follow-up rules. Every value is shown in
// Settings and named next to the KPI that uses it; nothing here sends a message.
import { domainSettings, RULE_MODES } from './workspace/settings.js';

export { RULE_MODES };
// Rules stay off until the owner saves them: an offset is a business decision, not a default.
const spec = domainSettings('realEstate',
  { viewingWindowDays: 14, closeWindowDaysRent: 30, closeWindowDaysSale: 90, lateCancelHours: 24, responseSlaMinutes: 60, commissionTermsDays: 30 },
  { viewingWindowDays: [1, 365], closeWindowDaysRent: [1, 730], closeWindowDaysSale: [1, 730], lateCancelHours: [0, 168], responseSlaMinutes: [5, 10080], commissionTermsDays: [0, 365] },
  { missing_requirements: 120, viewing_confirmation: 1440, post_viewing_decision: 1440 });

export const RULE_IDS = spec.RULE_IDS;
export const REAL_ESTATE_DEFAULTS = spec.DEFAULTS;
/** The saved values over the defaults; every rule is always present, in a fixed order. */
export const realEstateSettings = spec.read;
/** Merges a partial update. Returns null when any value is out of range. */
export const mergeRealEstateSettings = spec.merge;
