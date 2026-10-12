// Automotive on the six-tab kit (ascend/automotive.md): rules that send recorded facts by themselves,
// the Follow-ups queue, Adiba's estimate offers and the customer's yes, Layla's intake, and the
// fences that keep payments, quality checks and stages with people.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { workshop, job, estimate, workOrder, move, value, refused, MIN, HOUR, DAY } from './fixtures/ascend/automotive.mjs';
import { assertHasibRows } from './helpers/hasib-contract.mjs';
import { executeAutomotive } from '../convex/hasib/automotiveState.js';
import { automationActor } from '../convex/hasib/workspace/automation.js';
import { hasibPack } from '../config/hasib-packs.js';

const labour = (w, unitPriceMinor = 45000) => ({ kind: 'labor', name: 'Major service', qty: 1, unitPriceMinor, standardMinutes: 120 });
const sent = w => w.h.m.table('blueMessages').filter(m => m.direction === 'out' && m.automotiveDraftId);
const offers = w => w.h.m.table('adibaOffers');
/** Estimate issued, approved in person, worked, then sent to the quality check. */
async function toQualityCheck(w, work) {
  const e = await estimate(w, work, [labour(w)]);
  value(await w.manager('automotive_estimate_status', { requestId: randomUUID(), estimateId: e.id, version: e.version, status: 'issued' }));
  value(await w.manager('automotive_approval_record', { requestId: randomUUID(), workOrderId: work.id, version: (await workOrder(w, work.id)).version, estimateId: e.id, approvedBy: 'Customer at the desk', evidenceSource: 'in_person' }));
  await move(w, work.id, 'in_progress');
  return move(w, work.id, 'quality_check');
}

test('a new workshop starts on the agreed defaults: facts send themselves, decisions wait, a promise at risk is a task', async () => {
  const w = await workshop();
  const settings = value(await w.manager('overview')).settings.automotive;
  assert.deepEqual(settings.rules.map(r => [r.id, r.enabled, r.mode]),
    [['ready_for_collection', true, 'auto'], ['estimate_reminder', true, 'draft'], ['service_due', true, 'draft'], ['promise_risk', true, 'task']]);
  assert.equal(settings.autoQuoteLimitMinor, 0, 'Hasib quotes nothing by himself until the workshop sets a limit');
  refused(await w.manager('settings_update', { automotiveSettings: { rules: [{ id: 'ready_for_collection', enabled: true, mode: 'send_now', offsetMinutes: 30 }] } }), 'invalid_settings');
  assertHasibRows(w.h.m);
});

test('"ready" reaches the customer only after a passed quality check, by itself, once', async () => {
  const w = await workshop();
  const { work } = await job(w);
  await toQualityCheck(w, work);
  refused(await w.manager('automotive_work_order_status', { requestId: randomUUID(), workOrderId: work.id, version: (await workOrder(w, work.id)).version, status: 'ready' }), 'quality_check_required');
  w.h.m.advance(HOUR);
  await w.run();
  assert.equal(sent(w).length, 0, 'no ready message while the check is missing');
  value(await w.manager('automotive_quality_save', { requestId: randomUUID(), workOrderId: work.id, version: (await workOrder(w, work.id)).version, workflow: { checklist: [{ text: 'Road test', done: true }] } }));
  await move(w, work.id, 'ready');
  w.h.m.advance(31 * MIN);
  assert.match(await w.run(), /sent:1/);
  const [message] = sent(w);
  assert.match(message.text, /quality check and is ready for collection/);
  assert.equal(message.manual, false, 'sent as Layla, the chat is not taken over');
  await w.run();
  assert.equal(sent(w).length, 1, 'one message per event');
  assert.match(w.h.m.table('ascendActivity').find(a => a.action === 'draft_auto_sent').details, /^agent:hasib\|rule:ready_for_collection$/);
  assertHasibRows(w.h.m);
});

test('an estimate becomes Adiba’s offer; the owner approves it, Layla sends it, and the customer’s yes approves that estimate', async () => {
  const w = await workshop();
  const { work, from } = await job(w);
  await estimate(w, work, [labour(w)]);
  await w.run();
  const [o] = offers(w);
  assert.deepEqual([o.status, o.reasons, o.lines[0].priceSource, o.totalMinor], ['awaiting_approval', ['auto_quote_off'], 'settings', 45000], 'priced from the service list; the owner decides');
  value(await w.manager('adiba_offer_approve', { offerId: o._id, version: o.version }));
  assert.equal(offers(w)[0].status, 'sent');
  assert.equal((await w.manager('automotive_estimates')).value.items[0].status, 'issued', 'approving presents the estimate');
  await w.h.inbound(w.t, { from, text: 'YES' });
  const approved = (await w.manager('automotive_estimates')).value.items[0];
  assert.deepEqual([approved.status, approved.evidenceSource], ['approved', 'whatsapp']);
  assert.match(approved.approvedBy, /OFR-\d{3}$/);
  assert.equal((await workOrder(w, work.id)).status, 'approved');
  assertHasibRows(w.h.m);
});

test('Hasib sends an estimate himself only when every price is the workshop’s own and within the limit; a typed price goes to the owner', async () => {
  const w = await workshop();
  value(await w.manager('settings_update', { automotiveSettings: { autoQuoteLimitMinor: 100000 } }));
  const a = await job(w, { name: 'Amal' }), b = await job(w, { name: 'Badr' });
  await estimate(w, a.work, [labour(w)]);
  await estimate(w, b.work, [labour(w, 50000)]);
  assert.match(await w.run(), /quoted:1/);
  const byWork = id => offers(w).find(o => o.subjectId === String(id));
  assert.equal(byWork(a.work.id).status, 'sent');
  assert.match(w.h.m.table('ascendActivity').find(x => x.action === 'offer_approved').details, /^agent:hasib\|OFR-/);
  assert.deepEqual([byWork(b.work.id).status, byWork(b.work.id).lines[0].priceSource], ['awaiting_approval', 'owner'], 'an advisor’s figure is never sent without the owner');
  assertHasibRows(w.h.m);
});

test('a revised estimate withdraws the offer already sent, so a late yes approves nothing', async () => {
  const w = await workshop();
  value(await w.manager('settings_update', { automotiveSettings: { autoQuoteLimitMinor: 100000 } }));
  const { work, from } = await job(w);
  await estimate(w, work, [labour(w)]);
  await w.run();
  assert.equal(offers(w)[0].status, 'sent');
  await estimate(w, work, [labour(w), { kind: 'fee', name: 'Disposal', qty: 1, unitPriceMinor: 2000 }]);
  await w.h.inbound(w.t, { from, text: 'YES' });
  const latest = (await w.manager('automotive_estimates')).value.items.find(e => e.estimateNumber === 2);
  assert.notEqual(latest.status, 'approved', 'the yes was to the old price');
  assert.equal((await workOrder(w, work.id)).status, 'awaiting_approval');
  await w.run();
  assert.equal(offers(w).find(o => o.requestId.endsWith(String(w.h.m.table('automotiveEstimates').find(e => e.estimateNumber === 1)._id)))?.status, 'cancelled');
  assertHasibRows(w.h.m);
});

test('Follow-ups: a promise at risk is a task, an issued estimate waits on the customer, and staff never approve drafts', async () => {
  const w = await workshop();
  const { work } = await job(w, { promisedIn: HOUR });
  const e = await estimate(w, work, [labour(w)]);
  value(await w.manager('automotive_estimate_status', { requestId: randomUUID(), estimateId: e.id, version: e.version, status: 'issued' }));
  const queue = value(await w.manager('automotive_followups', {}));
  const kinds = queue.items.map(r => [r.kind, r.bucket]);
  assert.ok(kinds.some(([k]) => k === 'rule_promise_risk'), 'promised in an hour: the team is told');
  assert.ok(kinds.some(([k, b]) => k === 'estimate_issued' && b === 'waiting'));
  const overview = value(await w.manager('automotive_overview'));
  assert.equal(overview.attention.awaitingApproval, 1);
  assert.ok(overview.followups.actionable >= 1);
  w.h.m.advance(25 * HOUR);
  const draft = value(await w.manager('automotive_followups', { filter: 'decision' })).items.find(r => r.source === 'draft' && r.ruleId === 'estimate_reminder');
  assert.ok(draft, 'the estimate reminder waits for the manager');
  refused(await w.technician('automotive_draft_approve', { draftId: draft.id, version: draft.version }), 'manager_required');
  assertHasibRows(w.h.m);
});

test('Layla takes in a service request as one task; automated actors cannot move stages, take payments or check quality', async () => {
  const w = await workshop();
  const { contact, from, work } = await job(w);
  const row = w.h.m.table('blueContacts').find(c => c._id === contact.id);
  await w.h.m.db.patch(row._id, { fields: [...(row.fields || []), { key: 'service', value: 'Brake check' }] });
  await w.h.inbound(w.t, { from, text: 'Can I bring it tomorrow?' });
  await w.h.inbound(w.t, { from, text: 'Morning is better' });
  assert.equal(w.h.m.table('automotiveTasks').filter(t => t.kind === 'chat_booking_request' && t.status === 'open').length, 1, 'once, however many messages');
  const tenant = { accountId: w.t.accountId, pack: hasibPack('automotive') }, bot = automationActor(null, w.t.accountId, 'hasib');
  for (const operation of ['automotive_work_order_status', 'automotive_quality_save', 'automotive_part_status', 'automotive_appointment_status'])
    refused(await executeAutomotive(w.h.m.ctx, tenant, bot, { operation, workOrderId: work.id }, w.h.m.now()), 'automation_not_allowed');
});
