// Insights plumbing the sector workspaces share: the selectable period, the breakdown table and
// the contact names a drill-down shows. Every metric's own population stays in its sector.
import { periodRange, PERIODS } from '../period.js';
import { displayName } from '../../blueContacts.js';

/** The chosen period; "today" and anything unknown fall back to the last 30 days. */
export const insightsPeriod = (a, now, tz) => periodRange(PERIODS.includes(a.period) && a.period !== 'today' ? a.period : '30d', now, tz);

/**
 * One row per segment key, with each metric's value, numerator and denominator inside that segment.
 * @param {string[]} ids the metrics in the table
 * @param {Record<string, object[]>} pops each metric's population rows
 * @param {(row:object) => string} keyOf the row's segment key
 * @param {(id:string, rows:object[]) => {value, numerator, denominator}} summarize the sector's summary
 * @param {(id:string, rows:object[]) => object[]} [slice] lets a metric carry extra population fields into its slice
 */
export function segmentRows(ids, pops, keyOf, summarize, slice = (id, rows) => rows) {
  const keys = new Set();
  for (const id of ids) for (const r of pops[id]) keys.add(keyOf(r));
  return [...keys].sort().map(key => ({ key, values: Object.fromEntries(ids.map(id => [id, (({ value, numerator, denominator }) => ({ value, numerator, denominator }))(summarize(id, slice(id, pops[id].filter(r => keyOf(r) === key))))])) }));
}

/** A cached lookup of a contact's display name (null for an erased contact). */
export function contactNames(ctx) {
  const names = new Map();
  return async id => {
    if (!id) return null;
    if (!names.has(String(id))) { const c = await ctx.db.get(id); names.set(String(id), c?.state === 'active' ? displayName(c).name : null); }
    return names.get(String(id));
  };
}
