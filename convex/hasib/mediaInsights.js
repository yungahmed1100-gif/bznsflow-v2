// Media Insights (ascend/media.md, "KPI definitions"): four headline cards and four diagnostics.
// Each metric names its numerator, denominator, window and coverage; an empty population is
// "no eligible records", never 0%. Drill-down returns the exact population behind the number.
import { ok, fail, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange, PERIODS } from './period.js';
import { rate, summarizeRows, weeks } from './workspace/metrics.js';
import { mediaSettings } from './mediaSettings.js';
import { loadStudio, factsOf, moneyOf, canSeeProduction } from './mediaBoard.js';
import { DAY, HOUR } from './mediaDomain.js';
import { displayName } from '../blueContacts.js';

const EVENT_SCAN = 6000;
export const MEDIA_HEADLINE = ['on_time_delivery', 'approval_wait', 'revision_overrun', 'project_contribution'];
export const MEDIA_DIAGNOSTIC = ['quote_to_booked', 'shoot_readiness', 'committed_utilization', 'unapproved_extra_scope'];
export const MEDIA_SEGMENTS = ['production_type', 'client_cohort', 'deliverable_format', 'resource_category'];
const KIND = { on_time_delivery: 'rate', approval_wait: 'duration', revision_overrun: 'rate', project_contribution: 'money', quote_to_booked: 'rate', shoot_readiness: 'rate', committed_utilization: 'rate', unapproved_extra_scope: 'money' };
const AS_OF_NOW = new Set(['unapproved_extra_scope']);
const TRENDED = ['on_time_delivery', 'approval_wait', 'revision_overrun', 'quote_to_booked'];

/** Everything the metrics read, scanned once, with the first time each production reached a milestone. */
async function load(ctx, accountId) {
  const studio = await loadStudio(ctx, accountId);
  const events = await ctx.db.query('mediaEvents').withIndex('by_account_at', q => q.eq('accountId', accountId)).order('desc').take(EVENT_SCAN);
  const first = kind => { const m = new Map(); for (const e of events) if (kind(e)) { const k = String(e.productionId); if (!m.has(k) || e.at < m.get(k)) m.set(k, e.at); } return m; };
  const resources = new Map(studio.resources.map(r => [String(r._id), r]));
  // A client is "repeat" when an earlier production of theirs was accepted before this one began.
  const repeat = new Set();
  for (const p of studio.productions) if (studio.productions.some(o => o !== p && String(o.contactId) === String(p.contactId) && o.finalAcceptedAt && o.finalAcceptedAt < p.createdAt)) repeat.add(String(p._id));
  return { ...studio, quotedAt: first(e => e.kind === 'quote_issued'), bookedAt: first(e => e.kind === 'status' && e.to === 'booked'), reviewAt: first(e => e.kind === 'cut_submitted'),
    resourcesById: resources, repeat, complete: studio.complete && events.length < EVENT_SCAN };
}

export const segmentOf = (dimension, row, data) => {
  const p = row.production;
  if (dimension === 'resource_category') return row.resource?.category || 'not_applicable';
  if (!p) return 'unknown';
  if (dimension === 'production_type') return p.productionType || 'unknown';
  if (dimension === 'client_cohort') return data.repeat.has(String(p._id)) ? 'repeat' : 'new';
  if (dimension === 'deliverable_format') return p.deliverables?.[0]?.format || 'unknown';
  return 'all';
};

/** Business days (Sunday–Thursday, the Oman working week) in a window, in the studio's timezone. */
function businessDays(from, to, timezone) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  let n = 0;
  for (let t = from + 12 * HOUR; t < to; t += DAY) if (!['Fri', 'Sat'].includes(weekday.format(new Date(t)))) n++;
  return n;
}

/** Each metric's population: [{ entityType, entity, production, counts, inNumerator, amountMinor?, durationMs?, hours?, note? }]. */
function populations(data, s, range, now, timezone, { periodOnly = false } = {}) {
  const { productions, cuts, changeOrders, reservations, costs, quotedAt, bookedAt, reviewAt } = data;
  const byId = new Map(productions.map(p => [String(p._id), p])), of = r => byId.get(String(r.productionId));
  const inRange = t => t >= range.from && t < range.to, out = {};

  // K01: deliveries due in the period (unresolved overdue included); a cancellation is left out but disclosed.
  out.on_time_delivery = productions.filter(p => p.deliveryDueAt && p.deliveryDueAt >= range.from && p.deliveryDueAt < Math.min(range.to, now)).map(p => {
    const cancelled = p.status === 'cancelled', onTime = !!p.deliveredAt && p.deliveredAt <= p.deliveryDueAt;
    const note = cancelled ? 'cancelled' : !p.deliveredAt ? 'open_overdue' : p.originalDueAt && p.originalDueAt !== p.deliveryDueAt ? 'due_moved' : null;
    return { entityType: 'production', entity: p, production: p, counts: !cancelled, inNumerator: !cancelled && onTime, note };
  });
  // K02: submission → decision for cuts decided in the period; pending cuts show their current age separately.
  out.approval_wait = [
    ...cuts.filter(c => c.decisionAt && inRange(c.decisionAt)).map(c => ({ entityType: 'cut', entity: c, production: of(c), counts: true, inNumerator: true, durationMs: c.decisionAt - c.submittedAt })),
    ...(periodOnly ? [] : cuts.filter(c => c.status === 'in_review').map(c => ({ entityType: 'cut', entity: c, production: of(c), counts: false, inNumerator: false, durationMs: now - c.submittedAt, note: 'pending' }))),
  ];
  // K03: productions that entered review in the period, once the cohort has matured (window passed, or accepted).
  out.revision_overrun = productions.filter(p => reviewAt.has(String(p._id))).map(p => ({ p, at: reviewAt.get(String(p._id)) }))
    .filter(({ p, at }) => inRange(at) && (at + s.revisionWindowDays * DAY <= now || ['accepted', 'delivered', 'closed'].includes(p.status)))
    .map(({ p }) => ({ entityType: 'production', entity: p, production: p, counts: p.status !== 'cancelled', inNumerator: p.status !== 'cancelled' && p.roundsUsed > p.revisionAllowance,
      note: p.status === 'cancelled' ? 'cancelled' : null }));
  // K04: delivered in the period: net order revenue minus recorded direct costs. Incomplete until costs are confirmed.
  out.project_contribution = productions.filter(p => p.deliveredAt && inRange(p.deliveredAt)).map(p => {
    const money = moneyOf(data, p, factsOf(data, p, now));
    return { entityType: 'production', entity: p, production: p, counts: true, inNumerator: true, amountMinor: money.revenueNetMinor - money.actualCostMinor,
      revenueMinor: money.revenueNetMinor, costMinor: money.actualCostMinor, note: p.costsFinal ? null : 'costs_not_final' };
  });
  // K05: quotes issued in the period whose window has passed; booked (deposit and holds confirmed) within it.
  out.quote_to_booked = productions.filter(p => quotedAt.has(String(p._id))).map(p => ({ p, at: quotedAt.get(String(p._id)) }))
    .filter(({ at }) => inRange(at) && at + s.quoteWindowDays * DAY <= now).map(({ p, at }) => {
      const booked = bookedAt.get(String(p._id));
      return { entityType: 'production', entity: p, production: p, counts: true, inNumerator: booked !== undefined && booked <= at + s.quoteWindowDays * DAY };
    });
  // K06: every preparation item due at a readiness checkpoint in the period; verified by the checkpoint counts.
  // Only booked shoots have a readiness checkpoint; an unbooked brief is not yet preparing.
  out.shoot_readiness = productions.filter(p => p.status !== 'cancelled' && p.shootStartsAt && bookedAt.has(String(p._id))).flatMap(p => {
    const checkpoint = p.shootStartsAt - s.prepCutoffHours * HOUR;
    if (!(checkpoint >= range.from && checkpoint < Math.min(range.to, now))) return [];
    return p.prep.map(item => ({ entityType: 'production', entity: p, production: p, counts: true, inNumerator: !!item.verifiedAt && item.verifiedAt <= checkpoint, item: item.key,
      note: item.critical && !(item.verifiedAt && item.verifiedAt <= checkpoint) ? 'critical_missing' : null }));
  });
  // K07: confirmed hours ÷ configured available hours; tentative holds are shown, never counted.
  const clip = r => Math.max(0, Math.min(r.endsAt, range.to) - Math.max(r.startsAt, range.from)) / HOUR;
  out.committed_utilization = reservations.filter(r => ['held', 'confirmed'].includes(r.status) && r.startsAt < range.to && r.endsAt > range.from).map(r => ({
    entityType: 'reservation', entity: r, production: of(r), resource: data.resourcesById.get(String(r.resourceId)), counts: r.status === 'confirmed', inNumerator: r.status === 'confirmed',
    hours: clip(r), note: r.status === 'held' ? 'tentative' : null }));
  out.committed_utilization.availableHours = data.resources.filter(r => r.active).length * s.resourceHoursPerDay * businessDays(range.from, range.to, timezone);
  // K08, as of now: extra-scope costs with no approved or waived change order behind them.
  const decided = new Set(changeOrders.filter(c => ['approved', 'waived'].includes(c.status)).map(c => String(c._id)));
  out.unapproved_extra_scope = costs.filter(c => !c.voidedAt && (c.extraScope || c.changeOrderId) && !(c.changeOrderId && decided.has(String(c.changeOrderId))))
    .map(c => ({ entityType: 'cost', entity: c, production: of(c), counts: true, inNumerator: true, amountMinor: c.amountMinor, note: c.kind === 'committed' ? 'committed' : 'actual' }));
  return out;
}

/** One metric's value from its population. */
function summarize(id, rows) {
  if (id === 'committed_utilization') {
    const confirmed = rows.filter(r => r.counts).reduce((s, r) => s + r.hours, 0), tentative = rows.filter(r => !r.counts).reduce((s, r) => s + r.hours, 0);
    const available = rows.availableHours || 0;
    return { value: available ? Math.round(confirmed * 1000 / available) / 10 : null, numerator: Math.round(confirmed * 10) / 10, denominator: available,
      tentativeHours: Math.round(tentative * 10) / 10, notes: { tentative: rows.filter(r => !r.counts).length } };
  }
  const base = summarizeRows(KIND[id], rows);
  if (id === 'project_contribution') return { ...base, revenueMinor: rows.reduce((s, r) => s + r.revenueMinor, 0), costMinor: rows.reduce((s, r) => s + r.costMinor, 0), costsComplete: rows.every(r => r.note !== 'costs_not_final') };
  return base;
}

const periodOf = (a, now, tz) => periodRange(PERIODS.includes(a.period) && a.period !== 'today' ? a.period : '30d', now, tz);
const settingsOf = async (ctx, accountId) => mediaSettings(await settingsFor(ctx, accountId));

export async function mediaInsights(ctx, tenant, a, now) {
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = await settingsOf(ctx, accountId);
  if (a.segment && !MEDIA_SEGMENTS.includes(a.segment)) return fail('invalid_segment');
  const range = periodOf(a, now, tz), data = await load(ctx, accountId);
  const pops = populations(data, s, range, now, tz);
  // With nothing delivered, or no cost ever recorded, a money figure is unavailable rather than 0.
  const unavailable = id => (id === 'project_contribution' && !pops[id].length) || (id === 'unapproved_extra_scope' && !data.costs.length);
  const metric = id => ({ id, kind: KIND[id], ...(AS_OF_NOW.has(id) ? { asOf: now } : { period: { period: range.period, from: range.from, to: range.to } }), complete: data.complete,
    ...summarize(id, pops[id]), ...(unavailable(id) ? { value: null } : {}) });
  // Weekly cohorts for period measures; the backlog has no history, so no trend is drawn for it.
  const trend = {};
  for (const id of TRENDED) {
    const end = id === 'revision_overrun' ? now - s.revisionWindowDays * DAY : id === 'quote_to_booked' ? now - s.quoteWindowDays * DAY : now;
    trend[id] = weeks(end).map(week => { const { value, numerator, denominator } = summarize(id, populations(data, s, week, now, tz, { periodOnly: true })[id]); return { ...week, value, numerator, denominator }; });
  }
  const changeOrders = data.changeOrders.filter(c => c.createdAt >= range.from && c.createdAt < range.to);
  const firstCut = data.productions.filter(p => p.firstCutDueAt && p.firstCutDueAt >= range.from && p.firstCutDueAt < Math.min(range.to, now) && p.status !== 'cancelled');
  const firstCutOnTime = firstCut.filter(p => (data.cutsOf.get(String(p._id)) || []).some(c => c.revision === 1 && c.submittedAt <= p.firstCutDueAt)).length;
  return ok({ period: { period: range.period, from: range.from, to: range.to }, settings: s, complete: data.complete,
    headline: MEDIA_HEADLINE.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })), diagnostics: MEDIA_DIAGNOSTIC.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })),
    firstCut: { value: rate(firstCutOnTime, firstCut.length), numerator: firstCutOnTime, denominator: firstCut.length },
    changeOrders: { proposed: changeOrders.filter(c => c.status === 'proposed').length, approved: changeOrders.filter(c => c.status === 'approved').length,
      approvedMinor: changeOrders.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.priceMinor, 0) },
    segments: a.segment ? segmentTable(a.segment, pops, data) : null });
}

function segmentTable(dimension, pops, data) {
  const ids = dimension === 'resource_category' ? ['committed_utilization'] : [...MEDIA_HEADLINE, ...MEDIA_DIAGNOSTIC].filter(id => id !== 'committed_utilization');
  const keys = new Set();
  for (const id of ids) for (const r of pops[id]) keys.add(segmentOf(dimension, r, data));
  const slice = (id, key) => Object.assign(pops[id].filter(r => segmentOf(dimension, r, data) === key), id === 'committed_utilization' ? { availableHours: pops[id].availableHours } : {});
  return { dimension, metrics: ids, rows: [...keys].sort().map(key => ({ key, values: Object.fromEntries(ids.map(id => [id, (({ value, numerator, denominator }) => ({ value, numerator, denominator }))(summarize(id, slice(id, key)))])) })) };
}

/** The exact records behind a metric (optionally one segment), marking which ones the numerator counts. */
export async function mediaMetricRecords(ctx, tenant, actor, a, now) {
  if (!MEDIA_HEADLINE.includes(a.metric) && !MEDIA_DIAGNOSTIC.includes(a.metric)) return fail('invalid_metric');
  const [dimension, key] = String(a.segment || '').split(':');
  if (a.segment && (!MEDIA_SEGMENTS.includes(dimension) || !key)) return fail('invalid_segment');
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), s = await settingsOf(ctx, accountId);
  const range = periodOf(a, now, tz), data = await load(ctx, accountId);
  const rows = populations(data, s, range, now, tz)[a.metric].filter(r => !a.segment || segmentOf(dimension, r, data) === key).filter(r => !r.production || canSeeProduction(actor, r.production)).slice(0, 300);
  const contacts = new Map();
  const items = [];
  for (const r of rows) {
    const p = r.production;
    if (p && !contacts.has(String(p.contactId))) { const c = await ctx.db.get(p.contactId); contacts.set(String(p.contactId), c?.state === 'active' ? displayName(c).name : null); }
    items.push({ id: r.entity._id, entityType: r.entityType, counts: r.counts, inNumerator: r.inNumerator, ...(r.note ? { note: r.note } : {}),
      ...(r.amountMinor !== undefined ? { amountMinor: r.amountMinor } : {}), ...(r.durationMs != null ? { durationMs: r.durationMs } : {}), ...(r.hours !== undefined ? { hours: Math.round(r.hours * 10) / 10 } : {}),
      ...(r.item ? { item: r.item } : {}), ...(r.entityType === 'cut' ? { label: r.entity.label } : {}), ...(r.entityType === 'cost' ? { label: r.entity.label, category: r.entity.category } : {}),
      ...(r.resource ? { resourceName: r.resource.name } : {}),
      productionId: p?._id || null, ref: p?.ref || null, title: p?.title || null, status: p?.status || null, contactName: p ? contacts.get(String(p.contactId)) : null, conversationId: p?.conversationId || null });
  }
  return ok({ metric: a.metric, complete: data.complete, items });
}
