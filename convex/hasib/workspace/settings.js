// A sector's measurement windows and follow-up rules: defaults, saved values and range checks.
// Rules stay off until the owner saves them, unless a sector writes harmless drafts by default.

export const RULE_MODES = ['task', 'draft'];
// A sector that lets rule messages send themselves (built only from recorded facts) offers 'auto' too.
export const AUTO_RULE_MODES = ['task', 'draft', 'auto'];
const OFFSET_LIMITS = [5, 43200];

/**
 * @param {string} key the hasibSettings field (e.g. 'realEstate', 'media')
 * @param {object} defaults numeric window defaults
 * @param {Record<string,[number,number]>} limits inclusive range per window
 * @param {Record<string,number>} offsets suggested offset (minutes) per rule id, in display order
 * @param {{enabled:boolean, mode:string} | Record<string,{enabled:boolean, mode:string}>} [ruleDefault] how an unsaved rule starts
 *   (off, task mode); an object keyed by rule id sets each rule's own default
 * @param {string[]} [modes] the modes this sector accepts (RULE_MODES, or AUTO_RULE_MODES)
 */
export function domainSettings(key, defaults, limits, offsets, ruleDefault = { enabled: false, mode: 'task' }, modes = RULE_MODES) {
  const ruleIds = Object.keys(offsets);
  const startOf = id => ('mode' in ruleDefault ? ruleDefault : ruleDefault[id] || { enabled: false, mode: 'task' });
  const DEFAULTS = Object.freeze({ ...defaults, rules: ruleIds.map(id => ({ id, ...startOf(id), offsetMinutes: offsets[id] })) });
  /** The saved values over the defaults; every rule is always present, in a fixed order. */
  const read = (settings = {}) => {
    const saved = settings[key] || {};
    const rules = ruleIds.map(id => ({ ...DEFAULTS.rules.find(r => r.id === id), ...(saved.rules || []).find(r => r.id === id) }));
    return { ...DEFAULTS, ...saved, rules };
  };
  /** Merges a partial update. Returns null when any value is out of range. */
  const merge = (current, update) => {
    if (!update || typeof update !== 'object') return null;
    const next = read({ [key]: current });
    for (const [field, [min, max]] of Object.entries(limits)) {
      if (update[field] === undefined) continue;
      if (!Number.isSafeInteger(update[field]) || update[field] < min || update[field] > max) return null;
      next[field] = update[field];
    }
    if (update.rules !== undefined) {
      if (!Array.isArray(update.rules) || update.rules.length > ruleIds.length) return null;
      for (const rule of update.rules) {
        if (!ruleIds.includes(rule?.id) || typeof rule.enabled !== 'boolean' || !modes.includes(rule.mode)
          || !Number.isSafeInteger(rule.offsetMinutes) || rule.offsetMinutes < OFFSET_LIMITS[0] || rule.offsetMinutes > OFFSET_LIMITS[1]) return null;
        next.rules = next.rules.map(r => r.id === rule.id ? { id: rule.id, enabled: rule.enabled, mode: rule.mode, offsetMinutes: rule.offsetMinutes } : r);
      }
    }
    return next;
  };
  return { DEFAULTS, RULE_IDS: ruleIds, MODES: modes, read, merge };
}
