// AC service's pure browser helpers: the form → operation mapping (windows read in the business's
// timezone, money entered in OMR), what the API keeps of each payload, and refusals worded for the
// hvac pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHvacSubmission } from '../src/lib/hasib/hvacWork.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { createHasibStrings } from '../src/lib/hasib/strings.js';
import { label, activityLabel, defaultChecks, QUICK, SELF_CLOSING, MOVES } from '../src/components/hasib/hvac/labels.js';
import { HVAC_METRICS } from '../src/components/hasib/hvac/metrics.js';
import { HVAC_HEADLINE, HVAC_DIAGNOSTIC } from '../convex/hasib/hvacMetrics.js';

const R = '00000000-0000-4000-8000-000000000000', tz = { requestId: R, timezone: 'Asia/Muscat' };

test('forms map to operations; visit windows are Muscat wall time; money is entered in OMR', () => {
  const v = buildHvacSubmission('visit', { jobId: 'j1', technicianAccountId: 't1', date: '2026-11-04', from: '09:00', to: '11:30' }, tz);
  assert.deepEqual(v, { operation: 'hvac_visit_save', body: { requestId: R, jobId: 'j1', hvac: { technicianAccountId: 't1', startsAt: Date.UTC(2026, 10, 4, 5, 0), endsAt: Date.UTC(2026, 10, 4, 7, 30) } } });
  assert.deepEqual(buildHvacSubmission('visit', { visitId: 'v1', version: 2, technicianAccountId: 't1', date: '2026-11-04', from: '13:00', to: '14:00' }, tz).body, { visitId: 'v1', version: 2,
    hvac: { technicianAccountId: 't1', startsAt: Date.UTC(2026, 10, 4, 9), endsAt: Date.UTC(2026, 10, 4, 10) } }, 'moving a visit keeps the same record');
  const e = buildHvacSubmission('estimate', { jobId: 'j1', lines: [{ kind: 'service', name: 'Gas refill', variantId: 'g', qty: '1', price: '15' }, { kind: 'part', name: 'Capacitor', qty: '2', price: '4.5' }, { name: '', qty: '1', price: '' }] }, tz);
  assert.deepEqual(e.body.hvac.lines, [{ kind: 'service', name: 'Gas refill', variantId: 'g', qty: 1, unitPriceMinor: 15000 }, { kind: 'part', name: 'Capacitor', qty: 2, unitPriceMinor: 4500 }]);
  const job = buildHvacSubmission('job', { contactId: 'c1', jobType: 'repair', unitIds: ['u1'], urgent: true, reportedSymptom: 'not_cooling', repeatOfId: 'j0' }, tz);
  assert.deepEqual(job.body, { requestId: R, contactId: 'c1', hvac: { jobType: 'repair', unitIds: ['u1'], urgent: true, reportedSymptom: 'not_cooling', source: 'staff', repeatOfId: 'j0' } });
  assert.deepEqual(buildHvacSubmission('contract', { contactId: 'c1', unitIds: ['u1', 'u2'], visitsPerYear: '4', price: '60', startsOn: '2026-11-03' }, tz).body,
    { requestId: R, contactId: 'c1', hvac: { unitIds: ['u1', 'u2'], visitsPerYear: 4, startsAt: Date.UTC(2026, 10, 2, 20), priceMinor: 60000 } });
  assert.equal(buildHvacSubmission('service', { unitId: 'u1', version: 3, serviceOn: '2027-02-01' }, tz).body.hvac.nextServiceAt, Date.UTC(2027, 1, 1, 5));
  assert.deepEqual(buildHvacSubmission('service', { unitId: 'u1', version: 3, clear: true }, tz).body.hvac, { clearService: true });
  assert.deepEqual(buildHvacSubmission('checklist', { jobId: 'j1', version: 2, checks: [{ text: ' Pressure ', result: 'pass' }, { text: '', result: 'fail' }], findings: 'ok' }, tz).body.hvac,
    { checklist: [{ text: 'Pressure', result: 'pass' }], findings: 'ok' });
  assert.deepEqual(buildHvacSubmission('payment', { contractId: 'k1', amount: '22.5', method: 'cash' }, tz).body, { requestId: R, contractId: 'k1', amountMinor: 22500, method: 'cash' });
  assert.equal(buildHvacSubmission('parts', { jobId: 'j1', version: 1, partsLabel: 'Fan motor' }, tz).body.status, 'waiting_parts');
  assert.equal(buildHvacSubmission('nothing', {}, tz), null);
});

test('the API keeps the typed hvac payload, requires a request id for new records and drops anything else', () => {
  assert.deepEqual(hasibArgs('hvac_job_save', { requestId: R, contactId: 'abc123', hvac: { jobType: 'repair', diagnosis: 'compressor dead', reportedSymptom: 'not_cooling' } }).hvac, { jobType: 'repair', reportedSymptom: 'not_cooling' });
  assert.throws(() => hasibArgs('hvac_job_save', { contactId: 'abc123', hvac: {} }), /invalid_request/);
  assert.doesNotThrow(() => hasibArgs('hvac_job_save', { jobId: 'abc123', version: 2, hvac: {} }), 'an edit names its record instead');
  assert.deepEqual(hasibArgs('settings_update', { hvacSettings: { arrivalGraceMinutes: 45, serviceAreas: ['Seeb', 7, 'Ruwi'], rules: [{ id: 'amc_renewal', enabled: true, mode: 'auto', offsetMinutes: 43200 }] } }).hvacSettings,
    { arrivalGraceMinutes: 45, serviceAreas: ['Seeb', 'Ruwi'], rules: [{ id: 'amc_renewal', enabled: true, mode: 'auto', offsetMinutes: 43200 }] });
});

test('refusals read as sentences on the hvac pack, labels are bilingual, and every KPI has a definition', () => {
  const en = createHasibStrings('en', 'hvac'), ar = createHasibStrings('ar', 'hvac');
  assert.match(en.reason('technician_busy'), /technician is booked/);
  assert.match(ar.reason('estimate_changed'), /تسعيرة أحدث/);
  assert.match(en.reason('task_closes_itself'), /by itself/);
  assert.equal(createHasibStrings('en', 'dental').reason('technician_busy'), null, 'another pack keeps its own words');
  assert.deepEqual([label('status', 'estimate_pending', false), label('status', 'estimate_pending', true)], ['Estimate with customer', 'التسعيرة لدى العميل']);
  assert.equal(activityLabel('resumed:repairing', false), 'Resumed (Repairing)');
  assert.deepEqual(defaultChecks(true).map(c => c.result), ['pass', 'pass', 'pass', 'pass']);
  assert.deepEqual(QUICK, ['all', 'today', 'unassigned', 'partsNeeded', 'serviceDue', 'followupDue']);
  assert.equal(SELF_CLOSING.has('arrival_unrecorded'), true);
  assert.deepEqual(MOVES.tested, ['completed']);
  for (const id of [...HVAC_HEADLINE, ...HVAC_DIAGNOSTIC]) {
    assert.ok(HVAC_METRICS[id], `${id} has a definition`);
    const s = { arrivalGraceMinutes: 30, repeatWindowDays: 30, estimateWindowDays: 14, bookingWindowDays: 7, renewalGraceDays: 14 };
    assert.ok(HVAC_METRICS[id].def(s, false).length > 40 && HVAC_METRICS[id].def(s, true).length > 40, `${id} explains itself in both languages`);
  }
});
