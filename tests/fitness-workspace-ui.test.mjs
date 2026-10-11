// Fitness's pure browser helpers: the form → operation mapping (times read in the gym's timezone,
// money entered in OMR), what the API keeps of each payload, and refusals worded for the fitness pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFitnessSubmission } from '../src/lib/hasib/fitnessWork.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { createHasibStrings } from '../src/lib/hasib/strings.js';
import { label, QUICK, SELF_CLOSING } from '../src/components/hasib/fitness/labels.js';

const R = '00000000-0000-4000-8000-000000000000';

test('forms map to operations; class times are Muscat wall time; prices are entered in OMR', () => {
  const k = buildFitnessSubmission('class', { title: 'HIIT', classType: 'hiit', startsAt: '2026-11-01T06:00', minutes: '50', capacity: '12', coachName: 'Salim' }, { requestId: R, timezone: 'Asia/Muscat' });
  assert.equal(k.operation, 'fitness_class_save');
  assert.equal(k.body.fitness.startsAt, Date.UTC(2026, 10, 1, 2, 0));
  assert.equal(k.body.fitness.endsAt - k.body.fitness.startsAt, 50 * 60000);
  const plan = buildFitnessSubmission('plan', { name: '10-class pack', kind: 'class_pack', termDays: '60', billingMonths: '1', price: '45.5', credits: '10', freezeMaxDays: '0', graceDays: '0' }, { requestId: R });
  assert.deepEqual(plan.body.fitness, { name: '10-class pack', kind: 'class_pack', termDays: 60, billingMonths: 1, priceMinor: 45500, credits: 10, freezeMaxDays: 0, graceDays: 0, active: true });
  assert.deepEqual(buildFitnessSubmission('payment', { membershipId: 'm1', amount: '30', method: 'cash' }, { requestId: R }).body, { requestId: R, membershipId: 'm1', amountMinor: 30000, method: 'cash' });
  assert.deepEqual(buildFitnessSubmission('book', { classId: 'c1', contactId: 'p1', trial: true, source: 'instagram' }, { requestId: R }).body.fitness, { trial: true, source: 'instagram' });
  assert.equal(buildFitnessSubmission('cancel_class', { classId: 'c1', version: 2, reason: 'Coach unwell' }, {}).body.fitness.cancel, true);
  assert.equal(buildFitnessSubmission('nothing', {}, {}), null);
});

test('the API keeps the typed Fitness payload, requires a request id for new records and drops unknown fields', () => {
  const args = hasibArgs('fitness_freeze', { membershipId: 'abc123', version: 3, fitness: { days: 7, diagnosis: 'knee' } });
  assert.deepEqual(args.fitness, { days: 7 });
  assert.throws(() => hasibArgs('fitness_seat_book', { classId: 'abc123', contactId: 'def456' }), /invalid_request/);
  assert.equal(hasibArgs('fitness_plan_save', { planId: 'abc123', version: 2, fitness: { name: 'Monthly' } }).planId, 'abc123', 'an edit is identified by its plan');
  assert.deepEqual(hasibArgs('settings_update', { fitnessSettings: { gapDays: 21, rules: [{ id: 'renewal', enabled: true, mode: 'draft', offsetMinutes: 10080 }] } }).fitnessSettings,
    { gapDays: 21, rules: [{ id: 'renewal', enabled: true, mode: 'draft', offsetMinutes: 10080 }] });
});

test('refusals read as sentences on the fitness pack, and keep each sector’s own wording', () => {
  const en = createHasibStrings('en', 'fitness'), ar = createHasibStrings('ar', 'fitness');
  assert.match(en.reason('membership_required'), /need a membership/);
  assert.match(ar.reason('membership_frozen'), /مجمّدة/);
  assert.match(en.reason('invalid_assignment'), /from your team/);
  assert.match(createHasibStrings('en', 'media').reason('invalid_assignment'), /producer/);
  assert.equal(label('state', 'grace', false), 'Ended, not renewed');
  assert.deepEqual(QUICK, ['all', 'trialFollowUp', 'attendanceGap', 'expiring', 'frozen']);
  assert.equal(SELF_CLOSING.has('payment_due'), true);
});
