// Fitness & wellness (ascend/fitness.md + ascend/implementation/fitness.md, task B15): the six-tab
// map, the automatic membership lifecycle, all eight primary events, the B15 synthetic journey, the
// acceptance cases, the eight KPIs, Follow-ups, roles and tenant isolation. Runs the real Hasib entry
// point on the in-memory Convex with the fixture clock; nothing reaches a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gym, customer, plan, klass, book, checkin, join, member, metric, value, refused, randomUUID, DAY, HOUR, MIN } from './fixtures/ascend/fitness.mjs';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { dashboardMap, resolveTab } from '../src/lib/dashboard/navigation.js';
import { isLivePack } from '../config/hasib-packs.js';
import { fitnessTurn } from '../convex/hasib/fitnessTurn.js';

const tasks = (g, kind) => g.h.m.table('fitnessTasks').filter(t => t.kind === kind && t.status === 'open');
const drafts = (g, kind, status = 'draft') => g.h.m.table('fitnessDrafts').filter(d => d.kind === kind && (!status || d.status === status));
const refresh = g => g.manager('fitness_followups').then(value);
const seatRow = (g, id) => g.h.m.table('fitnessSeats').find(s => s._id === id);
const membershipRow = (g, id) => g.h.m.table('hasibMemberships').find(m => m._id === id);

test('six tabs with Memberships as Work; a coach sees Chats, Memberships and Customers; old links land in the new places', async () => {
  const g = await gym();
  const m = value(await g.manager('overview'));
  assert.equal(m.pack.ownerUi.work.en, 'Memberships');
  assert.equal(m.pack.ownerUi.work.ar, 'العضويات');
  const map = dashboardMap(m, m.capabilities);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['members', 'classes', 'plans', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'business', 'channels', 'accounts']);
  const e = value(await g.coach('overview'));
  assert.deepEqual(dashboardMap(e, e.capabilities, 'employee').sections, ['chats', 'work', 'customers']);
  for (const [tab, expected] of [['today', ['work', 'members']], ['orders', ['work', 'members']], ['stock', ['work', 'plans']], ['money', ['insights', null]], ['team', ['settings', 'team']], ['nothing', ['work', 'members']]])
    assert.deepEqual(Object.values(resolveTab(tab, null, map)), expected, `${tab} → ${expected}`);
});

test('Fitness is a live pack: it runs for a real Ascend account with no preview harness, and other sectors stay closed to it', async () => {
  const g = await gym();
  assert.equal(isLivePack('fitness'), true);
  assert.notEqual(g.h.m.ctx.hasibPreview, true);
  const o = value(await g.manager('fitness_overview'));
  assert.equal(o.attention.approvals, 0);
  refused(await g.manager('media_overview'), 'module_unavailable');
  refused(await g.manager('real_estate_overview'), 'module_unavailable');
  // The API keeps the typed payload, and drops what it does not know.
  assert.deepEqual(hasibArgs('fitness_seat_book', { requestId: randomUUID(), classId: 'abc123', contactId: 'def456', fitness: { trial: true, source: 'instagram', medical: 'x' } }).fitness, { trial: true, source: 'instagram' });
});

test('plans: validated, replayed, manager-only; a coach sees plans without prices', async () => {
  const g = await gym();
  refused(await g.manager('fitness_plan_save', { requestId: randomUUID(), fitness: { name: 'Bad', kind: 'class_pack', termDays: 30, billingMonths: 1, priceMinor: 1000 } }), 'invalid_plan');
  refused(await g.manager('fitness_plan_save', { requestId: randomUUID(), fitness: { name: 'Bad', termDays: 30, billingMonths: 5, priceMinor: 1000 } }), 'invalid_plan');
  const requestId = randomUUID();
  const p = value(await g.manager('fitness_plan_save', { requestId, fitness: { name: 'Monthly', termDays: 30, billingMonths: 1, priceMinor: 30000, freezeMaxDays: 14 } }));
  assert.equal(value(await g.manager('fitness_plan_save', { requestId, fitness: { name: 'Other' } })).id, p.id, 'replay returns the same plan');
  refused(await g.manager('fitness_plan_save', { planId: p.id, version: p.version + 3, fitness: { name: 'Renamed' } }), 'plan_conflict');
  refused(await g.coach('fitness_plan_save', { requestId: randomUUID(), fitness: { name: 'X' } }), 'manager_required');
  const seen = value(await g.coach('fitness_plans')).items;
  assert.equal(seen[0].name, 'Monthly');
  assert.equal('priceMinor' in seen[0], false, 'staff never see prices');
});

test('B15 journey: five trials, three attended, two paid; a repeated scan uses one credit; a 7-day freeze moves renewal and the gap clock; no offers after opt-out', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), pack5 = await plan(run, { name: '5-class pack', kind: 'class_pack', credits: 5, priceMinor: 25000, termDays: 60 });
  const trialClass = await klass(run, now + 2 * HOUR, { title: 'Trial HIIT' });
  const names = ['Aisha', 'Badr', 'Dana', 'Fahad', 'Huda'], people = [];
  for (const name of names) people.push(await customer(g, name));
  for (const c of g.h.m.table('blueConversations').filter(c => String(c.contactId) === String(people[4].id))) await g.h.m.db.patch(c._id, { optout: true });
  const seats = [];
  for (const [i, p] of people.entries()) seats.push(value(await book(run, trialClass, p.id, { trial: true, source: i < 3 ? 'instagram' : 'referral' })));
  assert.equal(seats.every(s => s.status === 'confirmed'), true);
  refused(await book(run, trialClass, people[0].id, { trial: true }), 'already_booked');
  const other = await klass(run, now + 3 * DAY);
  refused(await book(run, other, people[0].id, { trial: true }), 'trial_used');
  refused(await checkin(run, seats[0].id), 'class_not_started');
  await refresh(g);

  g.h.m.advance(2 * HOUR + 5 * MIN);
  for (const s of seats.slice(0, 3)) assert.equal(value(await checkin(run, s.id, { source: 'instructor' })).status, 'attended');
  refused(await run('fitness_seat_status', { seatId: seats[3].id, version: seatRow(g, seats[3].id).version, status: 'no_show' }), 'class_not_finished');
  g.h.m.advance(HOUR);
  for (const s of seats.slice(3)) value(await run('fitness_seat_status', { seatId: s.id, version: seatRow(g, s.id).version, status: 'no_show' }));
  await refresh(g);
  assert.equal(tasks(g, 'trial_convert').length, 3, 'each attended trial opens one conversion task');

  // Two of the three attended join: a membership waits for payment, then starts by itself.
  const pending = value(await run('fitness_membership_save', { requestId: randomUUID(), contactId: people[0].id, planId: monthly.id }));
  assert.equal(pending.status, 'pending');
  await refresh(g);
  assert.equal(tasks(g, 'payment_due').length, 1);
  const payId = randomUUID();
  value(await run('fitness_payment_record', { requestId: payId, membershipId: pending.id, amountMinor: 10000, method: 'cash' }));
  assert.equal(membershipRow(g, pending.id).status, 'pending', 'a part payment does not start the membership');
  const active = value(await run('fitness_payment_record', { requestId: randomUUID(), membershipId: pending.id, amountMinor: 20000, method: 'cash' }));
  assert.equal(active.status, 'active');
  assert.equal(value(await run('fitness_payment_record', { requestId: payId, membershipId: pending.id, amountMinor: 10000, method: 'cash' })).status, 'active', 'a replayed payment changes nothing');
  assert.equal(g.h.m.table('hasibPayments').length, 2);
  refused(await run('fitness_membership_save', { requestId: randomUUID(), contactId: people[0].id, planId: monthly.id }), 'membership_exists');
  const second = await join(run, people[1].id, pack5);
  await refresh(g);
  assert.equal(tasks(g, 'payment_due').length, 0, 'paid memberships close their payment task');
  assert.equal(tasks(g, 'trial_convert').length, 1, 'joined trials close their conversion task');

  let insights = value(await run('fitness_insights', { period: '7d' }));
  assert.equal(insights.trials.booked, 5);
  assert.equal(insights.trials.attendanceRate, 60);
  assert.equal(insights.trials.attendedToPaid, 66.7);
  assert.equal(insights.trials.paid, 2);
  assert.deepEqual(insights.trials.bySource.find(r => r.source === 'instagram'), { source: 'instagram', booked: 3, attended: 3, paid: 2 });
  assert.equal(insights.trials.costPerAttendedTrial, null, 'spend is not captured, so cost per trial is unavailable');
  // The third attendee's window has not matured, so K01 counts only the two who joined.
  assert.deepEqual([metric(insights, 'trial_to_member').numerator, metric(insights, 'trial_to_member').denominator], [2, 2]);
  assert.equal(metric(insights, 'net_growth').notes.new, 2, 'two acquired members');

  // A repeated attendance webhook: one visit, one credit.
  const pilates = await klass(run, g.h.m.now() + HOUR, { title: 'Pilates', classType: 'pilates' });
  const seat = value(await book(run, pilates, people[1].id));
  assert.equal(String(seat.membershipId), String(second.id));
  g.h.m.advance(HOUR);
  value(await checkin(run, seat.id, { source: 'scan', sourceEventId: 'door-77' }));
  assert.equal(value(await run('fitness_checkin', { fitness: { source: 'scan', sourceEventId: 'door-77' } })).replay, true);
  assert.equal(value(await checkin(run, seat.id, { source: 'scan', sourceEventId: 'door-78' })).replay, true);
  assert.equal(membershipRow(g, second.id).remainingCredits, 4);
  assert.equal(g.h.m.table('hasibCredits').filter(c => String(c.membershipId) === String(second.id) && c.kind === 'consume').length, 1);
  refused(await run('fitness_checkin', { contactId: people[1].id }), 'class_pack_needs_class');

  // A 7-day freeze moves the end by 7 days and keeps the member out of the attendance gap.
  const before = value(await run('fitness_member', { contactId: people[0].id })).membership.endsAt;
  const frozen = value(await run('fitness_freeze', { membershipId: active.id, version: membershipRow(g, active.id).version, fitness: { days: 7 } }));
  assert.equal(frozen.freezes.length, 1);
  const card = await member(run, people[0].id);
  assert.equal(card.membership.endsAt - before, 7 * DAY);
  assert.equal(card.state, 'frozen');
  assert.equal(card.flags.frozen, true);
  refused(await run('fitness_freeze', { membershipId: active.id, version: membershipRow(g, active.id).version, fitness: { days: 8, startsAt: g.h.m.now() + 8 * DAY } }), 'freeze_limit');

  g.h.m.advance(15 * DAY);
  insights = value(await run('fitness_insights', { period: '30d' }));
  assert.deepEqual([metric(insights, 'trial_to_member').numerator, metric(insights, 'trial_to_member').denominator], [2, 3], 'matured: 2 of 3 attended trials joined (66.7%)');
  assert.equal(metric(insights, 'trial_to_member').value, 66.7);
  // Opt-out: Huda opted out before her trial, so no reminder was ever written for her; the others got one each.
  const reminded = new Set(g.h.m.table('fitnessDrafts').filter(d => d.kind === 'trial_reminder').map(d => String(d.contactId)));
  assert.deepEqual([...reminded].sort(), people.slice(0, 4).map(p => String(p.id)).sort());
});

test('fitness.membership_inquiry: one trial request per enquiring customer, no health detail stored; it closes when a trial is booked', async () => {
  const g = await gym(), run = g.manager, c = await customer(g, 'Mariam');
  const row = await g.h.m.db.get(g.t.rowId);
  let contact = g.h.m.table('blueContacts').find(x => x._id === c.id);
  assert.equal(await fitnessTurn(g.h.m.ctx, { row, contact: { ...contact, fields: [] }, now: g.h.m.now() }), null, 'no stated need, no request');
  contact = { ...contact, fields: [{ key: 'need', value: 'Lose weight after knee surgery' }] };
  await fitnessTurn(g.h.m.ctx, { row, contact, now: g.h.m.now() });
  await fitnessTurn(g.h.m.ctx, { row, contact, now: g.h.m.now() });
  const open = tasks(g, 'trial_request');
  assert.equal(open.length, 1, 'a replayed enquiry adds nothing');
  assert.doesNotMatch(open[0].reason, /knee|weight/i, 'the customer’s words are not copied');
  assert.equal(value(await run('fitness_members', { filter: 'trialFollowUp' })).items.some(r => r.contactId === String(c.id)), true);
  const k = await klass(run, g.h.m.now() + DAY);
  value(await book(run, k, c.id, { trial: true }));
  await refresh(g);
  assert.equal(tasks(g, 'trial_request').length, 0);
});

test('fitness.class_booked: entitlement is checked at class time; the trial reminder is drafted once and withdrawn when the class is cancelled', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), c = await customer(g, 'Saeed'), t = await customer(g, 'Tariq');
  const k = await klass(run, now + 3 * HOUR);
  refused(await book(run, k, c.id), 'membership_required');
  const m = value(await run('fitness_membership_save', { requestId: randomUUID(), contactId: c.id, planId: monthly.id }));
  refused(await book(run, k, c.id), 'membership_inactive');
  value(await run('fitness_payment_record', { requestId: randomUUID(), membershipId: m.id, amountMinor: 30000, method: 'card' }));
  const requestId = randomUUID();
  const seat = value(await run('fitness_seat_book', { requestId, classId: k.id, contactId: c.id }));
  assert.equal(value(await run('fitness_seat_book', { requestId, classId: k.id, contactId: c.id })).id, seat.id, 'replay returns the same seat');
  // A class after the end of the term is not covered.
  const later = await klass(run, now + 40 * DAY);
  refused(await book(run, later, c.id), 'membership_inactive');
  value(await book(run, k, t.id, { trial: true }));
  await refresh(g); await refresh(g);
  assert.equal(drafts(g, 'trial_reminder').length, 1, 'the reminder is written once');
  assert.match(drafts(g, 'trial_reminder')[0].text, /HIIT/);
  refused(await run('fitness_class_save', { classId: k.id, version: k.version, fitness: { cancel: true } }), 'cancel_reason_required');
  value(await run('fitness_class_save', { classId: k.id, version: k.version, reason: 'Coach unwell', fitness: { cancel: true } }));
  await refresh(g);
  assert.equal(drafts(g, 'trial_reminder').length, 0, 'the reminder is withdrawn once the class is cancelled');
  assert.equal(g.h.m.table('fitnessSeats').filter(s => String(s.classId) === String(k.id) && s.status === 'cancelled').length, 2);
  refused(await book(run, k, c.id), 'class_cancelled');
});

test('fitness.waitlist_promoted: a full class waitlists; a freed place goes to the first person still entitled, with one notice draft', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), single = await plan(run, { name: 'Single class', kind: 'class_pack', credits: 1, priceMinor: 5000, termDays: 30 });
  const [a, b, c, d] = [await customer(g, 'Amal'), await customer(g, 'Bilal'), await customer(g, 'Cyrine'), await customer(g, 'Dalal')];
  await join(run, a.id, monthly); await join(run, b.id, monthly); await join(run, c.id, single); await join(run, d.id, monthly);
  const full = await klass(run, now + DAY, { capacity: 2, title: 'Spin', classType: 'spin' });
  const seatA = value(await book(run, full, a.id));
  value(await book(run, full, b.id));
  const waitC = value(await book(run, full, c.id)), waitD = value(await book(run, full, d.id));
  assert.deepEqual([waitC.status, waitD.status], ['waitlisted', 'waitlisted']);
  // Cyrine's only credit is now held by another class, so she is no longer entitled to the Spin place.
  const otherClass = await klass(run, now + 2 * DAY);
  value(await book(run, otherClass, c.id));
  value(await run('fitness_seat_status', { seatId: seatA.id, version: seatA.version, status: 'cancelled' }));
  assert.equal(seatRow(g, waitC.id).status, 'waitlisted', 'an ineligible person is skipped');
  assert.equal(seatRow(g, waitD.id).status, 'confirmed', 'the next eligible person gets the place');
  assert.equal(drafts(g, 'waitlist_promoted').length, 1);
  await refresh(g);
  assert.equal(drafts(g, 'waitlist_promoted').length, 1, 'a refresh does not write a second notice');
  const roster = value(await run('fitness_classes', { fromAt: now, toAt: now + 3 * DAY })).items.find(x => x.id === full.id);
  assert.deepEqual([roster.booked, roster.waitlisted], [2, 1]);
});

test('fitness.attendance_recorded: a missing check-in stays unknown, opens one task, and the task closes when attendance is recorded', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), a = await customer(g, 'Ibrahim'), b = await customer(g, 'Jana');
  await join(run, a.id, monthly); await join(run, b.id, monthly);
  const k = await klass(run, now + HOUR);
  const sa = value(await book(run, k, a.id)), sb = value(await book(run, k, b.id));
  g.h.m.advance(2 * HOUR + MIN);
  await refresh(g);
  assert.equal(tasks(g, 'attendance_unrecorded').length, 1);
  value(await checkin(run, sa.id));
  let insights = value(await run('fitness_insights', { period: '7d' }));
  assert.deepEqual([metric(insights, 'no_show').numerator, metric(insights, 'no_show').denominator, metric(insights, 'no_show').notes.unknown], [0, 1, 1], 'unknown is not a no-show');
  value(await run('fitness_seat_status', { seatId: sb.id, version: seatRow(g, sb.id).version, status: 'no_show' }));
  await refresh(g);
  assert.equal(tasks(g, 'attendance_unrecorded').length, 0);
  insights = value(await run('fitness_insights', { period: '7d' }));
  assert.equal(metric(insights, 'no_show').value, 50);
  assert.equal(membershipRow(g, (await member(run, a.id)).membership.id).lastAttendanceAt, k.startsAt);
});

test('fitness.inactive: one supportive invitation per gap; a visit withdraws it; a frozen member is never treated as absent', async () => {
  const g = await gym(), run = g.manager;
  const monthly = await plan(run, { termDays: 90, billingMonths: 3, priceMinor: 81000 }), a = await customer(g, 'Khalid'), b = await customer(g, 'Lina');
  await join(run, a.id, monthly);
  const mb = await join(run, b.id, monthly);
  g.h.m.advance(3 * DAY);
  value(await run('fitness_freeze', { membershipId: mb.id, version: membershipRow(g, mb.id).version, fitness: { days: 14 } }));
  g.h.m.advance(12 * DAY);
  await refresh(g); await refresh(g);
  const gap = drafts(g, 'attendance_gap');
  assert.equal(gap.length, 1, 'one invitation, for the unfrozen member only');
  assert.equal(String(gap[0].contactId), String(a.id));
  assert.doesNotMatch(gap[0].text, /health|weight|injur/i);
  const insights = value(await run('fitness_insights', {}));
  const k03 = metric(insights, 'attendance_gap');
  assert.deepEqual([k03.value, k03.denominator, k03.notes.frozen], [1, 1, 1], 'frozen member left out and disclosed');
  value(await run('fitness_checkin', { contactId: a.id, fitness: { source: 'scan', sourceEventId: 'gate-1' } }));
  await refresh(g);
  assert.equal(drafts(g, 'attendance_gap').length, 0, 'a visit withdraws the invitation');
  assert.equal(value(await run('fitness_members', { filter: 'attendanceGap' })).items.length, 0);
});

test('fitness.renewal_due: drafted before the end; renewing links a successor that starts at the end; a renewal is not a new member', async () => {
  const g = await gym(), run = g.manager;
  const monthly = await plan(run, {}), a = await customer(g, 'Maha');
  const first = await join(run, a.id, monthly);
  g.h.m.advance(24 * DAY);
  await refresh(g);
  assert.equal(drafts(g, 'renewal').length, 1);
  assert.equal(value(await run('fitness_members', { filter: 'expiring' })).items.length, 1);
  const next = value(await run('fitness_renew', { requestId: randomUUID(), membershipId: first.id, version: membershipRow(g, first.id).version }));
  refused(await run('fitness_renew', { requestId: randomUUID(), membershipId: first.id, version: membershipRow(g, first.id).version }), 'already_renewed');
  const paid = value(await run('fitness_payment_record', { requestId: randomUUID(), membershipId: next.id, amountMinor: 30000, method: 'bank_transfer' }));
  assert.equal(paid.startsAt, membershipRow(g, first.id).endsAt, 'the renewal starts when the current term ends');
  await refresh(g);
  assert.equal(drafts(g, 'renewal').length, 0, 'a recorded renewal withdraws the reminder');
  g.h.m.advance(15 * DAY);
  const card = await member(run, a.id);
  assert.equal(card.membership.id, next.id);
  assert.equal(card.state, 'active');
  const insights = value(await run('fitness_insights', { period: '30d' }));
  assert.deepEqual([metric(insights, 'membership_renewal').numerator, metric(insights, 'membership_renewal').denominator], [1, 1]);
  assert.equal(metric(insights, 'net_growth').notes.new ?? 0, 0, 'the renewal is not counted as an acquisition');
  // Long after the grace period, coming back is a new membership (a returning member), not a renewal.
  g.h.m.advance(40 * DAY);
  refused(await run('fitness_renew', { requestId: randomUUID(), membershipId: next.id, version: membershipRow(g, next.id).version }), 'membership_lapsed');
  const back = await join(run, a.id, monthly);
  assert.equal(back.status, 'active');
  const later = value(await run('fitness_insights', { period: '7d' }));
  assert.equal(metric(later, 'net_growth').notes.reactivated, 1, 'the return counts as a reactivation');
});

test('fitness.freeze_cancel: a freeze releases its classes to the waitlist; cancelling needs a reason and keeps history', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, { freezeMaxDays: 10 }), a = await customer(g, 'Nasser'), b = await customer(g, 'Omar');
  const ma = await join(run, a.id, monthly); await join(run, b.id, monthly);
  const k = await klass(run, now + 2 * DAY, { capacity: 1 });
  const sa = value(await book(run, k, a.id)), sb = value(await book(run, k, b.id));
  assert.equal(sb.status, 'waitlisted');
  refused(await run('fitness_freeze', { membershipId: ma.id, version: membershipRow(g, ma.id).version, fitness: { days: 11 } }), 'freeze_limit');
  value(await run('fitness_freeze', { membershipId: ma.id, version: membershipRow(g, ma.id).version, fitness: { days: 5 } }));
  assert.equal(seatRow(g, sa.id).status, 'cancelled');
  assert.equal(seatRow(g, sb.id).status, 'confirmed', 'the freed place went to the waitlist');
  refused(await book(run, k, a.id), 'membership_frozen');
  const k2 = await klass(run, now + 3 * DAY);
  refused(await book(run, k2, a.id), 'membership_frozen');
  value(await run('fitness_freeze', { membershipId: ma.id, version: membershipRow(g, ma.id).version, fitness: { end: true } }));
  assert.equal(value(await book(run, k2, a.id)).status, 'confirmed', 'ending the freeze early restores booking');
  refused(await run('fitness_cancel', { membershipId: ma.id, version: membershipRow(g, ma.id).version }), 'cancel_reason_required');
  value(await run('fitness_cancel', { membershipId: ma.id, version: membershipRow(g, ma.id).version, reason: 'Moving abroad' }));
  assert.equal(g.h.m.table('fitnessSeats').filter(s => String(s.contactId) === String(a.id) && s.status === 'confirmed').length, 0);
  const card = await member(run, a.id);
  assert.equal(card.state, 'cancelled');
  assert.equal(card.activity.some(x => x.kind === 'cancelled'), true);
  assert.equal(card.payments.length, 1, 'payments stay');
});

test('Insights: occupancy leaves out a cancelled class; recurring revenue is a monthly run rate without frozen members; drill-down equals the population', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), quarterly = await plan(run, { name: 'Quarterly', termDays: 90, billingMonths: 3, priceMinor: 81000, freezeMaxDays: 30 });
  const people = [];
  for (const n of ['P1', 'P2', 'P3', 'P4']) people.push(await customer(g, n));
  await join(run, people[0].id, monthly); await join(run, people[1].id, quarterly); await join(run, people[2].id, monthly);
  const mq = await join(run, people[3].id, quarterly);
  value(await run('fitness_freeze', { membershipId: mq.id, version: membershipRow(g, mq.id).version, fitness: { days: 10, startsAt: now + DAY } }));
  const held = await klass(run, now + HOUR, { capacity: 10 }), dropped = await klass(run, now + 2 * HOUR, { capacity: 10, title: 'Yoga', classType: 'yoga' });
  const seats = [];
  for (const p of people.slice(0, 3)) seats.push(value(await book(run, held, p.id)));
  value(await book(run, dropped, people[0].id));
  value(await run('fitness_class_save', { classId: dropped.id, version: dropped.version, reason: 'Room flooded', fitness: { cancel: true } }));
  g.h.m.advance(3 * HOUR);
  for (const s of seats) value(await checkin(run, s.id));
  const insights = value(await run('fitness_insights', { period: '7d' }));
  const occ = metric(insights, 'class_occupancy');
  assert.deepEqual([occ.value, occ.numerator, occ.denominator, occ.notes.cancelled], [30, 3, 10, 1]);
  g.h.m.advance(DAY);
  const later = value(await run('fitness_insights', { period: '7d' }));
  const mrr = metric(later, 'recurring_revenue');
  assert.equal(mrr.value, 30000 + 27000 + 30000, 'monthly fees, the frozen quarterly member left out');
  assert.equal(mrr.notes.frozen, 1);
  assert.ok(mrr.asOf, 'a live figure says "as of now"');
  const records = value(await run('fitness_metric_records', { metric: 'recurring_revenue', period: '7d' })).items;
  assert.equal(records.filter(r => r.inNumerator).reduce((s, r) => s + r.amountMinor, 0), mrr.value);
  const segments = value(await run('fitness_insights', { period: '7d', segment: 'class_type' })).segments;
  assert.equal(segments.rows.find(r => r.key === 'hiit').values.class_occupancy.value, 30);
  // An empty gym shows "no eligible records", never 0%.
  const empty = await gym({ h: g.h, name: 'b', waba: '2234', phone: '6678', sender: '96890000002' });
  const none = value(await empty.manager('fitness_insights', {}));
  for (const id of ['trial_to_member', 'membership_renewal', 'class_occupancy', 'no_show', 'opening_retention']) assert.equal(metric(none, id).value, null, id);
  refused(await run('fitness_metric_records', { metric: 'made_up' }), 'invalid_metric');
});

test('Follow-ups: seven filters, self-closing tasks cannot be marked done, a stale snooze is refused, Chats context shows the same rows', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), a = await customer(g, 'Qais');
  const pending = value(await run('fitness_membership_save', { requestId: randomUUID(), contactId: a.id, planId: monthly.id }));
  const q = await refresh(g);
  assert.deepEqual(Object.keys(q.counts), ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed']);
  const due = q.items.find(r => r.kind === 'payment_due');
  assert.equal(due.bucket, 'waiting');
  assert.equal(due.selfClosing, true);
  refused(await run('fitness_task_resolve', { taskId: due.id }), 'task_closes_itself');
  refused(await run('fitness_task_snooze', { taskId: due.id, version: due.version + 1, dueAt: now + DAY }), 'task_conflict');
  g.h.m.advance(MIN);
  value(await run('fitness_task_snooze', { taskId: due.id, version: due.version, dueAt: now + DAY }));
  refused(await run('fitness_task_snooze', { taskId: due.id, version: due.version, dueAt: now + 2 * DAY }), 'task_conflict');
  const ctx = value(await run('fitness_context', { contactId: a.id })).items[0];
  assert.equal(ctx.state, 'pending');
  assert.equal(ctx.openFollowups, 1);
  const conversation = g.h.m.table('blueConversations').find(c => String(c.contactId) === String(a.id));
  assert.equal(value(await run('fitness_context', { conversationId: conversation._id })).items[0].contactId, String(a.id));
  void pending;
});

test('drafts: approval sends inside the 24-hour window, needs a template outside it, and is blocked after opt-out; staff cannot approve', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const t = await customer(g, 'Rana'), u = await customer(g, 'Sami'), w = await customer(g, 'Wafa');
  const k = await klass(run, now + 3 * HOUR);
  for (const p of [t, u, w]) value(await book(run, k, p.id, { trial: true }));
  await refresh(g);
  const of = p => drafts(g, 'trial_reminder').find(d => String(d.contactId) === String(p.id));
  refused(await g.coach('fitness_draft_approve', { draftId: of(t)._id, version: of(t).version }), 'manager_required');
  const sent = value(await run('fitness_draft_approve', { draftId: of(t)._id, version: of(t).version }));
  assert.equal(sent.status, 'queued');
  assert.equal(g.h.m.table('blueMessages').filter(m => String(m.fitnessDraftId) === String(sent.id)).length, 1, 'the message carries the draft link for delivery receipts');
  for (const c of g.h.m.table('blueConversations').filter(c => String(c.contactId) === String(w.id))) await g.h.m.db.patch(c._id, { optout: true });
  assert.equal(value(await run('fitness_draft_approve', { draftId: of(w)._id, version: of(w).version })).status, 'blocked');
  for (const c of g.h.m.table('blueConversations').filter(c => String(c.contactId) === String(u.id))) await g.h.m.db.patch(c._id, { lastInbound: now - 2 * DAY });
  assert.equal(value(await run('fitness_draft_approve', { draftId: of(u)._id, version: of(u).version })).status, 'template_required');
  assert.equal(tasks(g, 'template_required').length, 1);
});

test('roles and tenants: a coach records facts but never money or Insights; another gym cannot touch these records', async () => {
  const g = await gym(), run = g.manager, now = g.h.m.now();
  const monthly = await plan(run, {}), a = await customer(g, 'Yousef');
  const m = await join(run, a.id, monthly);
  const k = await klass(run, now + HOUR);
  for (const op of ['fitness_insights', 'fitness_metric_records', 'fitness_membership_save', 'fitness_payment_record', 'fitness_freeze', 'fitness_cancel', 'fitness_renew', 'fitness_class_save'])
    refused(await g.coach(op, { metric: 'no_show', requestId: randomUUID(), membershipId: m.id, version: 1, contactId: a.id, planId: monthly.id }), 'manager_required');
  const seat = value(await g.coach('fitness_seat_book', { requestId: randomUUID(), classId: k.id, contactId: a.id }));
  const card = value(await g.coach('fitness_member', { contactId: a.id }));
  assert.equal('money' in card, false);
  assert.equal(card.memberships.every(x => !('priceMinor' in x)), true);
  assert.equal(card.payments.length, 0);
  const other = await gym({ h: g.h, name: 'c', waba: '3234', phone: '7678', sender: '96890000003' });
  refused(await other.manager('fitness_seat_book', { requestId: randomUUID(), classId: k.id, contactId: a.id }), 'class_not_found');
  refused(await other.manager('fitness_member', { contactId: a.id }), 'member_not_found');
  refused(await other.manager('fitness_checkin', { seatId: seat.id }), 'seat_not_found');
  refused(await other.manager('fitness_payment_record', { requestId: randomUUID(), membershipId: m.id, amountMinor: 100, method: 'cash' }), 'membership_not_found');
  assert.equal(value(await other.manager('fitness_members')).items.length, 0);
});
