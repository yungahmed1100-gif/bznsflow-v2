// Real Estate Insights (ascend/real-estate.md, "KPI definitions"): four headline cards and four
// diagnostics. Every metric names its numerator, denominator, window and coverage; an empty
// population is "no eligible records", never 0%. Drill-down returns the exact population.
import { owned } from '../blueTenant.js';
import { ok, fail, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange, PERIODS } from './period.js';
import { DAY, OPEN_STAGES, insights as legacyInsights, readable } from './realEstateBoard.js';
import { realEstateSettings } from './realEstateSettings.js';

const SCAN = 2000, EVENT_SCAN = 6000, WEEKS = 8, WEEK = 7 * DAY, MIN = 60000, HOUR = 3600000;
const QUALIFIED_STAGES = new Set(['qualified', 'viewing', 'offer', 'won']);
const LIVE_VIEWING = new Set(['requested', 'confirmed']);
const LIVE_OFFER = new Set(['approved', 'presented', 'countered']);
export const HEADLINE = ['qualified_to_viewing', 'viewing_attendance', 'unanswered_qualified', 'commission_overdue'];
export const DIAGNOSTIC = ['qualified_to_close', 'time_to_viewing', 'listing_freshness', 'offer_backlog'];
export const SEGMENTS = ['need', 'property_type', 'source', 'agent'];
const SEGMENTED = new Set(['qualified_to_viewing', 'viewing_attendance', 'unanswered_qualified', 'commission_overdue', 'qualified_to_close', 'time_to_viewing', 'offer_backlog']);

const rate = (n, d) => d ? Math.round(n * 1000 / d) / 10 : null;
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y), i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};
export const segmentOf = (dimension, o) => !o ? 'unknown'
  : dimension === 'need' ? (o.need === 'rent' ? 'rent' : 'sale')
  : dimension === 'property_type' ? (o.propertyTypes?.[0] || 'unknown')
  : dimension === 'source' ? (o.source || 'unknown')
  : dimension === 'agent' ? (o.assignedAccountId ? String(o.assignedAccountId) : 'unassigned') : 'all';

/** Everything the metrics read, scanned once with how complete each scan was. */
async function load(ctx, accountId) {
  const scan = (table, index = 'by_account_created', n = SCAN) => ctx.db.query(table).withIndex(index, q => q.eq('accountId', accountId)).order('desc').take(n);
  const [opportunities, viewings, offers, commissions, properties, events] = [await scan('realEstateOpportunities'), await scan('realEstateViewings', 'by_account_date'),
    await scan('realEstateOffers'), await scan('realEstateCommissions'), await scan('hasibProperties'), await scan('realEstateDealEvents', 'by_account_at', EVENT_SCAN)];
  const complete = [opportunities, viewings, offers, commissions, properties].every(rows => rows.length < SCAN) && events.length < EVENT_SCAN;
  // Qualification time: the first recorded move into qualified or any later stage.
  const qualifiedAt = new Map();
  for (const e of events) if (QUALIFIED_STAGES.has(e.toStage)) {
    const k = String(e.opportunityId);
    if (!qualifiedAt.has(k) || e.at < qualifiedAt.get(k)) qualifiedAt.set(k, e.at);
  }
  const wonAt = new Map(events.filter(e => e.toStage === 'won').map(e => [String(e.opportunityId), e.at]));
  const deals = new Map(opportunities.map(o => [String(o._id), o]));
  return { opportunities, viewings, offers, commissions, properties, qualifiedAt, wonAt, deals, complete };
}

/** First completed viewing at or after a time, per deal. */
function firstAttended(viewings) {
  const byDeal = new Map();
  for (const v of viewings) if (v.status === 'completed') {
    const k = String(v.opportunityId);
    byDeal.set(k, [...(byDeal.get(k) || []), v.scheduledAt].sort((x, y) => x - y));
  }
  return (k, from) => (byDeal.get(k) || []).find(at => at >= from) ?? null;
}

/**
 * Each metric's population for one window: [{ entityType, entity, opportunity, counts, inNumerator, amountMinor?, durationMs? }].
 * `from`/`to` bound the cohort or due date; backlog metrics ignore them and read "as of now".
 */
async function populations(ctx, data, s, range, now, { periodOnly = false } = {}) {
  const { opportunities, viewings, offers, commissions, properties, qualifiedAt, wonAt, deals } = data;
  const attended = firstAttended(viewings);
  const windowMs = s.viewingWindowDays * DAY, closeMs = o => (o.need === 'rent' ? s.closeWindowDaysRent : s.closeWindowDaysSale) * DAY;
  const qualified = opportunities.filter(o => qualifiedAt.has(String(o._id))).map(o => ({ o, at: qualifiedAt.get(String(o._id)) }));
  const out = {};

  // Qualified-to-viewing: cohort qualified in the period whose W-day window has fully passed.
  out.qualified_to_viewing = qualified.filter(({ at }) => at >= range.from && at < range.to && at + windowMs <= now).map(({ o, at }) => {
    const seen = attended(String(o._id), at);
    return { entityType: 'opportunity', entity: o, opportunity: o, counts: true, inNumerator: seen !== null && seen <= at + windowMs };
  });
  // Viewing attendance: viewings due in the period that have happened; timely cancellations are left out.
  out.viewing_attendance = viewings.filter(v => v.scheduledAt >= range.from && v.scheduledAt < Math.min(range.to, now)).map(v => {
    const cancelledLate = v.status === 'cancelled' && (v.statusAt ?? v.updatedAt) > v.scheduledAt - s.lateCancelHours * HOUR;
    const counts = v.status === 'completed' || v.status === 'missed' || cancelledLate;
    const note = v.status === 'cancelled' ? (cancelledLate ? 'late_cancel' : 'timely_cancel') : LIVE_VIEWING.has(v.status) ? 'outcome_missing' : v.status;
    return { entityType: 'viewing', entity: v, opportunity: deals.get(String(v.opportunityId)), counts, inNumerator: v.status === 'completed', note };
  });
  // Unanswered qualified inquiries, as of now: the customer's latest message has no later reply, past the SLA.
  const unanswered = [];
  if (!periodOnly) for (const o of opportunities) {
    if (!['qualified', 'viewing', 'offer'].includes(o.stage) || !o.conversationId) continue;
    const last = dir => ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', o.conversationId).eq('direction', dir)).order('desc').first();
    const inbound = await last('in');
    if (!inbound || now - inbound.at < s.responseSlaMinutes * MIN) continue;
    const replies = [await last('out'), await last('human')].filter(m => m && !['blocked', 'failed', 'cancelled'].includes(m.status));
    if (replies.some(m => m.at >= inbound.at)) continue;
    unanswered.push({ entityType: 'opportunity', entity: o, opportunity: o, counts: true, inNumerator: true, durationMs: now - inbound.at });
  }
  out.unanswered_qualified = unanswered;
  // Commission overdue, as of now: unpaid balance on the commission's order past its recorded due date.
  const owed = [];
  if (!periodOnly) for (const c of commissions) {
    const order = await owned(ctx, c.orderId, c.accountId, 'hasibOrders');
    const balance = order ? Math.max(0, order.totalMinor - order.paidMinor) : 0;
    if (!balance) continue;
    owed.push({ entityType: 'commission', entity: c, opportunity: deals.get(String(c.opportunityId)), counts: !!c.dueAt, inNumerator: !!c.dueAt && c.dueAt < now, amountMinor: balance, note: c.dueAt ? null : 'no_due_date' });
  }
  out.commission_overdue = owed;
  // Qualified-to-close within the rent or sale window.
  out.qualified_to_close = qualified.filter(({ o, at }) => at >= range.from && at < range.to && at + closeMs(o) <= now).map(({ o, at }) => {
    const won = wonAt.get(String(o._id));
    return { entityType: 'opportunity', entity: o, opportunity: o, counts: true, inNumerator: won !== undefined && won <= at + closeMs(o) };
  });
  // Time from qualification to the first attended viewing, for deals qualified in the period.
  out.time_to_viewing = qualified.filter(({ at }) => at >= range.from && at < range.to).map(({ o, at }) => {
    const seen = attended(String(o._id), at);
    return { entityType: 'opportunity', entity: o, opportunity: o, counts: seen !== null, inNumerator: seen !== null, durationMs: seen !== null ? seen - at : now - at, note: seen === null ? 'open' : null };
  });
  // Listing freshness: available listings checked within the freshness interval.
  const freshMs = (s.listingFreshnessDays ?? 30) * DAY;
  out.listing_freshness = properties.filter(p => p.availability === 'available').map(p => ({ entityType: 'property', entity: p, opportunity: null, counts: true, inNumerator: !!p.verificationAt && p.verificationAt >= now - freshMs }));
  // Offer decision backlog, as of now: live offers past their recorded decision time.
  out.offer_backlog = offers.filter(o => LIVE_OFFER.has(o.status)).map(o => ({ entityType: 'offer', entity: o, opportunity: deals.get(String(o.opportunityId)), counts: !!o.decisionDueAt,
    inNumerator: !!o.decisionDueAt && o.decisionDueAt < now, amountMinor: o.amountMinor, durationMs: o.decisionDueAt ? now - o.decisionDueAt : null, note: o.decisionDueAt ? null : 'no_decision_date' }));
  return out;
}

const KIND = { qualified_to_viewing: 'rate', viewing_attendance: 'rate', unanswered_qualified: 'count', commission_overdue: 'money', qualified_to_close: 'rate', time_to_viewing: 'duration', listing_freshness: 'rate', offer_backlog: 'count' };
const AS_OF_NOW = new Set(['unanswered_qualified', 'commission_overdue', 'listing_freshness', 'offer_backlog']);

/** One metric's value from its population. */
function summarize(id, rows) {
  const counted = rows.filter(r => r.counts), hits = counted.filter(r => r.inNumerator);
  const notes = rows.reduce((acc, r) => r.note ? { ...acc, [r.note]: (acc[r.note] || 0) + 1 } : acc, {});
  if (KIND[id] === 'rate') return { value: rate(hits.length, counted.length), numerator: hits.length, denominator: counted.length, notes };
  if (KIND[id] === 'money') return { value: hits.reduce((sum, r) => sum + r.amountMinor, 0), numerator: hits.length, denominator: counted.length, notes,
    totalOwedMinor: rows.reduce((sum, r) => sum + r.amountMinor, 0) };
  if (KIND[id] === 'duration') {
    const done = counted.map(r => r.durationMs), open = rows.filter(r => !r.counts).map(r => r.durationMs);
    return { value: quantile(done, 0.5), p90: quantile(done, 0.9), numerator: done.length, denominator: rows.length, notes, openMedianMs: quantile(open, 0.5) };
  }
  if (id === 'offer_backlog') return { value: hits.length, numerator: hits.length, denominator: counted.length, notes, valueMinor: hits.reduce((s, r) => s + r.amountMinor, 0), oldestMs: hits.length ? Math.max(...hits.map(r => r.durationMs)) : null };
  return { value: hits.length, numerator: hits.length, denominator: counted.length, notes, oldestMs: hits.length ? Math.max(...hits.map(r => r.durationMs)) : null };
}

const periodOf = (a, now, tz) => periodRange(PERIODS.includes(a.period) && a.period !== 'today' ? a.period : '30d', now, tz);

export async function realEstateInsights(ctx, tenant, a, now) {
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), base = await settingsFor(ctx, accountId);
  const s = { ...realEstateSettings(base), listingFreshnessDays: base.listingFreshnessDays ?? 30 };
  if (a.segment && !SEGMENTS.includes(a.segment)) return fail('invalid_segment');
  const range = periodOf(a, now, tz), data = await load(ctx, accountId);
  const pops = await populations(ctx, data, s, range, now);
  // With no commission recorded at all there is nothing to be overdue on: say so rather than show 0.
  const metric = id => {
    const value = summarize(id, pops[id]);
    return { id, kind: KIND[id], ...(AS_OF_NOW.has(id) ? { asOf: now } : { period: { period: range.period, from: range.from, to: range.to } }), complete: data.complete,
      ...value, ...(id === 'commission_overdue' && !data.commissions.length ? { value: null } : {}) };
  };
  // Weekly cohorts for the period metrics; backlog metrics have no history to show, so no trend is drawn.
  const trend = {};
  for (const id of ['qualified_to_viewing', 'viewing_attendance', 'qualified_to_close']) {
    const end = id === 'viewing_attendance' ? now : now - (id === 'qualified_to_viewing' ? s.viewingWindowDays : s.closeWindowDaysSale) * DAY;
    const weeks = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const week = { from: end - (i + 1) * WEEK, to: end - i * WEEK };
      const rows = (await populations(ctx, data, s, week, now, { periodOnly: true }))[id];
      const { value, numerator, denominator } = summarize(id, rows);
      weeks.push({ ...week, value, numerator, denominator });
    }
    trend[id] = weeks;
  }
  const segments = a.segment ? segmentTable(a.segment, pops) : null;
  const legacy = (await legacyInsights(ctx, tenant)).value;
  // Commission money comes from each commission's order: what was charged, paid and is still owed.
  const money = { dueMinor: 0, paidMinor: 0, records: data.commissions.length };
  for (const c of data.commissions) {
    const order = await owned(ctx, c.orderId, accountId, 'hasibOrders');
    if (order) { money.paidMinor += order.paidMinor; money.dueMinor += Math.max(0, order.totalMinor - order.paidMinor); }
  }
  return ok({ ...legacy, period: { period: range.period, from: range.from, to: range.to }, settings: s, complete: data.complete,
    headline: HEADLINE.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })), diagnostics: DIAGNOSTIC.map(id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) })),
    segments, commissions: money });
}

function segmentTable(dimension, pops) {
  const keys = new Set();
  for (const id of SEGMENTED) for (const r of pops[id]) keys.add(segmentOf(dimension, r.opportunity));
  return { dimension, rows: [...keys].sort().map(key => ({ key, values: Object.fromEntries([...SEGMENTED].map(id => [id, (({ value, numerator, denominator }) => ({ value, numerator, denominator }))(summarize(id, pops[id].filter(r => segmentOf(dimension, r.opportunity) === key)))])) })) };
}

/** The exact records behind a metric (optionally one segment), marking which ones the numerator counts. */
export async function metricRecords(ctx, tenant, a, now) {
  if (!HEADLINE.includes(a.metric) && !DIAGNOSTIC.includes(a.metric)) return fail('invalid_metric');
  const [dimension, key] = String(a.segment || '').split(':');
  if (a.segment && (!SEGMENTS.includes(dimension) || !key)) return fail('invalid_segment');
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), base = await settingsFor(ctx, accountId);
  const s = { ...realEstateSettings(base), listingFreshnessDays: base.listingFreshnessDays ?? 30 };
  const range = periodOf(a, now, tz), data = await load(ctx, accountId);
  const rows = (await populations(ctx, data, s, range, now))[a.metric].filter(r => !a.segment || segmentOf(dimension, r.opportunity) === key).slice(0, 300);
  const described = await readable(ctx, accountId, rows.map(r => r.entity));
  return ok({ metric: a.metric, complete: data.complete, items: described.map((row, i) => ({ ...row, entityType: rows[i].entityType, counts: rows[i].counts, inNumerator: rows[i].inNumerator,
    ...(rows[i].note ? { note: rows[i].note } : {}), ...(rows[i].amountMinor !== undefined ? { amountMinor: rows[i].amountMinor } : {}), ...(rows[i].durationMs != null ? { durationMs: rows[i].durationMs } : {}),
    opportunityId: rows[i].opportunity?._id || (rows[i].entityType === 'opportunity' ? rows[i].entity._id : null), stage: rows[i].opportunity?.stage || null })) });
}
