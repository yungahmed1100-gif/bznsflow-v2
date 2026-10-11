// Dental's pure browser helpers: the form → operation mapping (times read in the clinic's
// timezone, money entered in OMR), what the API keeps of each payload, and refusals worded for the
// dental pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDentalSubmission } from '../src/lib/hasib/dentalWork.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { createHasibStrings } from '../src/lib/hasib/strings.js';
import { label, QUICK, SELF_CLOSING } from '../src/components/hasib/dental/labels.js';

const R = '00000000-0000-4000-8000-000000000000';

test('forms map to operations; visit times are Muscat wall time; charges and payments are entered in OMR', () => {
  const v = buildDentalSubmission('visit', { contactId: 'p1', providerId: 'd1', chairId: 'c1', startsAt: '2026-11-01T17:30', minutes: '45', forMinor: true, guardianContactId: 'g1' }, { requestId: R, timezone: 'Asia/Muscat' });
  assert.equal(v.operation, 'dental_visit_book');
  assert.deepEqual(v.body.dental, { providerId: 'd1', chairId: 'c1', startsAt: Date.UTC(2026, 10, 1, 13, 30), durationMinutes: 45, source: 'staff', forMinor: true, guardianContactId: 'g1' });
  const c = buildDentalSubmission('charge', { visitId: 'v1', version: 3, lines: [{ variantId: 'x', qty: '1', price: '' }, { variantId: 'y', qty: '2', price: '95.5' }, { variantId: '', qty: '1' }] }, { requestId: R });
  assert.deepEqual(c.body.lines, [{ variantId: 'x', qty: 1 }, { variantId: 'y', qty: 2, unitPriceMinor: 95500 }]);
  assert.deepEqual(buildDentalSubmission('payment', { visitId: 'v1', amount: '12.5', method: 'card' }, { requestId: R }).body, { requestId: R, visitId: 'v1', amountMinor: 12500, method: 'card' });
  assert.equal(buildDentalSubmission('recall', { visitId: 'v1', version: 4, recallDate: '2027-04-10' }, { timezone: 'Asia/Muscat' }).body.dental.recallDueAt, Date.UTC(2027, 3, 10, 5, 0));
  assert.deepEqual(buildDentalSubmission('recall', { visitId: 'v1', version: 4, clear: true }, {}).body.dental, { clearRecall: true });
  assert.deepEqual(buildDentalSubmission('supply', { variantId: 'g', direction: 'out', qty: '3' }, { requestId: R }).body, { requestId: R, variantId: 'g', delta: -3, reason: 'damage' });
  assert.equal(buildDentalSubmission('cancel', { visitId: 'v1', version: 2, reason: 'patient_request' }, {}).body.status, 'cancelled');
  assert.equal(buildDentalSubmission('nothing', {}, {}), null);
});

test('the API keeps the typed dental payload, requires a request id for new records and drops anything clinical', () => {
  assert.deepEqual(hasibArgs('dental_recall_set', { visitId: 'abc123', version: 3, dental: { recallDueAt: 99, reason: 'gum disease', notes: 'x' } }).dental, { recallDueAt: 99 });
  assert.throws(() => hasibArgs('dental_visit_book', { contactId: 'abc123', dental: { providerId: 'p1' } }), /invalid_request/);
  assert.deepEqual(hasibArgs('dental_charge', { requestId: R, visitId: 'abc123', version: 1, lines: [{ variantId: 'v1', qty: 1, name: 'free text', note: 'pain' }] }).lines, [{ variantId: 'v1', qty: 1 }]);
  assert.deepEqual(hasibArgs('settings_update', { dentalSettings: { lateCancelHours: 12, rules: [{ id: 'recall', enabled: false, mode: 'task', offsetMinutes: 20160 }] } }).dentalSettings,
    { lateCancelHours: 12, rules: [{ id: 'recall', enabled: false, mode: 'task', offsetMinutes: 20160 }] });
});

test('refusals read as sentences on the dental pack, and keep each sector’s own wording', () => {
  const en = createHasibStrings('en', 'dental'), ar = createHasibStrings('ar', 'dental');
  assert.match(en.reason('provider_busy'), /provider is booked/);
  assert.match(ar.reason('guardian_required'), /ولي الأمر/);
  assert.match(en.reason('task_closes_itself'), /by itself/);
  assert.equal(label('status', 'unknown', false), 'Outcome not recorded');
  assert.deepEqual(QUICK, ['all', 'today', 'unconfirmed', 'missed', 'followupDue']);
  assert.equal(SELF_CLOSING.has('charges_unrecorded'), true);
});
