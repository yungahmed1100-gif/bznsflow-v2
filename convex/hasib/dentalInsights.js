// Dental Insights (ascend/dental.md, "KPI definitions"): four headline cards and four diagnostics.
// Each metric names its numerator, denominator, window and coverage; an empty population is "no
// eligible records", never 0%. Charges recorded as orders with no visit behind them (the clinic's
// older records) are disclosed as coverage, never counted as attendance. Drill-down returns the
// exact population.
import { ok, fail, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange, PERIODS } from './period.js';
import { displayName } from '../blueContacts.js';
import { rate, summarizeRows, weeks } from './workspace/metrics.js';
import { dentalSettings } from './dentalSettings.js';
import { loadClinic, refreshClinic, hourOf } from './dentalClinic.js';
import { DAY, MIN, outcomeUnknown, balanceOf, balanceOverdue, CLOSED_ORDERS, timeOfDay } from './dentalDomain.js';

export const DENTAL_HEADLINE = ['visit_attendance', 'missed_visits', 'followups_due', 'overdue_balances'];
export const DENTAL_DIAGNOSTIC = ['chair_utilization', 'late_cancellation', 'recall_completion', 'charge_collection'];
export const DENTAL_SEGMENTS = ['provider', 'service_group', 'patient_type', 'time_of_day'];
const MONEY = new Set(['overdue_balances', 'charge_collection']);
const KIND = { visit_attendance: 'rate', missed_visits: 'count', followups_due: 'count', overdue_balances: 'money', chair_utilization: 'rate', late_cancellation: 'rate', recall_completion: 'rate', charge_collection: 'rate' };
const AS_OF_NOW = new Set(['followups_due', 'overdue_balances']);
const TRENDED = ['visit_attendance', 'missed_visits', 'late_cancellation', 'chair_utilization'];
const LEGACY_SCAN = 2000;

/** Each metric's population: [{ entityType, entity, visit?, contactId, counts, inNumerator, amountMinor?, minutes?, note? }]. */
function populations(clinic, s, range, now, openTasks, tz) {
  const inRange = t => t >= range.from && t < range.to, out = {};
  const row = (v, extra) => ({ entityType: 'visit', entity: v, visit: v, contactId: v.contactId, ...extra });
  // Due: the visit time has passed, or its outcome is already recorded (a patient seen early counts at once).
  const due = clinic.visits.filter(v => v.status !== 'cancelled' && inRange(v.startsAt) && (v.endsAt <= now || ['arrived', 'completed', 'missed'].includes(v.status)));
  // K01: arrived or completed ÷ due visits with a recorded outcome; an unrecorded one stays unknown and is disclosed.
  out.visit_attendance = due.map(v => row(v, { counts: !outcomeUnknown(v, now), inNumerator: ['arrived', 'completed'].includes(v.status), note: outcomeUnknown(v, now) ? 'unknown' : null }));
  // K02: past visits explicitly marked missed.
  out.missed_visits = due.map(v => row(v, { counts: !outcomeUnknown(v, now), inNumerator: v.status === 'missed', note: outcomeUnknown(v, now) ? 'unknown' : null }));
  // K03, as of now: open follow-up tasks whose due time has passed.
  out.followups_due = openTasks.map(t => {
    const visit = t.entityType === 'visit' ? clinic.visits.find(v => String(v._id) === t.entityId) : null;
    return { entityType: 'task', entity: t, visit, contactId: visit ? visit.contactId : t.entityType === 'contact' ? t.entityId : null, kind: t.kind, counts: true, inNumerator: (t.snoozedUntil || t.dueAt || t.createdAt) <= now };
  });
  // K04, as of now: positive approved balances past their due date; a disputed one is disclosed, not counted.
  out.overdue_balances = clinic.visits.filter(v => v.orderId).flatMap(v => {
    const order = clinic.orders.get(String(v.orderId)), balance = balanceOf(order);
    if (!balance) return [];
    return [row(v, { counts: !v.disputed, inNumerator: balanceOverdue(v, order, now), amountMinor: balance, note: v.disputed ? 'disputed' : null })];
  });
  // K05: attended minutes ÷ staffed chair minutes (active chairs × configured minutes × open days in the elapsed period).
  out.chair_utilization = due.filter(v => ['arrived', 'completed'].includes(v.status)).map(v => row(v, { counts: true, inNumerator: true, minutes: Math.round((v.endsAt - v.startsAt) / MIN) }));
  const elapsedDays = Math.max(0, (Math.min(range.to, now) - range.from) / DAY);
  out.chair_utilization.capacityMinutes = clinic.resources.filter(r => r.kind === 'chair' && r.active).length * s.chairDayMinutes * elapsedDays * s.openDaysPerWeek / 7;
  // K06: cancelled inside the cutoff ÷ visits booked for the period.
  out.late_cancellation = clinic.visits.filter(v => inRange(v.startsAt) && (v.startsAt <= now || v.status === 'cancelled'))
    .map(v => row(v, { counts: true, inNumerator: v.status === 'cancelled' && !!v.lateCancel, note: v.status === 'cancelled' && !v.lateCancel ? 'timely_cancel' : null }));
  // K07: clinician-set recalls whose window W has matured; completed by a visit inside the window.
  out.recall_completion = clinic.visits.filter(v => v.status === 'completed' && v.recallDueAt && inRange(v.recallDueAt) && v.recallDueAt + s.recallWindowDays * DAY <= now).map(v => {
    const back = (clinic.visitsOf.get(String(v.contactId)) || []).some(o => o.status === 'completed' && o.startsAt > (v.recallSetAt || v.startsAt) && o.startsAt <= v.recallDueAt + s.recallWindowDays * DAY);
    return row(v, { counts: true, inNumerator: back });
  });
  // K08: paid ÷ collectible for charges whose due date has passed in the period; a returned charge is shown separately.
  out.charge_collection = clinic.visits.filter(v => v.orderId && v.chargeDueAt && inRange(v.chargeDueAt) && v.chargeDueAt <= now).map(v => {
    const order = clinic.orders.get(String(v.orderId)), returned = !order || CLOSED_ORDERS.has(order.status);
    return row(v, { counts: !returned, inNumerator: !returned, amountMinor: returned ? 0 : order.totalMinor, paidMinor: returned ? 0 : Math.min(order.paidMinor, order.totalMinor), note: returned ? 'returned' : v.disputed ? 'disputed' : null });
  });
  for (const id of Object.keys(out)) for (const r of out[id]) if (r.visit && tz) r.timeOfDay = timeOfDay(hourOf(r.visit.startsAt, tz));
  return out;
}

function summarize(id, rows) {
  if (id === 'chair_utilization') {
    const used = rows.reduce((sum, r) => sum + r.minutes, 0), capacity = Math.round(rows.capacityMinutes || 0);
    return { value: capacity ? Math.min(100, rate(used, capacity)) : null, numerator: used, denominator: capacity, notes: capacity ? {} : { no_chairs: 1 } };
  }
  if (id === 'charge_collection') {
    const counted = rows.filter(r => r.counts), paid = counted.reduce((s, r) => s + r.paidMinor, 0), total = counted.reduce((s, r) => s + r.amountMinor, 0);
    return { value: rate(paid, total), numerator: paid, denominator: total, notes: rows.reduce((acc, r) => r.note ? { ...acc, [r.note]: (acc[r.note] || 0) + 1 } : acc, {}) };
  }
  return summarizeRows(KIND[id], rows);
}

export function segmentOf(dimension, row, clinic) {
  const v = row.visit;
  if (!v) return 'not_applicable';
  if (dimension === 'provider') return clinic.resourceById.get(String(v.providerId))?.name || 'unknown';
  if (dimension === 'service_group') return v.serviceCategory || 'unknown';
  if (dimension === 'patient_type') return clinic.isNew(v) ? 'new' : 'returning';
  return row.timeOfDay || 'unknown';
}

const periodOf = (a, now, tz) => periodRange(PERIODS.includes(a.period) && a.period !== 'today' ? a.period : '30d', now, tz);
const openTasksOf = async (ctx, accountId, manager) => (await ctx.db.query('dentalTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500))
  .filter(t => manager || !['charges_unrecorded', 'balance_overdue', 'template_required', 'rule_balance_due'].includes(t.kind));

/** Orders in the period that no visit points to: the clinic's charges recorded before Visits, disclosed as coverage. */
async function legacyCoverage(ctx, accountId, clinic, range) {
  const linked = new Set(clinic.visits.filter(v => v.orderId).map(v => String(v.orderId)));
  const orders = await ctx.db.query('hasibOrders').withIndex('by_account_created', q => q.eq('accountId', accountId).gte('createdAt', range.from).lt('createdAt', range.to)).take(LEGACY_SCAN);
  return { chargesWithoutVisit: orders.filter(o => !linked.has(String(o._id)) && !['cancelled'].includes(o.status)).length, complete: orders.length < LEGACY_SCAN };
}

export async function dentalInsights(ctx, tenant, a, now) {
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = dentalSettings(await settingsFor(ctx, accountId));
  if (a.segment && !DENTAL_SEGMENTS.includes(a.segment)) return fail('invalid_segment');
  const range = periodOf(a, now, tz), { clinic } = await refreshClinic(ctx, accountId, now), tasks = await openTasksOf(ctx, accountId, true);
  const pops = populations(clinic, s, range, now, tasks, tz), coverage = await legacyCoverage(ctx, accountId, clinic, range);
  const metric = id => ({ id, kind: KIND[id], money: MONEY.has(id), ...(AS_OF_NOW.has(id) ? { asOf: now } : { period: { period: range.period, from: range.from, to: range.to } }), complete: clinic.complete, ...summarize(id, pops[id]) });
  const trend = {};
  for (const id of TRENDED) trend[id] = weeks(now).map(week => { const { value, numerator, denominator } = summarize(id, populations(clinic, s, week, now, tasks, tz)[id]); return { ...week, value, numerator, denominator }; });
  return ok({ period: { period: range.period, from: range.from, to: range.to }, settings: s, complete: clinic.complete, coverage,
    headline: DENTAL_HEADLINE.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })), diagnostics: DENTAL_DIAGNOSTIC.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })),
    segments: a.segment ? segmentTable(a.segment, pops, clinic) : null });
}

function segmentTable(dimension, pops, clinic) {
  const ids = [...DENTAL_HEADLINE, ...DENTAL_DIAGNOSTIC].filter(id => id !== 'chair_utilization' && id !== 'followups_due');
  const keys = new Set();
  for (const id of ids) for (const r of pops[id]) keys.add(segmentOf(dimension, r, clinic));
  return { dimension, metrics: ids, rows: [...keys].sort().map(key => ({ key, values: Object.fromEntries(ids.map(id => [id, (({ value, numerator, denominator }) => ({ value, numerator, denominator }))(summarize(id, pops[id].filter(r => segmentOf(dimension, r, clinic) === key)))])) })) };
}

/** The exact records behind a metric (optionally one segment), marking which ones the numerator counts. */
export async function dentalMetricRecords(ctx, tenant, actor, a, now) {
  if (!DENTAL_HEADLINE.includes(a.metric) && !DENTAL_DIAGNOSTIC.includes(a.metric)) return fail('invalid_metric');
  const [dimension, key] = String(a.segment || '').split(':');
  if (a.segment && (!DENTAL_SEGMENTS.includes(dimension) || !key)) return fail('invalid_segment');
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = dentalSettings(await settingsFor(ctx, accountId));
  const range = periodOf(a, now, tz), clinic = await loadClinic(ctx, accountId, now), tasks = await openTasksOf(ctx, accountId, true);
  const rows = populations(clinic, s, range, now, tasks, tz)[a.metric].filter(r => !a.segment || segmentOf(dimension, r, clinic) === key).slice(0, 300);
  const names = new Map(), items = [];
  for (const r of rows) {
    if (r.contactId && !names.has(String(r.contactId))) { const c = await ctx.db.get(r.contactId); names.set(String(r.contactId), c?.state === 'active' ? displayName(c).name : null); }
    const v = r.visit;
    items.push({ id: r.entity._id, entityType: r.entityType, counts: r.counts, inNumerator: r.inNumerator, ...(r.note ? { note: r.note } : {}), ...(r.kind ? { taskKind: r.kind } : {}),
      ...(r.amountMinor !== undefined ? { amountMinor: r.amountMinor } : {}), ...(r.paidMinor !== undefined ? { paidMinor: r.paidMinor } : {}), ...(r.minutes !== undefined ? { minutes: r.minutes } : {}),
      contactId: r.contactId ? String(r.contactId) : null, contactName: r.contactId ? names.get(String(r.contactId)) : null,
      ...(v ? { visitId: v._id, startsAt: v.startsAt, status: outcomeUnknown(v, now) ? 'unknown' : v.status, providerName: clinic.resourceById.get(String(v.providerId))?.name || null } : {}) });
  }
  return ok({ metric: a.metric, complete: clinic.complete, items });
}
