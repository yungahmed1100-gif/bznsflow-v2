// HVAC on the six-tab kit (ascend/hvac.md): Layla's intake, rules that send recorded facts by
// themselves, decisions that wait for the owner, Adiba's estimate and renewal offers with the
// customer's yes, contract visits Hasib opens, and the fences that keep prices, payments and checks
// with people. Each of the spec's eight events has a named check: no evidence → nothing; the
// qualifying fact → one action; a replay → no duplicate; the stop condition → suppressed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shop, customer, unit, job, jobRow, visitRow, move, book, visitMove, estimate, issue, approve, checklist, completeJob, value, refused, randomUUID, MIN, HOUR, DAY } from './fixtures/ascend/hvac.mjs';
import { clinic } from './fixtures/ascend/dental.mjs';
import { assertHasibRows } from './helpers/hasib-contract.mjs';

const drafts = (c, rule) => c.h.m.table('hvacDrafts').filter(d => !rule || d.ruleId === rule);
const sent = c => c.h.m.table('blueMessages').filter(m => m.direction === 'out' && m.hvacDraftId);
const offers = c => c.h.m.table('adibaOffers');
const tasks = (c, kind) => c.h.m.table('hvacTasks').filter(t => t.kind === kind && t.status === 'open');

test('a new AC business starts on the agreed defaults: facts send themselves, decisions wait, risks are tasks', async () => {
  const c = await shop();
  const settings = value(await c.manager('overview')).settings.hvac;
  assert.deepEqual(settings.rules.map(r => [r.id, r.enabled, r.mode]), [['visit_reminder', true, 'auto'], ['job_complete', true, 'auto'], ['estimate_followup', true, 'draft'],
    ['service_due', true, 'draft'], ['amc_renewal', true, 'draft'], ['balance_due', true, 'draft'], ['parts_delay', true, 'task'], ['visit_unrecorded', true, 'task']]);
  assert.deepEqual([settings.autoQuoteLimitMinor, settings.serviceAreas], [0, []], 'Hasib quotes nothing by himself until the owner sets a limit');
  refused(await c.manager('settings_update', { hvacSettings: { rules: [{ id: 'amc_renewal', enabled: true, mode: 'send_now', offsetMinutes: 60 }] } }), 'invalid_settings');
  value(await c.manager('settings_update', { hvacSettings: { serviceAreas: ['Al Khuwair', 'Seeb'], arrivalGraceMinutes: 45 } }));
  assert.deepEqual(value(await c.manager('overview')).settings.hvac.serviceAreas, ['Al Khuwair', 'Seeb']);
  refused(await c.desk('settings_update', { hvacSettings: { arrivalGraceMinutes: 10 } }), 'manager_required');
});

test('hvac.request: Layla turns an AC message into one urgent request for the team to triage; nothing is booked or priced', async () => {
  const c = await shop();
  value(await c.manager('settings_update', { hvacSettings: { serviceAreas: ['Seeb'] } }));
  await customer(c, 'Hello only', 'Hi, what time do you open?');
  assert.equal(c.h.m.table('hvacJobs').length, 0, 'no AC words, no request');
  const s = await customer(c, 'Salma', 'السلام عليكم، المكيف ما يبرد');
  const [j] = c.h.m.table('hvacJobs');
  assert.deepEqual([j.status, j.source, j.urgent, j.reportedSymptom, j.jobType, !!j.conversationId], ['requested', 'layla', true, 'not_cooling', 'repair', true]);
  await c.h.inbound(c.t, { from: s.from, text: 'المكيف ما يبرد أبداً، متى تقدرون تجون؟' });
  assert.equal(c.h.m.table('hvacJobs').length, 1, 'a customer with an open job is talking about that job');
  assert.equal(c.h.m.table('hvacVisits').length + c.h.m.table('hvacEstimates').length, 0);
  value(await c.manager('hvac_overview'));
  assert.equal(tasks(c, 'triage_request').length, 1);
  value(await move(c, c.desk, j._id, 'triaged'));
  value(await c.manager('hvac_followups'));
  assert.equal(tasks(c, 'triage_request').length, 0, 'the triage closes the task by itself');
  // A dental clinic on the same platform never gets an AC job.
  const d = await clinic({ h: c.h, name: 'd', waba: '9999', phone: '9998', sender: '96890000009' });
  await d.h.inbound(d.t, { from: '96891111111', text: 'my AC is not cooling', profileName: 'Wrong shop' });
  assert.equal(c.h.m.table('hvacJobs').length, 1);
  assertHasibRows(c.h.m);
});

test('a staff job outside the service areas is flagged for the team, not declined', async () => {
  const c = await shop();
  value(await c.manager('settings_update', { hvacSettings: { serviceAreas: ['Seeb'] } }));
  const a = await customer(c, 'Amal');
  const j = value(await job(c, c.desk, a.id, { area: 'Sur' }));
  assert.deepEqual([j.outOfArea, j.status], [true, 'triaged']);
  assert.equal(value(await job(c, c.desk, (await customer(c, 'Badr')).id, { area: 'seeb' })).outOfArea, undefined);
});

test('hvac.estimate: Adiba offers the estimate, the owner approves, Layla sends it, and the customer’s yes approves that version only', async () => {
  const c = await shop();
  const s = await customer(c, 'Huda');
  const j = value(await job(c, c.desk, s.id, { jobType: 'gas_refill' }));
  value(await estimate(c, c.desk, j.id, c.gas));
  await c.run();
  const [o] = offers(c);
  assert.deepEqual([o.status, o.reasons, o.lines[0].priceSource, o.totalMinor], ['awaiting_approval', ['auto_quote_off'], 'catalog_fixed', 15000]);
  await c.run();
  assert.equal(offers(c).length, 1, 'one offer per estimate');
  value(await c.manager('adiba_offer_approve', { offerId: o._id, version: o.version }));
  assert.deepEqual([offers(c)[0].status, c.h.m.table('hvacEstimates')[0].status, jobRow(c, j.id).status], ['sent', 'issued', 'estimate_pending']);
  await c.h.inbound(c.t, { from: s.from, text: 'نعم' });
  const e = c.h.m.table('hvacEstimates')[0];
  assert.deepEqual([e.status, e.evidenceSource, jobRow(c, j.id).status, jobRow(c, j.id).approvedEstimateNumber], ['approved', 'whatsapp', 'approved', 1]);
  assert.match(e.approvedBy, /OFR-\d{3}$/);
  assertHasibRows(c.h.m);
});

test('Hasib sends an estimate himself only when every line is the catalog’s fixed price within the limit; a typed price goes to the owner', async () => {
  const c = await shop();
  value(await c.manager('settings_update', { hvacSettings: { autoQuoteLimitMinor: 50000 } }));
  const a = await customer(c, 'Amal'), b = await customer(c, 'Badr');
  const ja = value(await job(c, c.desk, a.id)), jb = value(await job(c, c.desk, b.id));
  value(await estimate(c, c.desk, ja.id, c.cleaning, 2));
  value(await c.desk('hvac_estimate_save', { requestId: randomUUID(), jobId: jb.id, hvac: { lines: [{ kind: 'part', name: 'Capacitor', qty: 1, unitPriceMinor: 9000 }] } }));
  assert.match(await c.run(), /quoted:1/);
  const byJob = id => offers(c).find(o => o.subjectId === String(id));
  assert.equal(byJob(ja.id).status, 'sent');
  assert.match(c.h.m.table('ascendActivity').find(x => x.action === 'offer_approved').details, /^agent:hasib\|OFR-/);
  assert.deepEqual([byJob(jb.id).status, byJob(jb.id).lines[0].priceSource], ['awaiting_approval', 'owner'], 'a typed figure never goes out without the owner');
});

test('a revised estimate withdraws the offer already sent, so a late yes approves nothing', async () => {
  const c = await shop();
  value(await c.manager('settings_update', { hvacSettings: { autoQuoteLimitMinor: 100000 } }));
  const s = await customer(c, 'Khalid');
  const j = value(await job(c, c.desk, s.id));
  value(await estimate(c, c.desk, j.id, c.gas));
  await c.run();
  assert.equal(offers(c)[0].status, 'sent');
  value(await estimate(c, c.desk, j.id, c.gas, 2));
  await c.h.inbound(c.t, { from: s.from, text: 'yes' });
  assert.notEqual(jobRow(c, j.id).status, 'approved', 'the yes was to the old price');
  assert.equal(c.h.m.table('hvacEstimates').filter(e => e.status === 'approved').length, 0);
  await c.run();
  assert.equal(offers(c)[0].status, 'cancelled', 'the old offer is withdrawn');
  assert.deepEqual([offers(c)[1].status, offers(c)[1].totalMinor], ['sent', 30000], 'and the new price goes out as its own offer');
});

test('hvac.scheduled: the visit reminder sends itself once, a day before; a moved visit gets a new reminder and the old one is withdrawn', async () => {
  const c = await shop();
  const s = await customer(c, 'Mona');
  const j = value(await job(c, c.desk, s.id, { jobType: 'inspection' }));
  const v = value(await book(c, c.desk, j.id, 30 * HOUR));
  await c.run();
  assert.equal(drafts(c, 'visit_reminder').length, 0, 'not yet: more than a day away');
  c.h.m.advance(7 * HOUR);
  await c.h.inbound(c.t, { from: s.from, text: 'ok thanks' });
  assert.match(await c.run(), /sent:1/);
  assert.match(sent(c)[0].text, /#1/);
  assert.equal(sent(c)[0].manual, false, 'sent as Layla; the chat is not taken over');
  await c.run();
  assert.equal(sent(c).length, 1, 'one message per window');
  value(await c.desk('hvac_visit_save', { visitId: v.id, version: visitRow(c, v.id).version, hvac: { startsAt: c.h.m.now() + 20 * HOUR, endsAt: c.h.m.now() + 22 * HOUR } }));
  await c.run();
  assert.equal(sent(c).length, 2, 'the new window is announced');
  assert.match(c.h.m.table('ascendActivity').find(a => a.action === 'draft_auto_sent').details, /^agent:hasib\|rule:visit_reminder$/);
});

test('hvac.tested_complete: the completion notice carries the recorded balance; payment stays with people', async () => {
  const c = await shop();
  const s = await customer(c, 'Yusuf');
  const { job: done } = await completeJob(c, s.id);
  await c.h.inbound(c.t, { from: s.from, text: 'thank you' });
  c.h.m.advance(31 * MIN);
  await c.run();
  const message = sent(c).find(m => c.h.m.table('hvacDrafts').find(d => d._id === m.hvacDraftId)?.ruleId === 'job_complete');
  assert.match(message.text, /15\.000 OMR/);
  refused(await c.desk('hvac_payment_record', { requestId: randomUUID(), jobId: done._id, amountMinor: 15000, method: 'cash' }), 'manager_required');
  refused(await c.manager('hvac_payment_record', { requestId: randomUUID(), jobId: done._id, amountMinor: 20000, method: 'cash' }), 'payment_exceeds_balance');
  value(await c.manager('hvac_payment_record', { requestId: randomUUID(), jobId: done._id, amountMinor: 15000, method: 'cash' }));
  assert.equal(c.h.m.table('hasibOrders').find(o => o._id === done.orderId).paidMinor, 15000);
});

test('estimate_followup waits for the owner, steps to day 7, and stops when the customer replies', async () => {
  const c = await shop();
  const s = await customer(c, 'Nasser');
  const j = value(await job(c, c.desk, s.id));
  const e = value(await estimate(c, c.desk, j.id, c.gas));
  value(await issue(c, c.manager, e.id));
  c.h.m.advance(2 * DAY + MIN);
  await c.run();
  const [first] = drafts(c, 'estimate_followup');
  assert.deepEqual([first.status, sent(c).length], ['draft', 0], 'a decision is never sent by itself');
  c.h.m.advance(5 * DAY);
  await c.run();
  assert.deepEqual(drafts(c, 'estimate_followup').map(d => d.status).sort(), ['cancelled', 'draft'], 'the day-7 step replaces the unsent day-2 one');
  await c.h.inbound(c.t, { from: s.from, text: 'Let me think about it' });
  await c.run();
  assert.deepEqual(drafts(c, 'estimate_followup').map(d => d.status), ['cancelled', 'cancelled'], 'a reply stops the follow-up');
});

test('hvac.service_due: a technician’s date becomes a draft a week before; a job for the unit clears it; no date, no reminder', async () => {
  const c = await shop();
  const s = await customer(c, 'Laila');
  const u = value(await unit(c, c.desk, s.id));
  const bare = value(await unit(c, c.desk, s.id, { label: 'Spare room split' }));
  value(await c.tech('hvac_unit_service', { unitId: u.id, version: u.version, hvac: { nextServiceAt: c.h.m.now() + 10 * DAY } }));
  await c.run();
  assert.equal(drafts(c, 'service_due').length, 0);
  c.h.m.advance(3 * DAY + MIN);
  await c.run();
  assert.equal(drafts(c, 'service_due').length, 1);
  assert.ok(!drafts(c, 'service_due').some(d => d.unitId === bare.id), 'no interval is invented for a unit without a date');
  value(await job(c, c.desk, s.id, { jobType: 'cleaning', unitIds: [u.id] }));
  await c.run();
  assert.equal(drafts(c, 'service_due')[0].status, 'cancelled');
});

test('contract visits: Hasib opens exactly one job per due visit, never twice, and the team books it', async () => {
  const c = await shop();
  const s = await customer(c, 'Rashid');
  const u = value(await unit(c, c.desk, s.id));
  const draft = value(await c.manager('hvac_contract_save', { requestId: randomUUID(), contactId: s.id, hvac: { unitIds: [u.id], visitsPerYear: 4, priceMinor: 40000 } }));
  value(await c.manager('hvac_contract_status', { contractId: draft.id, version: draft.version, status: 'active', evidenceSource: 'in_person' }));
  const visits = () => c.h.m.table('hvacJobs').filter(j => j.contractId === draft.id);
  assert.equal(visits().length, 1);
  await c.run(); await c.run();
  assert.equal(visits().length, 1, 'never twice');
  value(await c.manager('hvac_followups'));
  assert.equal(tasks(c, 'schedule_job').length, 1, 'the team books the time');
  c.h.m.advance(80 * DAY);
  assert.match(await c.run(), /opened:1/);
  assert.deepEqual(visits().map(j => j.contractVisitIndex).sort(), [0, 1]);
});

test('hvac renewal: a renewal draft waits for the owner, goes as an Adiba offer, and the customer’s yes activates and charges it', async () => {
  const c = await shop();
  const s = await customer(c, 'Saif');
  const u = value(await unit(c, c.desk, s.id));
  const draft = value(await c.manager('hvac_contract_save', { requestId: randomUUID(), contactId: s.id, hvac: { unitIds: [u.id], visitsPerYear: 2, priceMinor: 30000, startsAt: c.h.m.now() - 330 * DAY, endsAt: c.h.m.now() + 35 * DAY } }));
  value(await c.manager('hvac_contract_status', { contractId: draft.id, version: draft.version, status: 'active', evidenceSource: 'signed' }));
  c.h.m.advance(5 * DAY + MIN);
  await c.h.inbound(c.t, { from: s.from, text: 'hello' });
  await c.run();
  const [reminder] = drafts(c, 'amc_renewal');
  assert.deepEqual([reminder.status, sent(c).filter(m => m.hvacDraftId === reminder._id).length], ['draft', 0], 'a renewal is the owner’s decision');
  refused(await c.desk('hvac_draft_approve', { draftId: reminder._id, version: reminder.version }), 'manager_required');
  value(await c.manager('hvac_draft_approve', { draftId: reminder._id, version: reminder.version }));
  assert.equal(sent(c).filter(m => m.hvacDraftId === reminder._id).length, 1);
  const renewal = value(await c.manager('hvac_contract_renew', { contractId: draft.id, hvac: { priceMinor: 32000 } }));
  await c.run();
  const o = offers(c).find(x => x.subjectType === 'hvac_contract');
  assert.deepEqual([o.status, o.lines[0].priceSource, o.totalMinor], ['awaiting_approval', 'owner', 32000], 'the owner’s price, never sent by itself');
  value(await c.manager('adiba_offer_approve', { offerId: o._id, version: o.version }));
  await c.h.inbound(c.t, { from: s.from, text: 'نعم' });
  const active = c.h.m.table('hvacContracts').find(x => x._id === renewal.id);
  assert.deepEqual([active.status, active.acceptanceEvidence, c.h.m.table('hasibOrders').find(x => x._id === active.orderId)?.totalMinor], ['active', 'whatsapp', 32000]);
  assert.equal(c.h.m.table('hvacContracts').find(x => x._id === draft.id).status, 'renewed');
  await c.run();
  assert.equal(drafts(c, 'amc_renewal').filter(d => d.status === 'draft').length, 0, 'renewed: no more reminders');
  assertHasibRows(c.h.m);
});

test('risks are tasks: parts past their date, and a visit window with no arrival (assigned to its technician, closed by the arrival)', async () => {
  const c = await shop();
  const s = await customer(c, 'Hamad');
  const j = value(await job(c, c.desk, s.id));
  const e = value(await estimate(c, c.desk, j.id, c.gas)); value(await issue(c, c.manager, e.id)); value(await approve(c, c.desk, j.id, e.id));
  const v = value(await book(c, c.desk, j.id, HOUR));
  c.h.m.advance(4 * HOUR);
  await c.run();
  const [late] = tasks(c, 'arrival_unrecorded');
  assert.equal(String(late.assignedAccountId), String(c.techId));
  assert.equal(value(await c.tech('hvac_followups')).items.some(t => t.kind === 'arrival_unrecorded'), true, 'the technician sees their own');
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  await c.run();
  assert.equal(tasks(c, 'arrival_unrecorded').length, 0);
  value(await move(c, c.tech, j.id, 'repairing'));
  value(await move(c, c.tech, j.id, 'waiting_parts', { hvac: { partsLabel: 'Compressor', partsExpectedAt: c.h.m.now() + DAY } }));
  await c.run();
  assert.equal(tasks(c, 'rule_parts_delay').length, 0);
  c.h.m.advance(2 * DAY + MIN);
  await c.run();
  assert.equal(tasks(c, 'rule_parts_delay').length, 1);
  assert.equal(sent(c).length, 0, 'a risk is never a message by itself');
});

test('automation can be switched off, and an agent can never move a job’s stages or take payment', async () => {
  const c = await shop();
  process.env.HASIB_AUTOMATION = 'off';
  try { assert.equal(await c.run(), 'off'); } finally { delete process.env.HASIB_AUTOMATION; }
  const { executeHvac } = await import('../convex/hasib/hvacState.js');
  const { automationActor } = await import('../convex/hasib/workspace/automation.js');
  const actor = automationActor({ managerAccountId: c.t.accountId, _id: 'w' }, c.t.accountId, 'hasib');
  for (const operation of ['hvac_job_status', 'hvac_visit_save', 'hvac_payment_record', 'hvac_cost_save', 'hvac_checklist_save', 'hvac_draft_approve'])
    refused(await executeHvac(c.h.m.ctx, { accountId: c.t.accountId }, actor, { operation }, c.h.m.now()), 'automation_not_allowed');
});
