// Test Layla's simulated customer after one reply: the same field rules reply_commit applies to a
// live contact (sector validation, owner values never overwritten, one counted question, a declined
// name remembered, an appointment request recorded for reception). Pure; nothing is stored.
import { NAME_FIELD, mergeFields, qualificationPack, validateFieldValue } from './layla-qualification.js';

/**
 * @param {object} sim the simulated contact from the test context
 * @param {{ fields?: Record<string,string>, askedField?: string|null, declined?: string[] }} turn the checked model turn
 * @param {{ sectorId: string, catalog?: Array<object>, reception?: boolean, latest?: string, now?: number }} options
 */
export function previewOutcome(sim = {}, turn = {}, { sectorId, catalog = [], reception = false, latest = '', now = Date.now() } = {}) {
  const pack = qualificationPack(sectorId);
  const updates = Object.entries(turn.fields || {}).map(([key, value]) => ({ key, value: validateFieldValue(sectorId, key, value, catalog) })).filter(u => u.value)
    .map(u => { const row = u.key === 'service' ? catalog.find(r => [r.nameEn, r.nameAr].includes(u.value)) : null; return { ...u, confidence: 0.8, source: 'customer', ...(row?.entryKey ? { ref: row.entryKey } : {}) }; });
  const merged = mergeFields(sim.fields || [], updates, now);
  const proposed = typeof turn.fields?.[NAME_FIELD.key] === 'string' && /^[\p{L}][\p{L}' -]{1,39}$/u.test(turn.fields[NAME_FIELD.key].trim()) ? turn.fields[NAME_FIELD.key].trim() : '';
  const correction = proposed && sim.customerName && proposed !== sim.customerName && String(latest).toLocaleLowerCase().includes(proposed.toLocaleLowerCase());
  const customerName = proposed && (!sim.customerName || correction) ? proposed : sim.customerName || '';
  const nameDeclined = !!sim.nameDeclined || ((turn.declined || []).includes(NAME_FIELD.key) && !customerName);
  const counts = new Map((sim.askCounts || []).map(c => [c.key, c.count]));
  if (turn.askedField) counts.set(turn.askedField, (counts.get(turn.askedField) || 0) + 1);
  const service = merged.fields.find(f => f.key === 'service' && f.value), when = merged.fields.find(f => f.key === 'preferred_time' && f.value);
  const next = { ...sim, fields: merged.fields, customerName, nameDeclined, askCounts: [...counts].map(([key, count]) => ({ key, count })),
    ...(turn.askedField ? { asked: [turn.askedField], lastAskedAt: now } : {}),
    ...(reception && service ? { appointment: { service: service.value, ...(when ? { preferences: when.value } : {}) } } : {}) };
  const label = key => (key === NAME_FIELD.key ? { en: 'Name', ar: 'الاسم' } : (f => ({ en: f?.en || key, ar: f?.ar || key }))(pack.fields.find(f => f.key === key)));
  const captured = [...(customerName ? [{ key: NAME_FIELD.key, ...label(NAME_FIELD.key), value: customerName }] : []), ...merged.fields.filter(f => f.value).map(f => ({ key: f.key, ...label(f.key), value: f.value }))];
  return { sim: next, captured };
}
