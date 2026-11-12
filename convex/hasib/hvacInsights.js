// AC service Insights: four headline cards, eight diagnostics, the contract book and receivables
// aging. Each metric names its numerator, denominator, window and coverage; an empty population is
// "no eligible records", never 0%. Benchmarks are reference text only; the business sets no target
// until it has its own baseline. Jobs recorded in the generic job list before this workspace are
// disclosed as coverage. Drill-down returns the exact population.
import { ok, fail } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { insightsPeriod as periodOf, segmentRows, contactNames } from './workspace/insights.js';
import { weeks } from './workspace/metrics.js';
import { loadShop, refreshShop } from './hvacBoard.js';
import { HVAC_HEADLINE, HVAC_DIAGNOSTIC, HVAC_SEGMENTS, KIND, MONEY, AS_OF_NOW, REFERENCE, populations, summarize, segmentOf, revenuePerTechDay, contractBook } from './hvacMetrics.js';

const TRENDED = ['on_time_arrival', 'first_time_fix', 'booking_rate', 'estimate_acceptance'];
const BUCKETS = ['0_30', '31_60', '60_plus'];

async function legacyJobs(ctx, accountId) {
  const rows = await ctx.db.query('hasibJobs').withIndex('by_account_created', q => q.eq('accountId', accountId)).take(500);
  return { olderJobs: rows.length, complete: rows.length < 500 };
}

export async function hvacInsights(ctx, tenant, a, now) {
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId);
  if (a.segment && !HVAC_SEGMENTS.includes(a.segment)) return fail('invalid_segment');
  const range = periodOf(a, now, tz), { shop, settings: s } = await refreshShop(ctx, accountId, now), pops = populations(shop, s, range, now);
  // An average ticket is calculated as an average but shown as money.
  const metric = id => ({ id, kind: KIND[id] === 'average' ? 'money' : KIND[id], money: MONEY.has(id), ...(REFERENCE[id] ? { reference: REFERENCE[id] } : {}),
    ...(AS_OF_NOW.has(id) ? { asOf: now } : { period: { period: range.period, from: range.from, to: range.to } }), complete: shop.complete, ...summarize(id, pops[id]) });
  const trend = {};
  for (const id of TRENDED) trend[id] = weeks(now).map(week => { const { value, numerator, denominator } = summarize(id, populations(shop, s, week, now)[id]); return { ...week, value, numerator, denominator }; });
  const withTrend = id => ({ ...metric(id), ...(trend[id] ? { trend: trend[id] } : {}) });
  const receivables = Object.fromEntries(BUCKETS.map(b => [b, pops.receivables.filter(r => r.note === b).reduce((sum, r) => sum + r.amountMinor, 0)]));
  return ok({ period: { period: range.period, from: range.from, to: range.to }, settings: s, complete: shop.complete, coverage: await legacyJobs(ctx, accountId),
    headline: HVAC_HEADLINE.map(withTrend), diagnostics: HVAC_DIAGNOSTIC.map(withTrend),
    revenuePerTechDay: revenuePerTechDay(shop, range, tz), contracts: contractBook(shop, s, now), receivables,
    segments: a.segment ? segmentTable(a.segment, pops, shop, tz) : null });
}

function segmentTable(dimension, pops, shop, tz) {
  const ids = [...HVAC_HEADLINE, ...HVAC_DIAGNOSTIC].filter(id => !AS_OF_NOW.has(id) && id !== 'time_to_first_visit');
  return { dimension, metrics: ids, rows: segmentRows(ids, pops, r => segmentOf(dimension, r, shop, tz), summarize) };
}

/** The exact records behind a metric (optionally one segment), marking which ones the numerator counts. */
export async function hvacMetricRecords(ctx, tenant, actor, a, now) {
  if (!HVAC_HEADLINE.includes(a.metric) && !HVAC_DIAGNOSTIC.includes(a.metric)) return fail('invalid_metric');
  const [dimension, key] = String(a.segment || '').split(':');
  if (a.segment && (!HVAC_SEGMENTS.includes(dimension) || !key)) return fail('invalid_segment');
  const accountId = tenant.accountId, tz = await businessTimezone(ctx, accountId), shop = await loadShop(ctx, accountId, now);
  const range = periodOf(a, now, tz), metricRows = populations(shop, shop.settings, range, now)[a.metric], rows = metricRows.filter(r => !a.segment || segmentOf(dimension, r, shop, tz) === key).slice(0, 300);
  const nameOf = contactNames(ctx), items = [];
  for (const r of rows) {
    const job = r.job;
    items.push({ id: r.entity._id, entityType: r.entityType, counts: r.counts, inNumerator: r.inNumerator, ...(r.note ? { note: r.note } : {}),
      ...(r.amountMinor !== undefined ? { amountMinor: r.amountMinor } : {}), ...(r.durationMs != null ? { durationMs: r.durationMs } : {}),
      contactId: r.contactId ? String(r.contactId) : null, contactName: await nameOf(r.contactId),
      ...(job ? { jobId: job._id, jobNumber: job.number, jobType: job.jobType, status: job.status } : {}),
      ...(r.visit ? { startsAt: r.visit.startsAt, endsAt: r.visit.endsAt, arrivedAt: r.visit.arrivedAt || null } : {}),
      ...(r.unit ? { unitId: r.unit._id, unitLabel: r.unit.label, nextServiceAt: r.unit.nextServiceAt } : {}),
      ...(r.contract ? { contractId: r.contract._id, reference: r.contract.reference, endsAt: r.contract.endsAt } : {}) });
  }
  return ok({ metric: a.metric, complete: shop.complete, items });
}
