// Construction on the six-tab kit (ascend/construction.md): a certified balance is a fact that sends
// itself; a variation is a contract change, so Adiba drafts it for the owner, the client's yes is
// recorded and the signed copy is the owner's task; employees never see the money.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { SECRET } from './helpers/convex-memory.mjs';
import { executeHasib } from '../convex/hasib/hasibState.js';
import { grantPlan } from '../convex/hasib/plans.js';
import { automationRun } from '../convex/hasib/automationRun.js';
import { assertHasibRows } from './helpers/hasib-contract.mjs';

const DAY = 86400000, HOUR = 3600000;
const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}`); assert.equal(r.reason, reason); };

async function contractor() {
  const h = blueHarness();
  await h.enable();
  await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  const t = await seedTenant(h.m, { name: 'c', sector: 'Construction', waba: '1234', phone: '5678', sender: '96890000000' });
  await h.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(h.m.ctx, { email: 'c@example.com', plan: 'ascend', packId: 'construction' }, h.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, h.m.now());
  const manager = as(null);
  const team = value(await manager('team_invite', { email: 'site-c@example.com' }));
  const staffId = await h.m.db.insert('accounts', { email: 'site-c@example.com', role: 'customer', createdAt: h.m.now() });
  await h.m.db.patch(team.id, { accountId: staffId, status: 'active', activatedAt: h.m.now() });
  const from = '96891234567';
  await h.inbound(t, { from, text: 'About the villa fit-out', profileName: 'Hamed' });
  const contact = (await h.dashboard('contacts', { sessionHash: t.sessionHash })).value.items.find(c => c.name === 'Hamed');
  const now = h.m.now();
  const project = value(await manager('construction_project_save', { requestId: randomUUID(), workflow: { reference: 'P-001', title: 'Villa fit-out', location: 'Al Mouj', contractType: 'lump_sum',
    originalContractMinor: 1000000000, originalBudgetMinor: 800000000, startAt: now - 10 * DAY, contractFinishAt: now + 90 * DAY, contactId: contact.id } }));
  const run = () => automationRun(h.m.ctx, { accountId: t.accountId, workerFunction: null, secret: SECRET }, h.m.now());
  return { h, t, manager, staff: as(staffId), project, contact, from, run };
}
const variation = (c, contractDeltaMinor = 50000000) => c.manager('construction_variation_save', { requestId: randomUUID(), projectId: c.project.id,
  workflow: { projectId: c.project.id, reference: 'VO-01', title: 'Extra power points', reason: 'Client request', contractDeltaMinor, budgetDeltaMinor: 30000000, scheduleDeltaDays: 2 } }).then(value);
const offers = c => c.h.m.table('adibaOffers');

test('a new contractor starts on the agreed defaults, and Settings reaches Channels and BznsBrain', async () => {
  const c = await contractor();
  const settings = value(await c.manager('overview')).settings.construction;
  assert.deepEqual(settings.rules.map(r => [r.id, r.mode]), [['certified_balance_due', 'auto'], ['variation_decision', 'draft'], ['approval_blocker', 'task'], ['milestone_dependency', 'task']]);
  assertHasibRows(c.h.m);
});

test('a variation becomes Adiba’s offer; the owner approves it and it is submitted; the client’s yes is recorded, never approved, and the signed copy is the owner’s task', async () => {
  const c = await contractor();
  const v = await variation(c);
  await c.run();
  const [o] = offers(c);
  assert.deepEqual([o.status, o.reasons, o.totalMinor], ['awaiting_approval', ['extra_scope'], 50000000], 'a contract change always waits for the owner');
  assert.doesNotMatch(o.text, /30[.,]000/, 'the internal cost effect is never in the offer');
  value(await c.manager('adiba_offer_approve', { offerId: o._id, version: o.version }));
  assert.equal(c.h.m.table('constructionVariations')[0].status, 'submitted');
  await c.h.inbound(c.t, { from: c.from, text: 'YES' });
  const after = c.h.m.table('constructionVariations')[0];
  assert.equal(after.status, 'submitted', 'the chat yes does not approve a contract change');
  assert.match(after.customerApproval, /^chat_reply:OFR-\d{3}$/);
  assert.ok(c.h.m.table('constructionTasks').some(t => t.kind === 'signed_variation_required' && t.status === 'open'));
  // The owner approves with the signed copy; the revised contract is the original plus this change, once.
  value(await c.manager('construction_variation_status', { variationId: v.id, version: after.version, status: 'approved' }));
  const metrics = value(await c.manager('construction_insights')).metrics;
  assert.equal(metrics.revisedContractMinor, 1050000000, 'contract 1,050,000, never 1,150,000');
  assertHasibRows(c.h.m);
});

test('an edited or hand-submitted variation cancels Adiba’s unsent draft; a credit stays manual', async () => {
  const c = await contractor();
  const v = await variation(c);
  await c.run();
  value(await c.manager('construction_variation_save', { variationId: v.id, version: v.version, workflow: { contractDeltaMinor: 60000000 } }));
  await c.run();
  const states = offers(c).map(o => [o.status, o.totalMinor]);
  assert.deepEqual(states, [['cancelled', 50000000], ['awaiting_approval', 60000000]]);
  await variation(c, -20000000);
  await c.run();
  assert.equal(offers(c).filter(o => o.totalMinor === -20000000 || o.status === 'needs_price').length, 0, 'no offer for an omission');
});

test('a certified balance past due is told to the client by itself, once; employees never see money rows or figures', async () => {
  const c = await contractor();
  const claim = value(await c.manager('construction_claim_save', { requestId: randomUUID(), projectId: c.project.id, workflow: { projectId: c.project.id, reference: 'IPC-01', grossMinor: 100000000, retentionMinor: 5000000, dueAt: c.h.m.now() + DAY } }));
  let row = value(await c.manager('construction_claim_status', { claimId: claim.id, version: claim.version, status: 'submitted' }));
  row = value(await c.manager('construction_claim_status', { claimId: claim.id, version: row.version, status: 'certified' }));
  c.h.m.advance(2 * DAY + HOUR);
  await c.h.inbound(c.t, { from: c.from, text: 'Any update on the payment?' });
  assert.match(await c.run(), /sent:1/);
  const message = c.h.m.table('blueMessages').find(m => m.direction === 'out' && m.constructionDraftId);
  assert.match(message.text, /IPC-01/);
  assert.match(message.text, /95000\.000 OMR/, 'the certified net balance (gross less retention), as recorded');
  await c.run();
  assert.equal(c.h.m.table('blueMessages').filter(m => m.direction === 'out' && m.constructionDraftId).length, 1);
  const staffView = value(await c.staff('construction_overview'));
  assert.deepEqual(staffView.metrics.map(m => m.key), ['schedule_risk'], 'no variation exposure or receivables for staff');
  assert.equal(staffView.attention.receivablesOverdue, 0);
  const staffQueue = value(await c.staff('construction_followups', {}));
  assert.equal(staffQueue.items.some(r => ['receivable_overdue', 'rule_certified_balance_due'].includes(r.kind) || r.source === 'draft'), false);
  refused(await c.staff('construction_insights'), 'manager_required');
  assertHasibRows(c.h.m);
});

test('Layla takes in a project enquiry as one task for the team, and none for a client who already has a tender', async () => {
  const c = await contractor();
  const from = '96899887766';
  await c.h.inbound(c.t, { from, text: 'We are planning a kitchen', profileName: 'Muna' });
  const muna = c.h.m.table('blueContacts').find(x => x.profileName === 'Muna');
  await c.h.m.db.patch(muna._id, { fields: [...(muna.fields || []), { key: 'project_type', value: 'Kitchen' }] });
  await c.h.inbound(c.t, { from, text: 'When can you visit?' });
  await c.h.inbound(c.t, { from, text: 'Thanks' });
  assert.equal(c.h.m.table('constructionTasks').filter(t => t.kind === 'site_visit_request').length, 1, 'once, however many messages');
  const hamed = c.h.m.table('blueContacts').find(x => x._id === c.contact.id);
  await c.h.m.db.patch(hamed._id, { fields: [...(hamed.fields || []), { key: 'project_type', value: 'Villa' }] });
  await c.h.inbound(c.t, { from: c.from, text: 'Another question' });
  assert.equal(c.h.m.table('constructionTasks').filter(t => t.kind === 'site_visit_request').length, 1, 'Hamed already has a tender project');
});
