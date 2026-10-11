// Dental clinics (ascend/dental.md + ascend/implementation/dental.md, task B06): the six-tab map,
// the visit lifecycle with its automatic tasks and drafts, all eight primary events, the B06
// synthetic journey, the acceptance cases, the eight KPIs, Follow-ups, roles and tenant isolation.
// Runs the real Hasib entry point on the in-memory Convex with the fixture clock; nothing reaches
// a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { clinic, patient, book, status, visitRow, record, metric, value, refused, randomUUID, DAY, HOUR, MIN } from './fixtures/ascend/dental.mjs';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { dashboardMap, resolveTab } from '../src/lib/dashboard/navigation.js';
import { isLivePack } from '../config/hasib-packs.js';

const tasks = (c, kind) => c.h.m.table('dentalTasks').filter(t => t.kind === kind && t.status === 'open');
const drafts = (c, kind, status = 'draft') => c.h.m.table('dentalDrafts').filter(d => d.kind === kind && (!status || d.status === status));
const refresh = c => c.manager('dental_followups').then(value);
const charge = (c, id, lines) => c.manager('dental_charge', { visitId: id, version: visitRow(c, id).version, requestId: randomUUID(), lines: lines || [{ variantId: c.checkup.variants[0].id, qty: 1 }] });
const CLINICAL = /pain|tooth hurts|bleed|swollen|toothache|ألم|وجع/i;

test('six tabs with Visits as Work; a receptionist sees Chats, Visits and Customers; old links land in the new places', async () => {
  const c = await clinic();
  const m = value(await c.manager('overview'));
  assert.equal(m.pack.ownerUi.work.en, 'Visits');
  assert.equal(m.pack.ownerUi.work.ar, 'الزيارات');
  const map = dashboardMap(m, m.capabilities);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['schedule', 'visits', 'services', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'business', 'channels', 'accounts']);
  const e = value(await c.desk('overview'));
  assert.deepEqual(dashboardMap(e, e.capabilities, 'employee').sections, ['chats', 'work', 'customers']);
  for (const [tab, expected] of [['today', ['work', 'schedule']], ['orders', ['work', 'visits']], ['stock', ['work', 'services']], ['money', ['insights', null]], ['team', ['settings', 'team']], ['nothing', ['work', 'schedule']]])
    assert.deepEqual(Object.values(resolveTab(tab, null, map)), expected, `${tab} → ${expected}`);
});

test('dental stays a live pack and its operations are closed to other sectors; the API keeps only the typed payload', async () => {
  const c = await clinic();
  assert.equal(isLivePack('dental'), true);
  assert.notEqual(c.h.m.ctx.hasibPreview, true);
  value(await c.manager('dental_overview'));
  refused(await c.manager('fitness_overview'), 'module_unavailable');
  assert.deepEqual(hasibArgs('dental_visit_book', { requestId: randomUUID(), contactId: 'abc123', dental: { providerId: 'p1', startsAt: 5, notes: 'toothache', diagnosis: 'x' } }).dental, { providerId: 'p1', startsAt: 5 });
  assert.equal(hasibArgs('dental_visit_book', { requestId: randomUUID(), notes: 'pain' }).notes, undefined, 'there is no notes field at all');
});

test('providers and chairs: validated, replayed, manager-only; one with visits still to come cannot be switched off', async () => {
  const c = await clinic(), now = c.h.m.now();
  refused(await c.manager('dental_resource_save', { requestId: randomUUID(), dental: { kind: 'room', name: 'X' } }), 'invalid_resource');
  const requestId = randomUUID();
  const r = value(await c.manager('dental_resource_save', { requestId, dental: { kind: 'provider', name: 'Dr Omar' } }));
  assert.equal(value(await c.manager('dental_resource_save', { requestId, dental: { kind: 'provider', name: 'Other' } })).id, r.id, 'a replay returns the same provider');
  refused(await c.desk('dental_resource_save', { requestId: randomUUID(), dental: { kind: 'chair', name: 'Chair 2' } }), 'manager_required');
  const p = await patient(c, 'Aisha');
  value(await book(c, c.manager, p.id, now + 2 * HOUR));
  refused(await c.manager('dental_resource_save', { dental: { resourceId: c.provider.id, active: false }, version: c.provider.version }), 'resource_has_visits');
  assert.deepEqual(value(await c.desk('dental_resources')).items.map(x => [x.kind, x.name]), [['chair', 'Chair 1'], ['provider', 'Dr Omar'], ['provider', 'Dr Salma']]);
});

test('booking: provider, chair and patient clashes are refused; a minor needs a guardian; only catalogue treatments; a replay books once', async () => {
  const c = await clinic(), now = c.h.m.now();
  const [a, b, kid, mum] = [await patient(c, 'Aisha'), await patient(c, 'Badr'), await patient(c, 'Kid'), await patient(c, 'Mum')];
  const requestId = randomUUID();
  const v = value(await c.manager('dental_visit_book', { requestId, contactId: a.id, dental: { providerId: c.provider.id, chairId: c.chair.id, startsAt: now + 2 * HOUR } }));
  assert.equal(value(await c.manager('dental_visit_book', { requestId, contactId: a.id, dental: { providerId: c.provider.id, startsAt: now + 9 * HOUR } })).id, v.id);
  assert.equal(c.h.m.table('dentalVisits').length, 1);
  refused(await book(c, c.manager, b.id, now + 2 * HOUR + 10 * MIN, { chairId: undefined }), 'provider_busy');
  const other = value(await c.manager('dental_resource_save', { requestId: randomUUID(), dental: { kind: 'provider', name: 'Dr Omar' } }));
  refused(await book(c, c.manager, b.id, now + 2 * HOUR + 10 * MIN, { providerId: other.id }), 'chair_busy');
  refused(await book(c, c.manager, a.id, now + 2 * HOUR + 10 * MIN, { providerId: other.id, chairId: undefined }), 'patient_booking_conflict');
  value(await book(c, c.manager, b.id, now + 2 * HOUR + 30 * MIN), 'back to back is fine');
  refused(await book(c, c.manager, kid.id, now + 5 * HOUR, { forMinor: true }), 'guardian_required');
  refused(await book(c, c.manager, kid.id, now + 5 * HOUR, { forMinor: true, guardianContactId: kid.id }), 'guardian_required');
  const child = value(await book(c, c.desk, kid.id, now + 5 * HOUR, { forMinor: true, guardianContactId: mum.id }));
  assert.equal(String(child.guardianContactId), String(mum.id));
  refused(await book(c, c.manager, a.id, now + 30 * HOUR, { serviceItemId: c.h.m.table('hasibItems').find(i => i.kind === 'product')?._id || 'hasibItems_999' }), 'service_not_found');
  refused(await book(c, c.manager, a.id, now + 30 * HOUR, { providerId: c.chair.id }), 'provider_required');
});

test('B06 journey: a new patient books, reschedules, arrives and completes — one attended new-patient visit, no stale reminder, no invented recall; a minor without a guardian stays a request', async () => {
  const c = await clinic(), now = c.h.m.now();
  // Layla's intake: the request is a task with no copied text, clinical words included.
  const p = await patient(c, 'Huda', 'I want a cleaning tomorrow 5pm, my tooth hurts');
  assert.equal(tasks(c, 'visit_request').length, 1);
  assert.equal(c.h.m.table('dentalTasks').some(t => CLINICAL.test(t.reason)), false);
  const v = value(await book(c, c.desk, p.id, now + 30 * HOUR, { source: 'layla' }));
  await refresh(c);
  assert.equal(tasks(c, 'visit_request').length, 0, 'booking closes the request by itself');
  // The confirmation is drafted when the visit is a day away.
  c.h.m.advance(7 * HOUR);
  await refresh(c);
  assert.equal(drafts(c, 'visit_confirmation').length, 1);
  const first = drafts(c, 'visit_confirmation')[0];
  value(await c.desk('dental_visit_reschedule', { visitId: v.id, version: visitRow(c, v.id).version, dental: { startsAt: now + 3 * DAY } }));
  await refresh(c);
  assert.equal(c.h.m.table('dentalDrafts').find(d => d._id === first._id).status, 'cancelled', 'the old reminder version is withdrawn');
  assert.equal(drafts(c, 'visit_confirmation').length, 0, 'the new time is not a day away yet');
  c.h.m.advance(2 * DAY);
  await refresh(c);
  assert.equal(drafts(c, 'visit_confirmation').length, 1, 'regenerated for the new time');
  assert.match(drafts(c, 'visit_confirmation')[0].text, /appointment|الموعد/);
  assert.doesNotMatch(drafts(c, 'visit_confirmation')[0].text, /clean|تنظيف|check-up|Scaling/i, 'no treatment named');
  value(await status(c, c.desk, v.id, 'confirmed'));
  await refresh(c);
  assert.equal(drafts(c, 'visit_confirmation').length, 0, 'confirming withdraws the unsent reminder');
  c.h.m.advance(DAY - 7 * HOUR - HOUR);
  refused(await status(c, c.desk, v.id, 'completed'), 'invalid_transition');
  value(await status(c, c.desk, v.id, 'arrived'));
  value(await status(c, c.desk, v.id, 'completed'));
  c.h.m.advance(HOUR);
  const ins = value(await c.manager('dental_insights', { period: '7d' }));
  assert.deepEqual([metric(ins, 'visit_attendance').numerator, metric(ins, 'visit_attendance').denominator], [1, 1], 'arrived then completed counts once');
  const seg = value(await c.manager('dental_insights', { period: '7d', segment: 'patient_type' })).segments.rows.find(r => r.key === 'new');
  assert.equal(seg.values.visit_attendance.numerator, 1, 'one attended new-patient visit');
  await refresh(c);
  assert.equal(c.h.m.table('dentalDrafts').some(d => d.kind === 'recall'), false, 'no recall without a clinician-set date');
  // A minor whose guardian is not recorded: the request stays open as needs input.
  const kid = await patient(c, 'Kid', 'I would like a check-up next week');
  refused(await book(c, c.desk, kid.id, c.h.m.now() + 2 * DAY, { forMinor: true }), 'guardian_required');
  await refresh(c);
  assert.equal(tasks(c, 'visit_request').filter(t => t.entityId === String(kid.id)).length, 1);
  for (const row of [...c.h.m.table('dentalTasks'), ...c.h.m.table('dentalDrafts'), ...c.h.m.table('dentalVisits')]) assert.doesNotMatch(JSON.stringify(row), CLINICAL, 'no clinical text anywhere');
});

test('status guards: arrival waits for the visit, missed waits for its end, a cancellation needs a reason and keeps whether it was late; a wrong missed is corrected', async () => {
  const c = await clinic(), now = c.h.m.now();
  const p = await patient(c, 'Aisha'), q = await patient(c, 'Badr');
  const v = value(await book(c, c.manager, p.id, now + 3 * HOUR));
  refused(await status(c, c.desk, v.id, 'arrived'), 'visit_not_started');
  refused(await status(c, c.desk, v.id, 'missed'), 'visit_not_finished');
  refused(await status(c, c.desk, v.id, 'cancelled'), 'cancellation_reason_required');
  value(await status(c, c.desk, v.id, 'cancelled', { reason: 'patient_request' }));
  assert.equal(visitRow(c, v.id).lateCancel, true, 'inside the 24-hour cutoff');
  const w = value(await book(c, c.manager, q.id, now + 3 * DAY));
  value(await status(c, c.desk, w.id, 'cancelled', { reason: 'clinic_request' }));
  assert.equal(visitRow(c, w.id).lateCancel, false);
  const x = value(await book(c, c.manager, q.id, now + HOUR));
  c.h.m.advance(2 * HOUR);
  value(await status(c, c.desk, x.id, 'missed'));
  value(await status(c, c.desk, x.id, 'arrived'));
  assert.equal(visitRow(c, x.id).history.at(-1).kind, 'attendance_corrected');
  value(await status(c, c.desk, x.id, 'completed', { reason: 'patient said tooth hurts' }));
  assert.equal(JSON.stringify(visitRow(c, x.id).history).includes('tooth'), false, 'only a fixed cancellation reason is ever kept');
  refused(await c.desk('dental_visit_status', { visitId: x.id, version: 1, status: 'completed' }), 'visit_conflict');
});

test('attendance unrecorded: a past visit with no outcome is unknown, opens a task that only the outcome closes', async () => {
  const c = await clinic(), now = c.h.m.now();
  const p = await patient(c, 'Aisha');
  const v = value(await book(c, c.manager, p.id, now + HOUR));
  c.h.m.advance(2 * HOUR);
  const q = await refresh(c);
  const t = q.items.find(i => i.kind === 'attendance_unrecorded');
  assert.ok(t?.selfClosing);
  refused(await c.desk('dental_task_resolve', { taskId: t.id }), 'task_closes_itself');
  assert.equal(value(await c.desk('dental_visits', { filter: 'followupDue' })).items[0].outcome, 'unknown');
  value(await status(c, c.desk, v.id, 'arrived'));
  await refresh(c);
  assert.equal(tasks(c, 'attendance_unrecorded').length, 0);
});

test('missed visit: one rebook task and one recovery draft; rebooking closes both; a declined patient is not messaged', async () => {
  const c = await clinic(), now = c.h.m.now();
  const [a, b] = [await patient(c, 'Aisha'), await patient(c, 'Badr')];
  const va = value(await book(c, c.manager, a.id, now + HOUR));
  c.h.m.advance(2 * HOUR);
  value(await status(c, c.desk, va.id, 'missed'));
  await refresh(c); await refresh(c);
  assert.equal(tasks(c, 'rebook_missed').length, 1);
  assert.equal(drafts(c, 'missed_recovery').length, 0, 'the recovery waits for its offset');
  c.h.m.advance(2 * HOUR);
  await refresh(c); await refresh(c);
  assert.equal(drafts(c, 'missed_recovery').length, 1, 'once, however often the queue is read');
  value(await book(c, c.desk, a.id, c.h.m.now() + DAY, { replacementForId: va.id }));
  await refresh(c);
  assert.equal(tasks(c, 'rebook_missed').length, 0);
  assert.equal(drafts(c, 'missed_recovery').length, 0, 'rebooking withdraws the unsent recovery message');
  // A second patient declines: closing the task with "declined" stops the message.
  const vb2 = value(await book(c, c.manager, b.id, c.h.m.now() + 30 * MIN, { chairId: undefined }));
  c.h.m.advance(2 * HOUR);
  value(await status(c, c.desk, vb2.id, 'missed'));
  await refresh(c);
  const task = tasks(c, 'rebook_missed').find(t => t.entityId === String(vb2.id));
  value(await c.desk('dental_task_resolve', { taskId: task._id, reason: 'declined' }));
  c.h.m.advance(3 * HOUR);
  await refresh(c);
  assert.equal(drafts(c, 'missed_recovery').filter(d => String(d.visitId) === String(vb2.id)).length, 0);
});

test('charges: completion opens Record charges for the manager only; charges become the visit order; a balance past due drafts once; paying, disputing or refunding stops it', async () => {
  const c = await clinic(), now = c.h.m.now();
  const p = await patient(c, 'Aisha');
  const v = value(await book(c, c.manager, p.id, now + HOUR));
  refused(await charge(c, v.id), 'visit_not_attended');
  c.h.m.advance(HOUR);
  value(await status(c, c.desk, v.id, 'arrived'));
  value(await status(c, c.desk, v.id, 'completed'));
  assert.equal(value(await c.manager('dental_followups')).items.filter(i => i.kind === 'charges_unrecorded').length, 1);
  assert.equal(value(await c.desk('dental_followups')).items.some(i => i.kind === 'charges_unrecorded'), false, 'receptionists never see money tasks');
  refused(await c.desk('dental_charge', { visitId: v.id, version: visitRow(c, v.id).version, requestId: randomUUID(), lines: [{ variantId: c.checkup.variants[0].id, qty: 1 }] }), 'manager_required');
  const requestId = randomUUID(), args = { visitId: v.id, version: visitRow(c, v.id).version, requestId, lines: [{ variantId: c.checkup.variants[0].id, qty: 1 }, { variantId: c.scaling.variants[0].id, qty: 1 }] };
  value(await c.manager('dental_charge', args));
  value(await c.manager('dental_charge', args));
  assert.equal(c.h.m.table('hasibOrders').length, 1, 'a replayed charge writes nothing');
  refused(await charge(c, v.id), 'charges_recorded');
  const r = await record(c.manager, v.id);
  assert.deepEqual([r.charges.totalMinor, r.charges.balanceMinor, r.charges.lines.map(l => l.nameEn)], [30000, 30000, ['Check-up', 'Scaling']]);
  assert.equal((await record(c.desk, v.id)).charges, null, 'no amounts for a receptionist');
  assert.equal('money' in (await record(c.desk, v.id)), false);
  await refresh(c);
  assert.equal(tasks(c, 'charges_unrecorded').length, 0);
  c.h.m.advance(8 * DAY + HOUR);
  await refresh(c); await refresh(c);
  assert.equal(tasks(c, 'balance_overdue').length, 1);
  assert.equal(drafts(c, 'balance_due').length, 1);
  assert.match(drafts(c, 'balance_due')[0].text, /30\.000 OMR|٣٠|30\.000/);
  value(await c.manager('dental_charge_dispute', { visitId: v.id, version: visitRow(c, v.id).version, dental: { disputed: true } }));
  await refresh(c);
  assert.equal(drafts(c, 'balance_due').length, 0, 'a dispute pauses the reminder');
  assert.equal(tasks(c, 'balance_overdue').length, 0);
  value(await c.manager('dental_charge_dispute', { visitId: v.id, version: visitRow(c, v.id).version, dental: { disputed: false } }));
  value(await c.manager('dental_payment_record', { visitId: v.id, requestId: randomUUID(), amountMinor: 30000, method: 'cash' }));
  await refresh(c);
  assert.equal(tasks(c, 'balance_overdue').length, 0);
  assert.equal(drafts(c, 'balance_due').length, 0);
  refused(await c.desk('dental_payment_record', { visitId: v.id, requestId: randomUUID(), amountMinor: 1000, method: 'cash' }), 'manager_required');
});

test('recall: only a clinician-set date on a completed visit; reminders at 14 and 3 days before; changing the date withdraws the old one; booking stops them', async () => {
  const c = await clinic(), now = c.h.m.now();
  const p = await patient(c, 'Aisha');
  const v = value(await book(c, c.manager, p.id, now + HOUR));
  refused(await c.desk('dental_recall_set', { visitId: v.id, version: visitRow(c, v.id).version, dental: { recallDueAt: now + 60 * DAY } }), 'visit_not_completed');
  c.h.m.advance(HOUR);
  value(await status(c, c.desk, v.id, 'arrived'));
  value(await status(c, c.desk, v.id, 'completed'));
  refused(await c.desk('dental_recall_set', { visitId: v.id, version: visitRow(c, v.id).version, dental: { recallDueAt: now - DAY } }), 'invalid_recall');
  value(await c.desk('dental_recall_set', { visitId: v.id, version: visitRow(c, v.id).version, dental: { recallDueAt: now + 30 * DAY } }));
  assert.ok(visitRow(c, v.id).recallSetBy, 'who recorded the clinician date is kept');
  await refresh(c);
  assert.equal(drafts(c, 'recall').length, 0);
  c.h.m.advance(17 * DAY);
  await refresh(c);
  assert.equal(drafts(c, 'recall').length, 1, '14 days before');
  const first = drafts(c, 'recall')[0];
  value(await c.desk('dental_recall_set', { visitId: v.id, version: visitRow(c, v.id).version, dental: { recallDueAt: now + 45 * DAY } }));
  await refresh(c);
  assert.equal(c.h.m.table('dentalDrafts').find(d => d._id === first._id).status, 'cancelled', 'a changed date withdraws the old reminder');
  c.h.m.advance(25 * DAY);
  await refresh(c);
  assert.equal(drafts(c, 'recall').length, 1, '3 days before the new date');
  assert.doesNotMatch(drafts(c, 'recall')[0].text, /clean|filling|urgent|treatment/i);
  value(await book(c, c.desk, p.id, c.h.m.now() + 2 * DAY));
  await refresh(c);
  assert.equal(drafts(c, 'recall').length, 0, 'a booked visit stops the recall');
});

test('drafts: approval goes through the shared send path (24-hour window), and only a manager approves', async () => {
  const c = await clinic(), now = c.h.m.now();
  const p = await patient(c, 'Aisha', 'Can I book a visit?');
  value(await book(c, c.manager, p.id, now + 20 * HOUR));
  const q = await refresh(c);
  const d = q.items.find(i => i.source === 'draft' && i.kind === 'visit_confirmation');
  refused(await c.desk('dental_draft_approve', { draftId: d.id, version: d.version }), 'manager_required');
  const sent = value(await c.manager('dental_draft_approve', { draftId: d.id, version: d.version }));
  assert.equal(sent.status, 'queued');
  assert.equal(c.h.m.table('blueMessages').filter(m => String(m.dentalDraftId) === String(d.id)).length, 1);
  refused(await c.manager('dental_draft_approve', { draftId: d.id, version: sent.version }), 'invalid_draft_transition');
});

test('Insights: eight KPIs with golden values, unknown outcomes disclosed, orders without visits shown as coverage (never a false zero), drill-down equals the population', async () => {
  const c = await clinic(), now = c.h.m.now();
  // Before any visit: older order-only charges are coverage, attendance is unavailable.
  value(await c.manager('order_create', { requestId: randomUUID(), channel: 'walk_in', confirm: true, fulfilment: { type: 'in_store' }, lines: [{ variantId: c.checkup.variants[0].id, qty: 1 }] }));
  let ins = value(await c.manager('dental_insights', { period: '7d' }));
  assert.equal(metric(ins, 'visit_attendance').value, null);
  assert.equal(ins.coverage.chargesWithoutVisit, 1);
  const people = [];
  for (const n of ['A', 'B', 'C', 'D', 'E']) people.push(await patient(c, n));
  const v = [];
  for (const [i, p] of people.entries()) v.push(value(await book(c, c.manager, p.id, now + HOUR + i * 30 * MIN)));
  const late = value(await book(c, c.manager, people[0].id, now + 10 * HOUR));
  c.h.m.advance(4 * HOUR);
  for (const x of v.slice(0, 2)) { value(await status(c, c.desk, x.id, 'arrived')); value(await status(c, c.desk, x.id, 'completed')); }
  value(await status(c, c.desk, v[2].id, 'arrived'));
  value(await status(c, c.desk, v[3].id, 'missed'));
  value(await status(c, c.desk, late.id, 'cancelled', { reason: 'patient_request' }));
  value(await charge(c, v[0].id));
  value(await c.manager('dental_payment_record', { visitId: v[0].id, requestId: randomUUID(), amountMinor: 4000, method: 'cash' }));
  c.h.m.advance(8 * DAY);
  ins = value(await c.manager('dental_insights', { period: '30d' }));
  const att = metric(ins, 'visit_attendance');
  assert.deepEqual([att.value, att.numerator, att.denominator, att.notes.unknown], [75, 3, 4, 1], 'v[4] has no outcome: unknown, not missed');
  assert.deepEqual([metric(ins, 'missed_visits').value, metric(ins, 'missed_visits').notes.unknown], [1, 1]);
  assert.equal(metric(ins, 'overdue_balances').value, 6000);
  assert.ok(metric(ins, 'followups_due').value >= 3, 'attendance, charges and rebook tasks are due');
  const cancel = metric(ins, 'late_cancellation');
  assert.deepEqual([cancel.numerator, cancel.denominator], [1, 6]);
  assert.equal(metric(ins, 'charge_collection').value, 40);
  const util = metric(ins, 'chair_utilization');
  assert.equal(util.numerator, 90, 'three attended 30-minute visits');
  assert.ok(util.value > 0 && util.value < 1);
  assert.equal(metric(ins, 'recall_completion').value, null, 'no eligible records');
  const rows = value(await c.manager('dental_metric_records', { metric: 'visit_attendance', period: '30d' })).items;
  assert.equal(rows.length, 5);
  assert.equal(rows.filter(r => r.counts).length, att.denominator);
  assert.equal(rows.filter(r => r.inNumerator).length, att.numerator);
  assert.deepEqual(value(await c.manager('dental_insights', { period: '30d', segment: 'provider' })).segments.rows.map(r => r.key), ['Dr Salma']);
  refused(await c.desk('dental_insights', {}), 'manager_required');
  refused(await c.manager('dental_insights', { segment: 'tooth' }), 'invalid_segment');
});

test('roles and tenants: another clinic’s patients, visits and providers are refused; Chats context shows the next visit', async () => {
  const a = await clinic({ name: 'a' });
  const b = await clinic({ h: a.h, name: 'b', waba: '9999', phone: '8888', sender: '96890000001' });
  const now = a.h.m.now(), p = await patient(a, 'Aisha');
  const v = value(await book(a, a.manager, p.id, now + 2 * HOUR));
  refused(await b.manager('dental_visit_book', { requestId: randomUUID(), contactId: p.id, dental: { providerId: b.provider.id, startsAt: now + 3 * HOUR } }), 'contact_not_found');
  refused(await b.manager('dental_visit', { visitId: v.id }), 'visit_not_found');
  refused(await b.manager('dental_visit_status', { visitId: v.id, version: 1, status: 'confirmed' }), 'visit_not_found');
  const q = await patient(b, 'Badr');
  refused(await b.manager('dental_visit_book', { requestId: randomUUID(), contactId: q.id, dental: { providerId: a.provider.id, startsAt: now + 3 * HOUR } }), 'provider_required');
  assert.equal(value(await b.manager('dental_visits', {})).items.length, 0);
  const ctx = value(await a.desk('dental_context', { contactId: p.id })).items[0];
  assert.equal(String(ctx.nextVisit.id), String(v.id));
  assert.equal(value(await b.manager('dental_context', { contactId: p.id })).items.length, 0);
});
