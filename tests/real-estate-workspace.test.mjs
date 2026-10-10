// Real Estate's six-tab workspace (ascend/real-estate.md): the four headline KPIs and four
// diagnostics with their populations, the three follow-up rules, the shared Follow-ups queue,
// the deal context Chats and Customers show, and commission money from the order alone.
// Runs the real Convex state code on the in-memory database with a controlled clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { SECRET } from './helpers/convex-memory.mjs';
import { executeHasib } from '../convex/hasib/hasibState.js';
import { grantPlan } from '../convex/hasib/plans.js';
import { hasibArgs } from '../api/_lib/hasib/validate.js';
import { dashboardMap, resolveTab } from '../src/lib/dashboard/navigation.js';

const DAY = 86400000, HOUR = 3600000, MIN = 60000;
const value = r => { assert.equal(r.ok, true, r.reason); return r.value; };
const refused = (r, reason) => { assert.equal(r.ok, false, `expected ${reason}`); assert.equal(r.reason, reason); };
const CHECKS = ['identity', 'authority', 'financing', 'agreement', 'completion'];

async function agency() {
  const h = blueHarness();
  await h.enable();
  await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  const a = await seedTenant(h.m, { name: 'a', sector: 'Real estate' });
  await h.messaging('activate', { sessionHash: a.sessionHash });
  value(await grantPlan(h.m.ctx, { email: 'a@example.com', plan: 'ascend', packId: 'real-estate' }, h.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: a.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, h.m.now());
  const manager = as(null);
  const team = value(await manager('team_invite', { email: 'agent@example.com' }));
  const agentId = await h.m.db.insert('accounts', { email: 'agent@example.com', role: 'customer', createdAt: h.m.now() });
  await h.m.db.patch(team.id, { accountId: agentId, status: 'active', activatedAt: h.m.now() });
  return { h, a, manager, agent: as(agentId), agentId };
}
let phone = 1000000;
async function customer(h, a, name) {
  await h.inbound(a, { from: `9689${phone++}`, text: 'I am looking for a villa', profileName: name });
  return (await h.dashboard('contacts', { sessionHash: a.sessionHash })).value.items.find(c => c.name === name);
}
const listing = async run => {
  const p = value(await run('property_save', { requestId: randomUUID(), workflow: { label: 'Qurum Villa', reference: `RE-${phone}`, transactionType: 'sale', propertyType: 'villa', area: 'Qurum', location: 'Qurum, Muscat', askingPriceMinor: 120000000, bedrooms: 4, authorityStatus: 'confirmed', availability: 'available' } }));
  return value(await run('property_verify', { propertyId: p.id, version: p.version }));
};
const qualify = (run, contactId, extra = {}) => run('opportunity_save', { requestId: randomUUID(), workflow: { contactId, need: 'buy', areas: ['Qurum'], propertyTypes: ['villa'], budgetMinMinor: 100000000, budgetMaxMinor: 130000000, financeReadiness: 'cash', decisionMakerReadiness: 'ready', timeline: '30 days', mustHaves: [], ...extra } });
const book = (run, deal, property, scheduledAt) => run('viewing_save', { requestId: randomUUID(), workflow: { opportunityId: deal.id, propertyId: property.id, status: 'confirmed', scheduledAt } });
const metric = (insights, id) => [...insights.headline, ...insights.diagnostics].find(m => m.id === id);

test('the six tabs: chats, deals, customers, broadcasts, insights, settings; an agent sees no insights or settings', async () => {
  const { manager, agent } = await agency();
  const m = value(await manager('overview'));
  const map = dashboardMap(m, m.capabilities);
  assert.deepEqual(map.sections, ['chats', 'work', 'customers', 'broadcasts', 'insights', 'settings']);
  assert.deepEqual(map.views.work, ['board', 'viewings', 'properties', 'followups']);
  assert.deepEqual(map.views.settings, ['brain', 'rules', 'team', 'business', 'channels', 'accounts']);
  const e = value(await agent('overview'));
  assert.deepEqual(dashboardMap(e, e.capabilities, 'employee').sections, ['chats', 'work', 'customers']);
  // Old links land where their content now lives.
  for (const [tab, view, expected] of [['today', null, ['work', 'board']], ['orders', null, ['work', 'board']], ['stock', null, ['work', 'properties']],
    ['money', null, ['insights', null]], ['team', null, ['settings', 'team']], ['customers', 'broadcast', ['broadcasts', null]], ['contacts', null, ['customers', null]], ['nothing', null, ['work', 'board']]])
    assert.deepEqual(Object.values(resolveTab(tab, view, map)), expected, `${tab} → ${expected}`);
});

test('qualified-to-viewing counts only matured cohorts, attendance leaves timely cancellations out', async () => {
  const { h, a, manager } = await agency();
  const property = await listing(manager);
  const deals = [];
  for (const name of ['Aisha', 'Badr', 'Coral']) deals.push(value(await qualify(manager, (await customer(h, a, name)).id)));
  // Two viewings happen within the 14-day window: one attended, one missed.
  const seen = value(await book(manager, deals[0], property, h.m.now() + DAY));
  const missed = value(await book(manager, deals[1], property, h.m.now() + 2 * DAY));
  const timely = value(await book(manager, deals[2], property, h.m.now() + 5 * DAY));
  h.m.advance(3 * DAY);
  value(await manager('viewing_save', { viewingId: seen.id, version: seen.version, workflow: { status: 'completed', outcome: 'Liked the garden' } }));
  value(await manager('viewing_save', { viewingId: missed.id, version: missed.version, workflow: { status: 'missed' } }));
  value(await manager('viewing_save', { viewingId: timely.id, version: timely.version, workflow: { status: 'cancelled' } })); // two days ahead: timely
  // Before the window matures the cohort is empty: no eligible records, not 0%.
  let insights = value(await manager('real_estate_insights', { period: '30d' }));
  assert.equal(metric(insights, 'qualified_to_viewing').value, null);
  assert.equal(metric(insights, 'qualified_to_viewing').denominator, 0);
  h.m.advance(12 * DAY);
  insights = value(await manager('real_estate_insights', { period: '30d' }));
  const q2v = metric(insights, 'qualified_to_viewing');
  assert.deepEqual([q2v.numerator, q2v.denominator, q2v.value], [1, 3, 33.3]);
  const attendance = metric(insights, 'viewing_attendance');
  assert.deepEqual([attendance.numerator, attendance.denominator, attendance.value], [1, 2, 50]);
  assert.equal(attendance.notes.timely_cancel, 1);
  assert.equal(insights.headline.length, 4);
  assert.equal(insights.diagnostics.length, 4);
  assert.equal(insights.trend, undefined);
  assert.equal(metric(insights, 'qualified_to_viewing').trend.length, 8);
  // The drill-down is exactly the metric's population.
  const records = value(await manager('real_estate_metric_records', { metric: 'qualified_to_viewing', period: '30d' }));
  assert.equal(records.items.length, 3);
  assert.equal(records.items.filter(r => r.inNumerator).length, 1);
  const byAgent = value(await manager('real_estate_insights', { period: '30d', segment: 'agent' }));
  assert.deepEqual(byAgent.segments.rows.map(r => r.key), ['unassigned']);
  const one = value(await manager('real_estate_metric_records', { metric: 'viewing_attendance', period: '30d', segment: 'need:sale' }));
  assert.equal(one.items.filter(r => r.counts).length, 2);
});

test('a late cancellation counts as not attended; an agent cannot read Insights or its records', async () => {
  const { h, a, manager, agent } = await agency();
  const property = await listing(manager);
  const deal = value(await qualify(manager, (await customer(h, a, 'Dana')).id));
  const viewing = value(await book(manager, deal, property, h.m.now() + 2 * HOUR));
  h.m.advance(HOUR);
  value(await manager('viewing_save', { viewingId: viewing.id, version: viewing.version, workflow: { status: 'cancelled' } })); // one hour before: late
  h.m.advance(2 * HOUR);
  const attendance = metric(value(await manager('real_estate_insights', { period: '7d' })), 'viewing_attendance');
  assert.deepEqual([attendance.numerator, attendance.denominator], [0, 1]);
  assert.equal(attendance.notes.late_cancel, 1);
  refused(await agent('real_estate_insights'), 'manager_required');
  refused(await agent('real_estate_metric_records', { metric: 'viewing_attendance' }), 'manager_required');
  refused(await manager('real_estate_metric_records', { metric: 'made_up' }), 'invalid_metric');
});

test('unanswered qualified inquiries wait past the SLA, and a reply clears them', async () => {
  const { h, a, manager } = await agency();
  const who = await customer(h, a, 'Eman');
  const deal = value(await qualify(manager, who.id));
  const conversationId = h.m.table('blueConversations').find(c => c.contactId === who.id)._id;
  value(await manager('opportunity_save', { opportunityId: deal.id, version: deal.version, workflow: { conversationId } }));
  // Layla's automatic reply is older than the customer's next message.
  h.m.advance(10 * MIN);
  await h.m.db.insert('blueMessages', { key: randomUUID(), integrationId: a.integration.id, accountId: a.accountId, conversationId, direction: 'in', text: 'Is it still free?', at: h.m.now(), expiresAt: h.m.now() + DAY, textExpiresAt: h.m.now() + DAY, status: 'received' });
  h.m.advance(30 * MIN);
  assert.equal(metric(value(await manager('real_estate_insights')), 'unanswered_qualified').value, 0, 'inside the 60-minute SLA');
  h.m.advance(40 * MIN);
  const late = metric(value(await manager('real_estate_insights')), 'unanswered_qualified');
  assert.equal(late.value, 1);
  assert.ok(late.asOf, 'a backlog card is as of now');
  await h.m.db.insert('blueMessages', { key: randomUUID(), integrationId: a.integration.id, accountId: a.accountId, conversationId, direction: 'human', text: 'Yes, it is', at: h.m.now(), expiresAt: h.m.now() + DAY, textExpiresAt: h.m.now() + DAY, status: 'sent' });
  assert.equal(metric(value(await manager('real_estate_insights')), 'unanswered_qualified').value, 0);
});

test('commission overdue reads the order balance past the due date; "paid" records the balance as a payment', async () => {
  const { h, a, manager } = await agency();
  assert.equal(metric(value(await manager('real_estate_insights')), 'commission_overdue').value, null, 'no commission yet: nothing to be overdue on');
  const property = await listing(manager);
  const deal = value(await qualify(manager, (await customer(h, a, 'Fahad')).id));
  let offer = value(await manager('offer_save', { requestId: randomUUID(), workflow: { opportunityId: deal.id, propertyId: property.id, amountMinor: 115000000, terms: 'T'.repeat(1500), decisionDueAt: h.m.now() + DAY } }));
  assert.equal(offer.terms.length, 1500, 'long terms are kept');
  offer = value(await manager('offer_approve', { offerId: offer.id, version: offer.version }));
  offer = value(await manager('offer_save', { offerId: offer.id, version: offer.version, workflow: { status: 'presented' } }));
  h.m.advance(2 * DAY);
  const backlog = metric(value(await manager('real_estate_insights')), 'offer_backlog');
  assert.deepEqual([backlog.value, backlog.valueMinor], [1, 115000000]);
  offer = value(await manager('offer_save', { offerId: offer.id, version: offer.version, workflow: { status: 'accepted' } }));
  let version = 0;
  for (const kind of CHECKS) version = value(await manager('compliance_update', { opportunityId: deal.id, version, kind, status: 'confirmed' })).version;
  const commission = value(await manager('deal_close', { opportunityId: deal.id, offerId: offer.id, commissionMinor: 2400000, dueAt: h.m.now() + 10 * DAY }));
  assert.equal(commission.dueAt, h.m.now() + 10 * DAY);
  const order = h.m.table('hasibOrders').find(o => o._id === commission.orderId);
  value(await manager('payment_record', { requestId: randomUUID(), orderId: order._id, amountMinor: 400000, method: 'cash' }));
  h.m.advance(11 * DAY);
  const overdue = metric(value(await manager('real_estate_insights')), 'commission_overdue');
  assert.equal(overdue.value, 2000000, 'the unpaid balance, not the full commission');
  const rows = value(await manager('commissions')).items;
  assert.deepEqual([rows[0].balanceMinor, rows[0].status], [2000000, 'due']);
  refused(await manager('commission_record', { commissionId: commission.id, status: 'paid' }), 'invalid_request');
  const paid = value(await manager('commission_record', { requestId: randomUUID(), commissionId: commission.id, status: 'paid' }));
  assert.deepEqual([paid.balanceMinor, paid.status], [0, 'paid']);
  assert.equal(h.m.table('hasibOrders').find(o => o._id === commission.orderId).paidMinor, 2400000);
  assert.equal(metric(value(await manager('real_estate_insights')), 'commission_overdue').value, 0);
});

test('rules stay off until saved, then open one task each; a reply or a reschedule stops them', async () => {
  const { h, a, manager, agent, agentId } = await agency();
  const who = await customer(h, a, 'Ghada');
  // Missing requirements: a deal without a budget.
  const open = value(await manager('opportunity_save', { requestId: randomUUID(), workflow: { contactId: who.id, need: 'rent', areas: ['Qurum'], propertyTypes: ['flat'], budgetMaxMinor: 0, assignedAccountId: String(agentId) } }));
  h.m.advance(3 * HOUR);
  // Layla's turn opened a first deal for the inquiry; the rule follows the one under test.
  const kinds = async (run, id = open.id) => value(await run('real_estate_overview')).tasks.filter(t => t.entityId === String(id) || (t.entityType === 'viewing')).map(t => t.kind).filter(k => k.startsWith('rule_'));
  assert.deepEqual(await kinds(manager), [], 'off until the owner saves the rule');
  refused(await manager('settings_update', { realEstate: { rules: [{ id: 'missing_requirements', enabled: true, mode: 'task', offsetMinutes: 1 }] } }), 'invalid_settings');
  value(await manager('settings_update', { realEstate: { rules: [{ id: 'missing_requirements', enabled: true, mode: 'task', offsetMinutes: 120 }, { id: 'viewing_confirmation', enabled: true, mode: 'task', offsetMinutes: 1440 }] } }));
  assert.deepEqual(await kinds(manager), ['rule_missing_requirements']);
  assert.deepEqual(await kinds(manager), ['rule_missing_requirements'], 'no duplicate on the next read');
  assert.deepEqual(await kinds(agent), ['rule_missing_requirements'], 'the deal\'s agent sees it');
  const task = h.m.table('realEstateTasks').find(t => t.kind === 'rule_missing_requirements' && t.entityId === String(open.id));
  assert.equal(String(task.assignedAccountId), String(agentId));
  // The customer answers: the task closes itself.
  await h.inbound(a, { from: who.number, text: 'Budget is 600 a month' });
  const conversation = h.m.table('blueConversations').find(c => c.contactId === who.id);
  await h.m.db.patch(open.id, { conversationId: conversation._id });
  assert.deepEqual(await kinds(manager), []);
  assert.equal(h.m.table('realEstateTasks').find(t => t._id === task._id).resolution, 'cleared');

  // Viewing confirmation: the day before; rescheduling replaces it, never after the start.
  const property = await listing(manager);
  const deal = value(await qualify(manager, (await customer(h, a, 'Hind')).id));
  let viewing = value(await book(manager, deal, property, h.m.now() + 20 * HOUR));
  assert.ok((await kinds(manager)).includes('rule_viewing_confirmation'));
  viewing = value(await manager('viewing_save', { viewingId: viewing.id, version: viewing.version, workflow: { scheduledAt: h.m.now() + 22 * HOUR } }));
  value(await manager('real_estate_overview'));
  const confirmations = h.m.table('realEstateTasks').filter(t => t.kind === 'rule_viewing_confirmation');
  assert.equal(confirmations.length, 2);
  assert.equal(confirmations.filter(t => t.status === 'open').length, 1, 'the old reminder was replaced');
  h.m.advance(23 * HOUR);
  assert.ok(!(await kinds(manager)).includes('rule_viewing_confirmation'), 'expired at the start');
});

test('draft mode writes the message from approved records; it is cancelled when the cause goes away', async () => {
  const { h, a, manager } = await agency();
  value(await manager('settings_update', { realEstate: { rules: [{ id: 'post_viewing_decision', enabled: true, mode: 'draft', offsetMinutes: 60 }] } }));
  const property = await listing(manager);
  const deal = value(await qualify(manager, (await customer(h, a, 'Iman')).id));
  const viewing = value(await book(manager, deal, property, h.m.now() + HOUR));
  h.m.advance(2 * HOUR);
  value(await manager('viewing_save', { viewingId: viewing.id, version: viewing.version, workflow: { status: 'completed', outcome: 'Wants to think' } }));
  h.m.advance(2 * HOUR);
  const queue = value(await manager('real_estate_followups', { filter: 'approval' }));
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].ruleId, 'post_viewing_decision');
  assert.match(queue.items[0].text, /Qurum Villa/);
  assert.doesNotMatch(queue.items[0].text, /available|OMR/i);
  assert.equal(queue.counts.approval, 1);
  value(await manager('real_estate_overview'));
  assert.equal(h.m.table('realEstateDrafts').length, 1, 'one draft per firing');
  // An offer arrives: the unsent draft is cancelled.
  value(await manager('offer_save', { requestId: randomUUID(), workflow: { opportunityId: deal.id, propertyId: property.id, amountMinor: 110000000, terms: 'Cash' } }));
  value(await manager('real_estate_overview'));
  assert.equal(h.m.table('realEstateDrafts')[0].status, 'cancelled');
  assert.equal(value(await manager('real_estate_followups', { filter: 'approval' })).items.length, 0);
});

test('Follow-ups merge tasks, drafts and dated follow-ups; snooze checks the version; context links the chat to the deal', async () => {
  const { h, a, manager, agent } = await agency();
  const who = await customer(h, a, 'Jamal');
  const deal = value(await qualify(manager, who.id));
  value(await manager('followup_save', { requestId: randomUUID(), contactId: who.id, dueAt: h.m.now() + 2 * DAY, reason: 'Send the floor plan', linkedType: 'opportunity', linkedId: deal.id }));
  const draft = value(await manager('draft_save', { requestId: randomUUID(), workflow: { opportunityId: deal.id, text: 'D'.repeat(3000) } }));
  assert.equal(draft.text.length, 3000);
  const all = value(await manager('real_estate_followups', {}));
  assert.deepEqual(all.items.map(r => [r.source, r.bucket]).sort(), [['draft', 'approval'], ['followup', 'scheduled']].sort());
  assert.ok(all.items.every(r => String(r.opportunityId) === String(deal.id) && r.contactName === 'Jamal'));
  assert.equal(all.actionable, 1);
  assert.equal(value(await agent('real_estate_followups', {})).items.length, 2, 'unassigned deals are the agent\'s too');
  // A dashboard-created task can be snoozed once per version.
  const property = await listing(manager);
  const viewing = value(await book(manager, deal, property, h.m.now() + HOUR));
  h.m.advance(2 * HOUR);
  const missing = value(await manager('real_estate_followups', { filter: 'today' })).items.find(r => r.kind === 'viewing_outcome_missing');
  assert.ok(missing, 'the viewing time passed without an outcome');
  refused(await manager('real_estate_task_snooze', { taskId: missing.id, version: missing.version + 1, dueAt: h.m.now() + DAY }), 'task_conflict');
  value(await manager('real_estate_task_snooze', { taskId: missing.id, version: missing.version, dueAt: h.m.now() + DAY }));
  assert.equal(value(await manager('real_estate_followups', { filter: 'scheduled' })).items.filter(r => r.kind === 'viewing_outcome_missing').length, 1);
  // The chat shows this customer's deal, its next viewing and open follow-ups.
  const conversationId = h.m.table('blueConversations').find(c => c.contactId === who.id)._id;
  const context = value(await manager('real_estate_context', { conversationId })).items;
  assert.equal(context.length >= 1, true);
  const linked = context.find(d => d.id === deal.id);
  assert.equal(linked.openFollowups, 3);
  assert.equal(value(await manager('viewings', { opportunityId: deal.id })).items[0].id, viewing.id);
  // Replays return the same draft.
  const requestId = randomUUID();
  const one = value(await manager('draft_save', { requestId, workflow: { opportunityId: deal.id, text: 'Hello' } }));
  assert.equal(value(await manager('draft_save', { requestId, workflow: { opportunityId: deal.id, text: 'Hello' } })).id, one.id);
});

test('the API keeps long offer terms, drafts and outcomes instead of dropping them', () => {
  const shape = hasibArgs;
  const body = shape('offer_save', { requestId: randomUUID(), workflow: { opportunityId: 'x'.repeat(10), terms: 'T'.repeat(1800), decisionDueAt: 5 } });
  assert.equal(body.workflow.terms.length, 1800);
  assert.equal(body.workflow.decisionDueAt, 5);
  assert.equal(shape('draft_save', { requestId: randomUUID(), workflow: { text: 'D'.repeat(3900) } }).workflow.text.length, 3900);
  assert.equal(shape('viewing_save', { requestId: randomUUID(), workflow: { outcome: 'O'.repeat(450) } }).workflow.outcome.length, 450);
  const settings = shape('settings_update', { realEstate: { viewingWindowDays: 21, rules: [{ id: 'viewing_confirmation', enabled: true, mode: 'draft', offsetMinutes: 600 }] } });
  assert.deepEqual(settings.realEstate, { viewingWindowDays: 21, rules: [{ id: 'viewing_confirmation', enabled: true, mode: 'draft', offsetMinutes: 600 }] });
});

test('board helpers: stage columns, quick filters, forward moves and the Insights round trip', async () => {
  const { groupByStage, quickFilter, forwardStages, nextViewings, metricSearch, insightsReturn, requirementLine } = await import('../src/lib/hasib/realEstateWork.js');
  const now = 1_000_000_000;
  const deals = [{ id: 'a', stage: 'new', updatedAt: 2, assignedAccountId: 'me' }, { id: 'b', stage: 'new', updatedAt: 1 }, { id: 'c', stage: 'offer', updatedAt: 3, assignedAccountId: 'other' }, { id: 'd', stage: 'won' }];
  const columns = groupByStage(deals);
  assert.deepEqual(columns.new.map(d => d.id), ['b', 'a'], 'stalest first');
  assert.equal(columns.won, undefined, 'closed deals are not columns');
  assert.deepEqual(forwardStages('qualified'), ['viewing', 'offer']);
  assert.deepEqual(forwardStages('offer'), []);
  assert.deepEqual(quickFilter(deals, 'mine', { actorAccountId: 'me' }).map(d => d.id), ['a']);
  assert.deepEqual(quickFilter(deals, 'unassigned').map(d => d.id), ['b', 'd']);
  assert.deepEqual(quickFilter(deals, 'awaiting', { tasks: [{ kind: 'first_response_overdue', entityType: 'opportunity', entityId: 'b' }, { kind: 'stale_listing', entityType: 'property', entityId: 'a' }] }).map(d => d.id), ['b']);
  const viewing = nextViewings([{ opportunityId: 'a', status: 'confirmed', scheduledAt: now + DAY }, { opportunityId: 'a', status: 'requested', scheduledAt: now - HOUR }, { opportunityId: 'c', status: 'cancelled', scheduledAt: now + HOUR }], now);
  assert.equal(viewing.get('a').scheduledAt, now - HOUR, 'a viewing still waiting for its outcome leads');
  assert.equal(viewing.has('c'), false);
  assert.deepEqual(quickFilter(deals, 'viewing_due', { viewing, now }).map(d => d.id), ['a']);
  const search = metricSearch({ metric: 'viewing_attendance', period: '7d', segment: 'need:rent' });
  assert.deepEqual(insightsReturn(new URLSearchParams(search)), { metric: 'viewing_attendance', period: '7d', segment: 'need' });
  assert.equal(requirementLine({ propertyTypes: ['villa'], areas: ['Qurum', 'MSQ'] }, t => t.toUpperCase()), 'VILLA · Qurum، MSQ');
});
