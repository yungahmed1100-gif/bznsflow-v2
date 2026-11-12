// AC service KPIs (ascend/hvac.md, "KPI definitions", with the measures the best-run service
// companies track: on-time arrival, first-time fix, booking rate, estimate acceptance, contract
// renewal, repeat faults, average ticket and receivables). Pure functions over the loaded records:
// each metric is a population of rows ({ counts, inNumerator, amountMinor?, durationMs?, note? }),
// so the card, the breakdown and the drill-down always agree. A window that has not closed yet is
// disclosed ("window_open"), never counted as a miss.
import { summarizeRows } from './workspace/metrics.js';
import { formatLocal } from '../../src/lib/timezone.js';
import { DAY, OPEN_JOB, onTime, arrivalUnrecorded, latestSent, balanceOf } from './hvacDomain.js';

export const HVAC_HEADLINE = ['on_time_arrival', 'first_time_fix', 'maintenance_due', 'job_contribution'];
export const HVAC_DIAGNOSTIC = [
  'booking_rate',
  'time_to_first_visit',
  'estimate_acceptance',
  'repeat_fault_rate',
  'contract_renewal',
  'jobs_past_promise',
  'average_ticket',
  'receivables',
];
export const HVAC_SEGMENTS = ['job_type', 'unit_type', 'area', 'contract', 'urgency', 'month'];
export const KIND = {
  on_time_arrival: 'rate',
  first_time_fix: 'rate',
  maintenance_due: 'count',
  job_contribution: 'money',
  booking_rate: 'rate',
  time_to_first_visit: 'duration',
  estimate_acceptance: 'rate',
  repeat_fault_rate: 'rate',
  contract_renewal: 'rate',
  jobs_past_promise: 'count',
  average_ticket: 'average',
  receivables: 'money',
};
export const MONEY = new Set(['job_contribution', 'average_ticket', 'receivables']);
export const AS_OF_NOW = new Set(['maintenance_due', 'jobs_past_promise', 'receivables']);
// Reference figures from published industry benchmarks; shown beside the value, never as the business's target.
export const REFERENCE = {
  on_time_arrival: { atLeast: 95 },
  first_time_fix: { atLeast: 80 },
  booking_rate: { atLeast: 60 },
  estimate_acceptance: { atLeast: 45 },
  repeat_fault_rate: { atMost: 2 },
  contract_renewal: { atLeast: 85 },
};
const FIX_TYPES = new Set(['repair', 'gas_refill', 'cleaning']);

const overlaps = (a, b) => !a.length || !b.length || a.some(x => b.some(y => String(x) === String(y)));
/** Revenue of a completed job's order, before VAT. */
const revenueOf = order => (order ? Math.max(0, (order.totalMinor || 0) - (order.vatMinor || 0)) : 0);
/** A later job for the same customer and unit, opened as a return within W of completion. */
export const repeatOf = (shop, job, windowMs) =>
  shop.jobs.find(
    r =>
      String(r.repeatOfId) === String(job._id) &&
      overlaps(r.unitIds, job.unitIds) &&
      r.createdAt - job.completedAt <= windowMs,
  ) || null;
export const ageBucket = ms => (ms <= 30 * DAY ? '0_30' : ms <= 60 * DAY ? '31_60' : '60_plus');

/** Each metric's population for one period. */
export function populations(shop, s, range, now) {
  const inRange = t => !!t && t >= range.from && t < range.to,
    out = {},
    W = s.repeatWindowDays * DAY;
  const jobRow = (job, extra) => ({ entityType: 'job', entity: job, job, contactId: job.contactId, ...extra });
  // On-time arrival: every visit whose window has passed (or that has an arrival); no arrival recorded counts as late and is disclosed.
  out.on_time_arrival = shop.visits
    .filter(v => inRange(v.startsAt) && v.status !== 'cancelled' && (v.endsAt <= now || v.arrivedAt))
    .map(v => {
      const job = shop.jobById.get(String(v.jobId));
      return {
        entityType: 'visit',
        entity: v,
        visit: v,
        job,
        contactId: job?.contactId,
        counts: true,
        inNumerator: onTime(v, s.arrivalGraceMinutes),
        note: arrivalUnrecorded(v, now) ? 'unrecorded' : v.status === 'missed' ? 'missed' : null,
      };
    });
  const completed = shop.jobs.filter(j => j.status === 'completed' && inRange(j.completedAt));
  // First-time fix: a repair, gas or cleaning job done in one visit and not back for the same unit within W.
  out.first_time_fix = completed
    .filter(j => FIX_TYPES.has(j.jobType))
    .map(j => {
      const matured = j.completedAt + W <= now,
        visits = shop.visitsOf(j._id).filter(v => v.arrivedAt).length;
      return jobRow(j, {
        counts: matured,
        inNumerator: matured && visits <= 1 && !repeatOf(shop, j, W),
        note: matured ? null : 'window_open',
      });
    });
  // Maintenance due, as of now: units past the technician's date with no job since, and contract visits past due with no visit booked.
  out.maintenance_due = [
    ...shop.units
      .filter(u => !u.retiredAt && u.nextServiceAt && u.nextServiceAt <= now && !shop.servicedSince(u))
      .map(u => ({
        entityType: 'unit',
        entity: u,
        unit: u,
        contactId: u.contactId,
        counts: true,
        inNumerator: true,
        durationMs: now - u.nextServiceAt,
      })),
    ...shop.jobs
      .filter(
        j =>
          j.source === 'contract' &&
          j.status === 'approved' &&
          !shop.activeVisitOf(j._id) &&
          (shop.contractVisitDue(j) ?? Infinity) <= now,
      )
      .map(j =>
        jobRow(j, {
          counts: true,
          inNumerator: true,
          durationMs: now - shop.contractVisitDue(j),
          note: 'contract_visit',
        }),
      ),
  ];
  // Job contribution: revenue less recorded costs, for completed jobs whose costs are marked complete; the rest are disclosed.
  out.job_contribution = completed.map(j => {
    const order = shop.orderOf(j.orderId),
      costs = j.costs.reduce((sum, c) => sum + c.amountMinor, 0);
    return jobRow(j, {
      counts: true,
      inNumerator: !!j.costsComplete,
      amountMinor: revenueOf(order) - costs,
      note: j.costsComplete ? null : 'costs_missing',
    });
  });
  const requests = shop.jobs.filter(j => j.source !== 'contract' && inRange(j.requestedAt));
  // Booking rate: requests booked (a visit given) within the booking window; one still inside its window is not judged yet.
  out.booking_rate = requests.map(j => {
    const booked = !!j.scheduledAt && j.scheduledAt - j.requestedAt <= s.bookingWindowDays * DAY,
      judged = booked || j.requestedAt + s.bookingWindowDays * DAY <= now;
    return jobRow(j, {
      counts: judged,
      inNumerator: booked,
      durationMs: j.scheduledAt ? j.scheduledAt - j.requestedAt : null,
      note: judged ? (j.status === 'cancelled' && !booked ? 'cancelled' : null) : 'window_open',
    });
  });
  // Time to first visit: request to the technician's first arrival; open requests are shown separately.
  out.time_to_first_visit = requests
    .filter(j => j.status !== 'cancelled' || j.firstArrivedAt)
    .map(j =>
      jobRow(j, {
        counts: !!j.firstArrivedAt,
        inNumerator: !!j.firstArrivedAt,
        durationMs: (j.firstArrivedAt || now) - j.requestedAt,
        note: j.firstArrivedAt ? null : 'not_visited',
      }),
    );
  // Estimate acceptance: the latest version sent for each job, approved within the estimate window.
  out.estimate_acceptance = shop.jobs.flatMap(j => {
    const e = latestSent(shop.estimatesOf(j._id));
    if (!e || !inRange(e.issuedAt)) return [];
    const approved = e.status === 'approved' && e.approvedAt - e.issuedAt <= s.estimateWindowDays * DAY,
      judged = approved || e.issuedAt + s.estimateWindowDays * DAY <= now;
    return [
      jobRow(j, {
        counts: judged,
        inNumerator: approved,
        amountMinor: e.totalMinor,
        note: judged ? null : 'window_open',
      }),
    ];
  });
  // Repeat-fault rate: completed jobs (contract visits excepted) that came back for the same unit within W.
  out.repeat_fault_rate = completed
    .filter(j => j.jobType !== 'amc_visit')
    .map(j => {
      const matured = j.completedAt + W <= now;
      return jobRow(j, {
        counts: matured,
        inNumerator: matured && !!repeatOf(shop, j, W),
        note: matured ? null : 'window_open',
      });
    });
  // Contract renewal: contracts that ended in the period, renewed by their end plus the grace days.
  out.contract_renewal = shop.contracts
    .filter(c => inRange(c.endsAt) && ['active', 'renewed', 'expired'].includes(c.status))
    .map(c => {
      const judged = c.endsAt + s.renewalGraceDays * DAY <= now || !!c.renewedToId;
      return {
        entityType: 'contract',
        entity: c,
        contract: c,
        contactId: c.contactId,
        counts: judged,
        inNumerator: !!c.renewedToId,
        note: judged ? null : 'window_open',
      };
    });
  // Jobs past promise, as of now: the booked window ended with no arrival, or parts are past their expected date.
  out.jobs_past_promise = shop.jobs
    .filter(j => OPEN_JOB.has(j.status))
    .flatMap(j => {
      const late = shop.visitsOf(j._id).find(v => arrivalUnrecorded(v, now)),
        parts = j.status === 'waiting_parts' && j.partsExpectedAt && j.partsExpectedAt <= now;
      return late || parts
        ? [
            jobRow(j, {
              counts: true,
              inNumerator: true,
              durationMs: now - (late ? late.endsAt : j.partsExpectedAt),
              note: late ? 'window_passed' : 'parts_late',
            }),
          ]
        : [];
    });
  // Average ticket: the charged revenue of completed jobs (contract visits are paid by their contract).
  out.average_ticket = completed
    .filter(j => j.orderId)
    .map(j => jobRow(j, { counts: true, inNumerator: true, amountMinor: revenueOf(shop.orderOf(j.orderId)) }));
  // Receivables, as of now: every open balance on a completed job or a contract, aged from when it was charged.
  out.receivables = [
    ...shop.jobs
      .filter(j => j.status === 'completed' && balanceOf(shop.orderOf(j.orderId)) > 0)
      .map(j =>
        jobRow(j, {
          counts: true,
          inNumerator: true,
          amountMinor: balanceOf(shop.orderOf(j.orderId)),
          durationMs: now - j.completedAt,
          note: ageBucket(now - j.completedAt),
        }),
      ),
    ...shop.contracts
      .filter(c => c.acceptedAt && balanceOf(shop.orderOf(c.orderId)) > 0)
      .map(c => ({
        entityType: 'contract',
        entity: c,
        contract: c,
        contactId: c.contactId,
        counts: true,
        inNumerator: true,
        amountMinor: balanceOf(shop.orderOf(c.orderId)),
        durationMs: now - c.acceptedAt,
        note: ageBucket(now - c.acceptedAt),
      })),
  ];
  return out;
}

/** A metric's value from its rows. An average ticket is revenue ÷ jobs; the rest use the shared arithmetic. */
export function summarize(id, rows) {
  if (KIND[id] === 'average') {
    const counted = rows.filter(r => r.counts),
      total = counted.reduce((sum, r) => sum + (r.amountMinor || 0), 0);
    return {
      value: counted.length ? Math.round(total / counted.length) : null,
      numerator: total,
      denominator: counted.length,
      notes: {},
    };
  }
  return summarizeRows(KIND[id], rows);
}

/** Revenue per technician-day: completed jobs' revenue in the period ÷ distinct technician-days with an arrival. */
export function revenuePerTechDay(shop, range, tz) {
  const days = new Set(
    shop.visits
      .filter(v => v.arrivedAt && v.arrivedAt >= range.from && v.arrivedAt < range.to)
      .map(v => `${v.technicianAccountId}:${formatLocal(v.arrivedAt, tz).slice(0, 10)}`),
  );
  const revenue = shop.jobs
    .filter(j => j.status === 'completed' && j.completedAt >= range.from && j.completedAt < range.to)
    .reduce((sum, j) => sum + revenueOf(shop.orderOf(j.orderId)), 0);
  return { value: days.size ? Math.round(revenue / days.size) : null, numerator: revenue, denominator: days.size };
}

/** The contract book, as of now: active contracts, units covered, visits due soon and renewals due within the horizon. */
export function contractBook(shop, s, now) {
  const active = shop.contracts.filter(c => c.status === 'active' && c.endsAt > now);
  const soon = shop.jobs.filter(
    j => j.source === 'contract' && OPEN_JOB.has(j.status) && (shop.contractVisitDue(j) ?? Infinity) <= now + 30 * DAY,
  ).length;
  return {
    active: active.length,
    units: new Set(active.flatMap(c => c.unitIds.map(String))).size,
    visitsDue30d: soon,
    renewalsDue: active.filter(c => !c.renewedToId && c.endsAt - now <= s.renewalHorizonDays * DAY).length,
    annualValueMinor: active.reduce(
      (sum, c) => sum + Math.round((c.priceMinor * (365 * DAY)) / Math.max(DAY, c.endsAt - c.startsAt)),
      0,
    ),
  };
}

/** Which slice of a breakdown a row falls in. */
export function segmentOf(dimension, row, shop, tz) {
  const job = row.job,
    unit = row.unit || (job ? shop.unitById.get(String(job.unitIds[0])) : null);
  if (dimension === 'unit_type') return unit?.unitType || 'unknown';
  if (dimension === 'month') {
    const t = row.entity?.completedAt || row.entity?.requestedAt || row.entity?.startsAt || row.entity?.endsAt;
    return t ? formatLocal(t, tz).slice(0, 7) : 'unknown';
  }
  if (row.contract) return dimension === 'contract' ? 'contract' : 'not_applicable';
  if (!job) return 'not_applicable';
  if (dimension === 'job_type') return job.jobType;
  if (dimension === 'area') return job.area || unit?.area || 'unknown';
  if (dimension === 'contract') return job.contractId ? 'contract' : 'one_off';
  return job.urgent ? 'urgent' : 'routine';
}
