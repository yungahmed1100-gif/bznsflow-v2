// Real Estate's measurement windows and follow-up rules. Every value is shown in
// Settings and named next to the KPI that uses it; nothing here sends a message.

export const RULE_IDS = ['missing_requirements', 'viewing_confirmation', 'post_viewing_decision'];
export const RULE_MODES = ['task', 'draft'];
// Rules stay off until the owner saves them: an offset is a business decision, not a default.
const SUGGESTED_OFFSETS = { missing_requirements: 120, viewing_confirmation: 1440, post_viewing_decision: 1440 };

export const REAL_ESTATE_DEFAULTS = Object.freeze({
  viewingWindowDays: 14, closeWindowDaysRent: 30, closeWindowDaysSale: 90,
  lateCancelHours: 24, responseSlaMinutes: 60, commissionTermsDays: 30,
  rules: RULE_IDS.map(id => ({ id, enabled: false, mode: 'task', offsetMinutes: SUGGESTED_OFFSETS[id] })),
});

const LIMITS = {
  viewingWindowDays: [1, 365], closeWindowDaysRent: [1, 730], closeWindowDaysSale: [1, 730],
  lateCancelHours: [0, 168], responseSlaMinutes: [5, 10080], commissionTermsDays: [0, 365],
};
const OFFSET_LIMITS = [5, 43200];

/** The saved values over the defaults; every rule is always present, in a fixed order. */
export function realEstateSettings(settings = {}) {
  const saved = settings.realEstate || {};
  const rules = RULE_IDS.map(id => ({ ...REAL_ESTATE_DEFAULTS.rules.find(r => r.id === id), ...(saved.rules || []).find(r => r.id === id) }));
  return { ...REAL_ESTATE_DEFAULTS, ...saved, rules };
}

/** Merges a partial update. Returns null when any value is out of range. */
export function mergeRealEstateSettings(current, update) {
  if (!update || typeof update !== 'object') return null;
  const next = realEstateSettings({ realEstate: current });
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (update[key] === undefined) continue;
    if (!Number.isSafeInteger(update[key]) || update[key] < min || update[key] > max) return null;
    next[key] = update[key];
  }
  if (update.rules !== undefined) {
    if (!Array.isArray(update.rules) || update.rules.length > RULE_IDS.length) return null;
    for (const rule of update.rules) {
      if (!RULE_IDS.includes(rule?.id) || typeof rule.enabled !== 'boolean' || !RULE_MODES.includes(rule.mode)
        || !Number.isSafeInteger(rule.offsetMinutes) || rule.offsetMinutes < OFFSET_LIMITS[0] || rule.offsetMinutes > OFFSET_LIMITS[1]) return null;
      next.rules = next.rules.map(r => r.id === rule.id ? { id: rule.id, enabled: rule.enabled, mode: rule.mode, offsetMinutes: rule.offsetMinutes } : r);
    }
  }
  return next;
}
