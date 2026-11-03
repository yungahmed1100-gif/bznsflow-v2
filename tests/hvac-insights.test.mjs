// HVAC Insights: golden values for every KPI from a small, fully known history. A rate with no
// eligible records is null, a window that has not closed is disclosed, the drill-down returns the
// exact population, and nothing crosses tenants.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shop, customer, unit, job, book, estimate, issue, completeJob, metric, value, refused, randomUUID, HOUR, DAY } from './fixtures/ascend/hvac.mjs';

/** A: on time, fixed first time, costed. B: arrived late and came back (E). C: window passed, no arrival. D: estimate never answered. */
async function history() {
  const c = await shop();
  value(await c.manager('settings_update', { hvacSettings: { repeatWindowDays: 7, estimateWindowDays: 3, bookingWindowDays: 2 } }));
  const [sara, ali, omar, huda] = [await customer(c, 'Sara'), await customer(c, 'Ali'), await customer(c, 'Omar'), await customer(c, 'Huda')];
  const uA = value(await unit(c, c.desk, sara.id)), uB = value(await unit(c, c.desk, ali.id, { unitType: 'ducted', label: 'Majlis ducted' }));
  const A = await completeJob(c, sara.id, { unitIds: [uA.id] });
  value(await c.manager('hvac_cost_save', { jobId: A.job._id, version: A.job.version, hvac: { costs: [{ kind: 'gas', label: 'R410A 1kg', amountMinor: 5000 }], costsComplete: true } }));
  const B = await completeJob(c, ali.id, { unitIds: [uB.id], arriveLateMs: 3 * HOUR });
  value(await c.tech('hvac_unit_service', { unitId: uA.id, version: c.h.m.table('hvacUnits').find(u => u._id === uA.id).version, hvac: { nextServiceAt: c.h.m.now() + 5 * DAY } }));
  const C = value(await job(c, c.desk, omar.id, { jobType: 'inspection' }));
  value(await book(c, c.desk, C.id, HOUR));
  const D = value(await job(c, c.desk, huda.id, { jobType: 'install' }));
  const e = value(await estimate(c, c.manager, D.id, c.cleaning, 3));
  value(await issue(c, c.manager, e.id));
  c.h.m.advance(DAY);
  const E = value(await job(c, c.desk, ali.id, { repeatOfId: B.job._id, unitIds: [uB.id] }));
  c.h.m.advance(9 * DAY);
  return { c, A, B, C, D, E };
}

test('every KPI has its golden value, numerator and denominator', async () => {
  const { c } = await history();
  const ins = value(await c.manager('hvac_insights', { period: '30d' }));
  const pick = id => { const m = metric(ins, id); return [m.value, m.numerator, m.denominator]; };
  assert.deepEqual(pick('on_time_arrival'), [33.3, 1, 3], 'A on time; B late; C’s window passed with no arrival');
  assert.deepEqual(metric(ins, 'on_time_arrival').notes, { unrecorded: 1 });
  assert.deepEqual(pick('first_time_fix'), [50, 1, 2], 'B came back for the same unit');
  assert.deepEqual(pick('repeat_fault_rate'), [50, 1, 2]);
  assert.deepEqual(pick('estimate_acceptance'), [66.7, 2, 3], 'D’s estimate window closed without a yes');
  assert.deepEqual(pick('booking_rate'), [60, 3, 5], 'D and the repeat request were never booked');
  assert.deepEqual(pick('maintenance_due'), [1, 1, 1], 'A’s unit passed the technician’s date with no job since');
  assert.deepEqual(pick('jobs_past_promise'), [1, 1, 1]);
  assert.deepEqual(pick('job_contribution'), [10000, 1, 2], 'only costed jobs count; B is disclosed');
  assert.deepEqual(metric(ins, 'job_contribution').notes, { costs_missing: 1 });
  assert.deepEqual(pick('average_ticket'), [15000, 30000, 2]);
  assert.deepEqual(pick('receivables'), [30000, 2, 2]);
  assert.deepEqual(ins.receivables, { '0_30': 30000, '31_60': 0, '60_plus': 0 });
  const ttfv = metric(ins, 'time_to_first_visit');
  assert.deepEqual([ttfv.value, ttfv.numerator, ttfv.denominator], [2.5 * HOUR, 2, 5]);
  assert.deepEqual(ins.revenuePerTechDay, { value: 30000, numerator: 30000, denominator: 1 });
  assert.equal(pick('contract_renewal')[0], null, 'no eligible records is null, never 0%');
  assert.deepEqual(metric(ins, 'on_time_arrival').reference, { atLeast: 95 }, 'benchmarks are reference only');
  assert.equal(metric(ins, 'on_time_arrival').trend.length, 8);
});

test('breakdowns slice the same populations, and a drill-down returns the exact records', async () => {
  const { c, A, B } = await history();
  const bySegment = value(await c.manager('hvac_insights', { period: '30d', segment: 'unit_type' })).segments;
  const row = key => bySegment.rows.find(r => r.key === key).values;
  assert.deepEqual([row('split').first_time_fix.value, row('ducted').first_time_fix.value], [100, 0]);
  refused(await c.manager('hvac_insights', { segment: 'technician' }), 'invalid_segment');
  const records = value(await c.manager('hvac_metric_records', { metric: 'first_time_fix', period: '30d' })).items;
  assert.deepEqual(records.map(r => [r.jobId, r.inNumerator]).sort(), [[A.job._id, true], [B.job._id, false]].sort());
  const late = value(await c.manager('hvac_metric_records', { metric: 'on_time_arrival', period: '30d' })).items;
  assert.deepEqual(late.map(r => r.note || null).sort(), [null, null, 'unrecorded'].sort());
  const urgent = value(await c.manager('hvac_metric_records', { metric: 'booking_rate', period: '30d', segment: 'job_type:install' })).items;
  assert.equal(urgent.length, 1);
  refused(await c.manager('hvac_metric_records', { metric: 'profit_by_tech' }), 'invalid_metric');
});

test('a window still open is disclosed, never counted as a miss; an empty business shows no eligible records', async () => {
  const c = await shop();
  const empty = value(await c.manager('hvac_insights', {}));
  for (const m of [...empty.headline, ...empty.diagnostics].filter(m => m.kind === 'rate')) assert.equal(m.value, null, m.id);
  const s = await customer(c, 'Fresh');
  await completeJob(c, s.id);
  const ins = value(await c.manager('hvac_insights', {}));
  assert.deepEqual([metric(ins, 'first_time_fix').value, metric(ins, 'first_time_fix').notes], [null, { window_open: 1 }]);
  assert.equal(metric(ins, 'on_time_arrival').value, 100);
});

test('Insights are the manager’s, and stay inside the tenant', async () => {
  const { c } = await history();
  refused(await c.desk('hvac_insights', {}), 'manager_required');
  refused(await c.tech('hvac_metric_records', { metric: 'on_time_arrival' }), 'manager_required');
  const other = await shop({ h: c.h, name: 'b', waba: '4321', phone: '8765', sender: '96890000001' });
  const ins = value(await other.manager('hvac_insights', { period: '30d' }));
  assert.equal(metric(ins, 'on_time_arrival').denominator, 0);
  assert.deepEqual(value(await other.manager('hvac_metric_records', { metric: 'receivables' })).items, []);
  assert.ok(randomUUID());
});
