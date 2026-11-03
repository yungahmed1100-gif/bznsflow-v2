// An AC service business's windows and follow-up rules (ascend/hvac.md, "Follow-ups within Jobs").
// As in the workshop: a message built only from recorded facts (a booked visit window, a finished
// job) sends by itself; anything that asks the customer to decide (an estimate, a service, a
// renewal, a balance) waits as a draft; a risk (parts late, a visit with no arrival) is a task.
import { domainSettings, AUTO_RULE_MODES } from './workspace/settings.js';

const spec = domainSettings('hvac',
  { arrivalGraceMinutes: 30, repeatWindowDays: 30, estimateWindowDays: 14, bookingWindowDays: 7, renewalHorizonDays: 60, renewalGraceDays: 14, amcVisitLeadDays: 14, autoQuoteLimitMinor: 0 },
  { arrivalGraceMinutes: [0, 240], repeatWindowDays: [7, 90], estimateWindowDays: [1, 60], bookingWindowDays: [1, 30], renewalHorizonDays: [7, 120], renewalGraceDays: [0, 60],
    amcVisitLeadDays: [1, 60],
    // 0 = off. Hasib sends an estimate by himself only when every line is the catalog's fixed price, within this.
    autoQuoteLimitMinor: [0, 100000000] },
  { visit_reminder: 1440, job_complete: 30, estimate_followup: 2880, service_due: 10080, amc_renewal: 43200, balance_due: 4320, parts_delay: 1440, visit_unrecorded: 60 },
  { visit_reminder: { enabled: true, mode: 'auto' }, job_complete: { enabled: true, mode: 'auto' }, estimate_followup: { enabled: true, mode: 'draft' },
    service_due: { enabled: true, mode: 'draft' }, amc_renewal: { enabled: true, mode: 'draft' }, balance_due: { enabled: true, mode: 'draft' },
    parts_delay: { enabled: true, mode: 'task' }, visit_unrecorded: { enabled: true, mode: 'task' } },
  AUTO_RULE_MODES);

export const MAX_AREAS = 30;
const area = value => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '';

export const HVAC_RULE_IDS = spec.RULE_IDS;
export const HVAC_DEFAULTS = Object.freeze({ ...spec.DEFAULTS, serviceAreas: [] });
/** The saved settings over the defaults; no service areas means every area is served. */
export const hvacSettings = (settings = {}) => ({ ...spec.read(settings), serviceAreas: settings.hvac?.serviceAreas || [] });
/** Merges a partial update; the service areas are a short list of place names. Null when anything is out of range. */
export function mergeHvacSettings(current, update) {
  const { serviceAreas, ...rest } = update || {};
  const merged = spec.merge(current, rest);
  if (!merged) return null;
  if (serviceAreas === undefined) return { ...merged, serviceAreas: current?.serviceAreas || [] };
  if (!Array.isArray(serviceAreas) || serviceAreas.length > MAX_AREAS) return null;
  const areas = [...new Set(serviceAreas.map(area).filter(Boolean))];
  return areas.length === serviceAreas.length ? { ...merged, serviceAreas: areas } : null;
}
/** Outside the business's service areas (none set means everywhere is served). */
export const outsideAreas = (s, value) => !!value && s.serviceAreas.length > 0 && !s.serviceAreas.some(a => a.toLowerCase() === String(value).trim().toLowerCase());
