// Media & production (ascend/media.md + ascend/implementation/media.md, task B03): the six-tab map,
// the production lifecycle and its guards, all eight primary events, the spec's synthetic journey,
// the eight KPIs with their populations, the three follow-up rules, the Follow-ups queue, roles
// and tenant isolation. Runs the real Hasib entry point on the in-memory Convex with a fake clock;
// nothing reaches a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { studio, customer, resource, brief, accepted, hold, record, move, prepare, shoot, submitCut, decide, metric, value, refused, randomUUID, DAY, HOUR, MIN } from './fixtures/ascend/media.mjs';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { dashboardMap, resolveTab } from '../src/lib/dashboard/navigation.js';
import { mediaTurn } from '../convex/hasib/mediaTurn.js';

const tasks = (s, kind) => s.h.m.table('mediaTasks').filter(t => t.kind === kind && t.status === 'open');
const drafts = (s, ruleId) => s.h.m.table('mediaDrafts').filter(d => d.ruleId === ruleId);
const order = (s, id) => s.h.m.table('hasibOrders').find(o => o._id === id);

test('six tabs with Productions as Work; a producer sees no Insights or Settings; old links land in the new places', async () => {
  const s = await studio();
  const m = value(await s.manager('overview'));
  assert.equal(m.pack.ownerUi.work.en, 'Productions');
  const map = dashboardMap(m, m.capabilities);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['board', 'calendar', 'resources', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'business', 'channels', 'accounts']);
  const e = value(await s.producer('overview'));
  assert.deepEqual(dashboardMap(e, e.capabilities, 'employee').sections, ['chats', 'work', 'customers']);
  for (const [tab, view, expected] of [['today', null, ['work', 'board']], ['orders', null, ['work', 'board']], ['stock', null, ['work', 'resources']],
    ['money', null, ['insights', null]], ['team', null, ['settings', 'team']], ['contacts', null, ['customers', null]], ['nothing', null, ['work', 'board']]])
    assert.deepEqual(Object.values(resolveTab(tab, view, map)), expected, `${tab} → ${expected}`);
});

test('Media stays off for real accounts: outside the preview harness every Media operation is refused', async () => {
  const s = await studio();
  s.h.m.ctx.hasibPreview = false;
  refused(await s.manager('media_overview'), 'pack_not_live');
  assert.equal(value(await s.manager('overview')).setupRequired, true);
});

test('brief: a quote needs the full brief; replay returns the same production; a stale version is refused; foreign ids are refused', async () => {
  const s = await studio(), now = s.h.m.now(), c = await customer(s, 'Salma');
  const requestId = randomUUID();
  const thin = value(await s.manager('media_production_save', { requestId, media: { contactId: c.id, title: 'Launch reel', productionType: 'video' } }));
  assert.equal(thin.status, 'brief_incomplete');
  assert.match(thin.ref, /^PRJ-\d{3}$/);
  assert.equal(value(await s.manager('media_production_save', { requestId, media: { contactId: c.id, title: 'Other' } })).id, thin.id, 'replay returns the same brief');
  refused(await s.manager('media_quote', { productionId: thin.id, version: thin.version, media: { quoteMinor: 100000 } }), 'brief_incomplete:deliverables,shoot_dates,location,delivery_due');
  refused(await s.manager('media_production_save', { productionId: thin.id, version: thin.version + 5, media: { location: 'Muscat' } }), 'production_conflict');
  refused(await s.manager('media_production_save', { requestId: randomUUID(), media: { contactId: c.id, deliverables: [{ format: 'hologram', quantity: 1 }] } }), 'invalid_production');
  const other = await studio({ h: s.h, name: 'b', waba: '2234', phone: '6678', sender: '96890000002' });
  refused(await other.manager('media_production', { productionId: thin.id }), 'production_not_found');
  refused(await other.manager('media_production_save', { requestId: randomUUID(), media: { contactId: c.id, title: 'X' } }), 'contact_not_found');
  // The API keeps a long feedback note rather than dropping it.
  const long = 'x'.repeat(2000);
  assert.equal(hasibArgs('media_cut_decide', { cutId: 'abc', version: 1, media: { decision: 'changes_requested', feedback: long } }).media.feedback.length, 2000);
  void now;
});

test('spec journey: one confirmed booking per resource, exact-version approvals, a third revision becomes one priced change order, handoff needs rights and a link', async () => {
  const s = await studio(), run = s.manager, now = s.h.m.now();
  const crew = await resource(run, 'Crew A', 'crew'), camera = await resource(run, 'Camera C', 'camera');
  const one = await customer(s, 'Noor'), two = await customer(s, 'Hamad');
  const start = now + 2 * HOUR, end = now + 6 * HOUR;
  let a = value(await brief(run, one.id, { usageRights: { channels: ['social'], clearance: 'pending', territory: 'GCC' } }, now));
  let b = value(await brief(run, two.id, { title: 'Product shoot' }, now));
  a = await accepted(run, a); b = await accepted(run, b);
  // Deposit 20,000 on 100,000; booking waits for confirmed holds.
  assert.equal(a.money.depositMinor, 20000);
  assert.equal(a.money.paidMinor, 20000);
  refused(await move(run, a, 'booked'), 'holds_required');
  // Both projects may hold the same crew tentatively (shown as a conflict); only one can confirm.
  const aHeld = value(await run('media_reservation_save', { requestId: randomUUID(), productionId: a.id, mediaResourceId: crew.id, media: { startsAt: start, endsAt: end } }));
  const bHeld = value(await run('media_reservation_save', { requestId: randomUUID(), productionId: b.id, mediaResourceId: crew.id, media: { startsAt: start, endsAt: end } }));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'hold_conflict').length, 1, 'the tentative clash is visible');
  value(await run('media_reservation_status', { reservationId: aHeld.id, version: aHeld.version, status: 'confirmed' }));
  refused(await run('media_reservation_status', { reservationId: bHeld.id, version: bHeld.version, status: 'confirmed' }), 'resource_conflict');
  refused(await run('media_reservation_save', { requestId: randomUUID(), productionId: b.id, mediaResourceId: crew.id, media: { startsAt: start + HOUR, endsAt: end } }), 'resource_conflict');
  await hold(run, a, [camera], start, end);
  b = await record(run, b);
  refused(await move(run, b, 'booked'), 'holds_unconfirmed');
  a = await record(run, a);
  a = value(await move(run, a, 'booked'));
  a = value(await move(run, a, 'preproduction'));
  refused(await move(run, a, 'shooting'), 'prep_incomplete');
  a = await prepare(run, a);
  a = value(await move(run, a, 'shooting'));
  refused(await run('media_shoot_complete', { productionId: a.id, version: a.version, media: {} }), 'media_receipt_required');
  a = value(await run('media_shoot_complete', { productionId: a.id, version: a.version, media: { mediaReceived: true } }));
  assert.equal(a.status, 'editing');
  // v1 enters review; v2 supersedes it before the client decides; v1 can no longer be approved.
  a = value(await submitCut(run, a, 'v1'));
  const v1 = (await record(run, a)).cuts[0];
  a = value(await submitCut(run, a, 'v2'));
  refused(await decide(run, v1, 'approved'), 'cut_superseded');
  let rec = await record(run, a);
  assert.deepEqual(rec.cuts.map(c => [c.label, c.status]), [['v2', 'in_review'], ['v1', 'superseded']]);
  // Two included rounds, then a third request beyond the allowance.
  value(await decide(run, rec.cuts[0], 'changes_requested'));
  a = await record(run, a); value(await submitCut(run, a, 'v3'));
  rec = await record(run, a); value(await decide(run, rec.cuts[0], 'changes_requested'));
  a = await record(run, a); value(await submitCut(run, a, 'v4'));
  rec = await record(run, a); value(await decide(run, rec.cuts[0], 'changes_requested'));
  rec = await record(run, a);
  assert.equal(rec.roundsUsed, 3);
  assert.equal(rec.changeOrders.length, 1, 'exactly one priced exception');
  assert.deepEqual([rec.changeOrders[0].kind, rec.changeOrders[0].status, rec.changeOrders[0].priceMinor], ['extra_revision', 'proposed', 25000]);
  assert.equal(rec.blocker, 'extra_scope_decision');
  refused(await submitCut(run, rec, 'v5'), 'extra_scope_decision_pending');
  refused(await s.producer('media_change_order_decide', { changeOrderId: rec.changeOrders[0].id, version: 1, media: { decision: 'approved', customerApproval: 'Client' } }), 'manager_required');
  refused(await run('media_change_order_decide', { changeOrderId: rec.changeOrders[0].id, version: 1, media: { decision: 'approved' } }), 'customer_approval_required');
  value(await run('media_change_order_decide', { changeOrderId: rec.changeOrders[0].id, version: 1, media: { decision: 'approved', customerApproval: 'Client (chat)' } }));
  a = await record(run, a); a = value(await submitCut(run, a, 'v5'));
  rec = await record(run, a);
  refused(await run('media_cut_decide', { cutId: rec.cuts[0].id, version: rec.cuts[0].version, media: { decision: 'approved', approverName: 'Someone else', evidenceSource: 'chat' } }), 'approver_mismatch');
  a = value(await decide(run, rec.cuts[0], 'approved'));
  assert.equal(a.status, 'accepted');
  refused(await run('media_handoff', { productionId: a.id, version: a.version, media: { link: 'https://files.example/final' } }), 'rights_not_cleared');
  a = value(await run('media_production_save', { productionId: a.id, version: a.version, media: { usageRights: { channels: ['social'], clearance: 'cleared', territory: 'GCC' } } }));
  refused(await run('media_handoff', { productionId: a.id, version: a.version, media: { link: 'ftp://files.example/final' } }), 'handoff_link_required');
  a = value(await run('media_handoff', { productionId: a.id, version: a.version, media: { link: 'https://files.example/final' } }));
  assert.equal(a.status, 'delivered');
  // The production order still owes 80,000; the approved extra round has its own 25,000 order.
  const productionOrder = order(s, rec.orderId);
  assert.equal(productionOrder.totalMinor - productionOrder.paidMinor, 80000);
  assert.equal(a.money.totalMinor, 125000);
  assert.equal(a.money.balanceMinor, 105000);
  // The order moves only with the production.
  refused(await run('order_status', { orderId: rec.orderId, version: productionOrder.version, to: 'confirmed' }), 'use_production_status');
});

test('events: brief received, quote ready, booking confirmed, shoot preparation — each needs its evidence, queues once, and stops', async () => {
  const s = await studio(), run = s.manager, now = s.h.m.now();
  // media.brief_received: Layla's intake creates one brief; a reply updates it, never a second one.
  const c = await customer(s, 'Aisha');
  const contactRow = s.h.m.table('blueContacts').find(x => x._id === c.id), person = s.h.m.table('blueConversations').find(x => x.contactId === c.id);
  const row = s.h.m.table('blueReviewSessions')[0];
  await s.h.m.db.patch(c.id, { fields: [{ key: 'need', value: 'Wedding film' }, { key: 'area', value: 'Muscat' }] });
  await mediaTurn(s.h.m.ctx, { row, person, contact: { ...contactRow, fields: [{ key: 'need', value: 'Wedding film' }, { key: 'area', value: 'Muscat' }] }, now, secret: 'x' });
  await mediaTurn(s.h.m.ctx, { row, person, contact: { ...contactRow, fields: [{ key: 'need', value: 'Wedding film' }, { key: 'budget', value: '900' }] }, now: now + MIN, secret: 'x' });
  const briefs = s.h.m.table('mediaProductions').filter(p => String(p.contactId) === String(c.id));
  assert.equal(briefs.length, 1, 'one brief per customer project');
  assert.deepEqual([briefs[0].status, briefs[0].location, briefs[0].budgetMinor], ['brief_incomplete', 'Muscat', 900000]);
  // A brief left incomplete for a day opens one task; refreshing again adds nothing.
  s.h.m.advance(DAY + MIN);
  value(await run('media_followups'));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'brief_incomplete').length, 1);
  // media.quote_ready: the quote waits for a complete brief.
  let p = await record(run, { id: briefs[0]._id });
  refused(await run('media_quote', { productionId: p.id, version: p.version, media: { quoteMinor: 50000 } }), 'brief_incomplete:deliverables,shoot_dates,delivery_due');
  const t = s.h.m.now();
  p = value(await run('media_production_save', { productionId: p.id, version: p.version, media: { deliverables: [{ format: 'video', quantity: 1 }], shootStartsAt: t + 3 * DAY, shootEndsAt: t + 3 * DAY + 5 * HOUR, deliveryDueAt: t + 10 * DAY } }));
  p = value(await run('media_quote', { productionId: p.id, version: p.version, media: { quoteMinor: 50000 } }));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'brief_incomplete').length, 0, 'the brief task closes itself');
  assert.equal(p.status, 'quoted');
  // A stale acceptance (an earlier quote version) is refused.
  p = value(await move(run, p, 'awaiting_acceptance'));
  refused(await run('media_accept', { productionId: p.id, version: p.version, media: { quoteVersion: 0, acceptedBy: 'Aisha', evidenceSource: 'chat' } }), 'stale_quote');
  p = value(await run('media_accept', { productionId: p.id, version: p.version, media: { quoteVersion: 1, acceptedBy: 'Aisha', evidenceSource: 'chat' } }));
  // media.booking_confirmed: deposit and confirmed holds are both required; an expired hold cannot be confirmed.
  value(await run('media_followups'));
  assert.equal(tasks(s, 'deposit_missing').length, 1);
  refused(await move(run, p, 'booked'), 'deposit_required');
  p = value(await run('media_payment_record', { requestId: randomUUID(), productionId: p.id, amountMinor: 10000, method: 'cash' }));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'deposit_missing').length, 0);
  const crew = await resource(run, 'Crew B', 'crew');
  const held = value(await run('media_reservation_save', { requestId: randomUUID(), productionId: p.id, mediaResourceId: crew.id, media: { startsAt: p.shootStartsAt, endsAt: p.shootEndsAt } }));
  s.h.m.advance(49 * HOUR);
  refused(await run('media_reservation_status', { reservationId: held.id, version: held.version, status: 'confirmed' }), 'hold_expired');
  p = await record(run, p);
  refused(await move(run, p, 'booked'), 'holds_required');
  await hold(run, p, [crew], p.shootStartsAt, p.shootEndsAt);
  p = await record(run, p);
  p = value(await move(run, p, 'booked'));
  // media.shoot_preparation: inside the cutoff, missing critical items open one shoot-at-risk task.
  value(await run('media_followups'));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'shoot_at_risk').length, 1);
  p = await prepare(run, p, ['crew_confirmed', 'location_permission', 'equipment_ready', 'talent_releases']);
  value(await run('media_followups'));
  assert.equal(tasks(s, 'shoot_at_risk').length, 0, 'verifying the critical items stops it');
});

test('events: shoot completed, cut submitted, revision or acceptance, final handoff — no inference from time, no obsolete chase, balance reminder stops on payment', async () => {
  const s = await studio(), run = s.manager, now = s.h.m.now(), c = await customer(s, 'Fatma');
  const cam = await resource(run, 'Camera D', 'camera');
  let p = value(await brief(run, c.id, {}, now));
  p = await accepted(run, p);
  await hold(run, p, [cam], p.shootStartsAt, p.shootEndsAt);
  p = await record(run, p);
  p = value(await move(run, p, 'booked')); p = value(await move(run, p, 'preproduction')); p = await prepare(run, p); p = value(await move(run, p, 'shooting'));
  // media.shoot_completed: the shoot time passing opens a task; it never moves the production.
  s.h.m.advance(7 * HOUR);
  value(await run('media_followups'));
  assert.equal(tasks(s, 'shoot_completion_missing').length, 1);
  assert.equal((await record(run, p)).status, 'shooting');
  p = await record(run, p);
  p = value(await run('media_shoot_complete', { productionId: p.id, version: p.version, media: { mediaReceived: true } }));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'shoot_completion_missing').length, 0);
  // media.cut_submitted with the approval rule in draft mode: one chase for the current cut only.
  value(await run('settings_update', { mediaSettings: { rules: [{ id: 'cut_approval', enabled: true, mode: 'draft', offsetMinutes: 60 }] } }));
  p = value(await run('media_cut_submit', { requestId: randomUUID(), productionId: p.id, version: p.version, media: { label: 'v1', assetRef: 'https://review.example/v1', approverName: 'Client', decisionDueAt: s.h.m.now() + 2 * HOUR } }));
  s.h.m.advance(90 * MIN);
  value(await run('media_followups')); value(await run('media_followups'));
  assert.equal(drafts(s, 'cut_approval').filter(d => d.status === 'draft').length, 1, 'one chase, however often the queue is read');
  p = value(await run('media_cut_submit', { requestId: randomUUID(), productionId: p.id, version: p.version, media: { label: 'v2', assetRef: 'https://review.example/v2', approverName: 'Client', decisionDueAt: s.h.m.now() + 5 * HOUR } }));
  value(await run('media_followups'));
  assert.equal(drafts(s, 'cut_approval').filter(d => d.status === 'draft').length, 0, 'the v1 chase is cancelled when v2 becomes current');
  assert.equal(drafts(s, 'cut_approval').filter(d => d.status === 'cancelled').length, 1);
  // media.revision_or_acceptance: the decision stops the chase; acceptance closes review.
  let rec = await record(run, p);
  p = value(await decide(run, rec.cuts[0], 'approved'));
  assert.equal(p.status, 'accepted');
  // media.final_handoff with the balance rule as a task: it opens after delivery and stops when paid.
  value(await run('settings_update', { mediaSettings: { rules: [{ id: 'delivery_balance', enabled: true, mode: 'task', offsetMinutes: 60 }] } }));
  p = value(await run('media_handoff', { productionId: p.id, version: p.version, media: { link: 'https://files.example/fatma' } }));
  s.h.m.advance(2 * HOUR);
  value(await run('media_followups')); value(await run('media_followups'));
  assert.equal(tasks(s, 'rule_delivery_balance').length, 1);
  value(await run('media_payment_record', { requestId: randomUUID(), productionId: p.id, amountMinor: 80000, method: 'bank_transfer' }));
  value(await run('media_followups'));
  assert.equal(tasks(s, 'rule_delivery_balance').length, 0, 'payment stops the balance reminder');
  assert.equal(s.h.m.table('blueMessages').filter(m => m.mediaDraftId).length, 0, 'nothing was sent by a rule');
});

test('Insights: the eight KPIs from their populations, with no eligible records shown as unavailable rather than 0', async () => {
  const s = await studio(), run = s.manager;
  const empty = value(await run('media_insights', { period: '30d' }));
  for (const m of [...empty.headline, ...empty.diagnostics]) assert.equal(m.value, null, `${m.id} is unavailable with no records`);
  refused(await s.producer('media_insights', {}), 'manager_required');

  const t0 = s.h.m.now(), crew = await resource(run, 'Crew A', 'crew'), cam = await resource(run, 'Camera C', 'camera');
  value(await run('settings_update', { mediaSettings: { prepCutoffHours: 1, quoteWindowDays: 1 } }));
  const make = async (name, extra) => { const c = await customer(s, name); let p = value(await brief(run, c.id, { deliveryDueAt: t0 + 3 * DAY, ...extra }, t0)); return accepted(run, p); };
  let p1 = await make('P1', {}), p2 = await make('P2', { revisionAllowance: 0, shootStartsAt: t0 + 7 * HOUR, shootEndsAt: t0 + 9 * HOUR }), p3 = await make('P3', { shootStartsAt: t0 + 10 * HOUR, shootEndsAt: t0 + 12 * HOUR }), p4 = await make('P4', {});
  await hold(run, p1, [crew, cam], t0 + 2 * HOUR, t0 + 6 * HOUR);
  await hold(run, p2, [crew], t0 + 7 * HOUR, t0 + 9 * HOUR);
  await hold(run, p3, [cam], t0 + 10 * HOUR, t0 + 12 * HOUR);
  // P1 on time, with 30,000 of final costs.
  p1 = await shoot(run, await record(run, p1));
  p1 = value(await submitCut(run, p1, 'v1'));
  s.h.m.advance(2 * HOUR);
  p1 = value(await decide(run, (await record(run, p1)).cuts[0], 'approved'));
  p1 = value(await run('media_handoff', { productionId: p1.id, version: p1.version, media: { link: 'https://files.example/p1' } }));
  value(await run('media_cost_save', { requestId: randomUUID(), productionId: p1.id, media: { category: 'crew_time', label: 'Crew day', amountMinor: 30000 } }));
  p1 = await record(run, p1);
  value(await run('media_costs_final', { productionId: p1.id, version: p1.version, media: { final: true } }));
  // P2: one round beyond a zero allowance, an approved extra round, delivered late with costs not final.
  p2 = await shoot(run, await record(run, p2));
  p2 = value(await submitCut(run, p2, 'v1'));
  value(await decide(run, (await record(run, p2)).cuts[0], 'changes_requested'));
  const co = (await record(run, p2)).changeOrders[0];
  value(await run('media_change_order_decide', { changeOrderId: co.id, version: co.version, media: { decision: 'approved', customerApproval: 'P2' } }));
  value(await run('media_cost_save', { requestId: randomUUID(), productionId: p2.id, media: { category: 'editing', label: 'Extra edit', amountMinor: 8000, changeOrderId: co.id, extraScope: true } }));
  p2 = value(await submitCut(run, await record(run, p2), 'v2'));
  // P3: booked but stuck in preproduction with two items missing; an unapproved extra-scope cost.
  p3 = value(await move(run, await record(run, p3), 'booked'));
  p3 = value(await move(run, p3, 'preproduction'));
  p3 = await prepare(run, p3, ['crew_confirmed', 'equipment_ready', 'client_assets']);
  value(await run('media_cost_save', { requestId: randomUUID(), productionId: p3.id, media: { category: 'vendor', label: 'Drone operator (not agreed)', amountMinor: 5000, extraScope: true } }));
  // P4 cancelled before booking; P5 only holds a tentative 3 hours.
  value(await move(run, await record(run, p4), 'cancelled', { reason: 'Client postponed indefinitely' }));
  const c5 = await customer(s, 'P5');
  const p5 = value(await brief(run, c5.id, { deliveryDueAt: t0 + 60 * DAY }, t0));
  s.h.m.advance(4 * DAY);
  // A tentative hold later today: shown beside utilisation, never counted in it. (An older hold expires at its start.)
  value(await run('media_reservation_save', { requestId: randomUUID(), productionId: p5.id, mediaResourceId: crew.id, media: { startsAt: s.h.m.now() + HOUR, endsAt: s.h.m.now() + 4 * HOUR } }));
  p2 = await record(run, p2);
  p2 = value(await decide(run, p2.cuts[0], 'approved'));
  p2 = value(await run('media_handoff', { productionId: p2.id, version: p2.version, media: { link: 'https://files.example/p2' } }));

  const ins = value(await run('media_insights', { period: '30d' }));
  const k = id => metric(ins, id);
  assert.deepEqual([k('on_time_delivery').numerator, k('on_time_delivery').denominator, k('on_time_delivery').value, k('on_time_delivery').notes.cancelled, k('on_time_delivery').notes.open_overdue], [1, 3, 33.3, 1, 1]);
  assert.equal(k('approval_wait').numerator, 3, 'three decided cuts');
  assert.equal(k('approval_wait').p90 > k('approval_wait').value, true);
  assert.deepEqual([k('revision_overrun').numerator, k('revision_overrun').denominator, k('revision_overrun').value], [1, 2, 50]);
  assert.deepEqual([k('project_contribution').value, k('project_contribution').revenueMinor, k('project_contribution').costMinor, k('project_contribution').costsComplete, k('project_contribution').notes.costs_not_final], [187000, 225000, 38000, false, 1]);
  assert.deepEqual([k('quote_to_booked').numerator, k('quote_to_booked').denominator, k('quote_to_booked').value], [3, 4, 75]);
  assert.deepEqual([k('shoot_readiness').numerator, k('shoot_readiness').denominator], [13, 15]);
  assert.equal(k('committed_utilization').numerator, 12, 'confirmed hours: P1 crew 4 + camera 4, P2 crew 2, P3 camera 2');
  assert.equal(k('committed_utilization').tentativeHours, 3);
  assert.equal(k('committed_utilization').value, Math.round(12 * 1000 / k('committed_utilization').denominator) / 10);
  assert.deepEqual([k('unapproved_extra_scope').value, k('unapproved_extra_scope').numerator], [5000, 1]);
  assert.equal(k('unapproved_extra_scope').asOf, s.h.m.now());
  assert.equal(k('on_time_delivery').trend.length, 8);
  assert.equal(k('unapproved_extra_scope').trend, undefined, 'no invented trend for a backlog');
  // Drill-down returns exactly the population: the counted rows equal the denominator.
  const records = value(await run('media_metric_records', { metric: 'on_time_delivery', period: '30d' }));
  assert.equal(records.items.filter(r => r.counts).length, 3);
  assert.equal(records.items.filter(r => r.inNumerator).length, 1);
  // A correction (voiding P1's cost) raises contribution by exactly that amount.
  const cost = s.h.m.table('mediaCosts').find(x => x.label === 'Crew day');
  value(await run('media_cost_void', { costId: cost._id }));
  assert.equal(metric(value(await run('media_insights', { period: '30d' })), 'project_contribution').value, 217000);
  // Segments by production type and client cohort.
  const seg = value(await run('media_insights', { period: '30d', segment: 'client_cohort' }));
  assert.deepEqual(seg.segments.rows.map(r => r.key), ['new']);
  refused(await run('media_insights', { segment: 'zodiac' }), 'invalid_segment');
});

test('Follow-ups: the seven filters, one actionable badge, snooze checks its version; a producer sees only their productions and no money', async () => {
  const s = await studio(), run = s.manager, now = s.h.m.now();
  const mine = await customer(s, 'Mine'), theirs = await customer(s, 'Theirs');
  const assigned = value(await brief(run, mine.id, { producerId: s.producerId }, now));
  const other = value(await brief(run, theirs.id, { producerId: undefined }, now));
  value(await run('media_production_save', { productionId: other.id, version: other.version, media: { producerId: '' } }));
  const elsewhere = value(await s.manager('team_invite', { email: 'second@example.com' }));
  const secondId = await s.h.m.db.insert('accounts', { email: 'second@example.com', role: 'customer', createdAt: now });
  await s.h.m.db.patch(elsewhere.id, { accountId: secondId, status: 'active', activatedAt: now });
  const third = value(await brief(run, theirs.id, { producerId: secondId, title: 'Second producer' }, now));
  s.h.m.advance(DAY + MIN);
  const q = value(await run('media_followups'));
  assert.deepEqual(Object.keys(q.counts), ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed']);
  assert.equal(q.counts.today + q.counts.overdue, 3);
  assert.equal(value(await run('overview')).counts.followupsActionable, q.actionable);
  const row = q.items.find(r => String(r.productionId) === String(assigned.id));
  refused(await run('media_task_snooze', { taskId: row.id, version: row.version - 1, dueAt: s.h.m.now() + HOUR }), 'task_conflict');
  value(await run('media_task_snooze', { taskId: row.id, version: row.version, dueAt: s.h.m.now() + HOUR }));
  assert.equal(value(await run('media_followups', { filter: 'scheduled' })).items.length, 1);
  // The producer sees their own and unassigned productions, never another producer's, and no money.
  const list = value(await s.producer('media_productions'));
  assert.deepEqual(list.items.map(p => p.title).sort(), ['Brand film', 'Brand film']);
  assert.equal(list.items.every(p => p.money === undefined), true);
  refused(await s.producer('media_production', { productionId: third.id }), 'production_not_found');
  for (const op of ['media_quote', 'media_accept', 'media_payment_record', 'media_cost_save', 'media_insights', 'media_metric_records', 'media_draft_approve', 'media_resource_save'])
    refused(await s.producer(op, { productionId: assigned.id }), 'manager_required');
  // Chats and Customers read the same production through the conversation.
  const conversation = s.h.m.table('blueConversations').find(c => String(c.contactId) === String(mine.id));
  const ctx = value(await run('media_context', { conversationId: conversation._id }));
  assert.equal(ctx.items[0].id, assigned.id);
  assert.equal(ctx.items[0].openFollowups >= 1, true);
});

test('drafts: approval goes through the shared send path; outside the window without a template it is blocked with one task', async () => {
  const s = await studio(), run = s.manager, now = s.h.m.now(), c = await customer(s, 'Draft');
  const p = value(await brief(run, c.id, {}, now));
  s.h.m.advance(2 * DAY);
  const d = value(await run('media_draft_save', { requestId: randomUUID(), productionId: p.id, media: { text: 'Your first cut is ready for review.' } }));
  refused(await s.producer('media_draft_approve', { draftId: d.id, version: d.version }), 'manager_required');
  const sent = value(await run('media_draft_approve', { draftId: d.id, version: d.version }));
  assert.equal(sent.status, 'template_required');
  value(await run('media_followups'));
  const q = value(await run('media_followups', { filter: 'blocked' }));
  assert.equal(q.items.filter(r => r.kind === 'template_required').length, 1);
});
