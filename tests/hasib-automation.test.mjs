// Hasib's scheduled run for Media: a rule set to Auto sends its message by itself, but only through
// the same fences as Layla's replies (window, takeover, opt-out, owner pause, a daily cap), never twice,
// and the activity names the agent. A dashboard read never sends. Fake clock, in-memory Convex.
import test from 'node:test';
import { assertHasibRows } from './helpers/hasib-contract.mjs';
import assert from 'node:assert/strict';
import { studio, customer, resource, brief, accepted, hold, move, value, HOUR, DAY } from './fixtures/ascend/media.mjs';
import { automationRun, automationSweep } from '../convex/hasib/automationRun.js';
import { AUTO_SENDS_PER_DAY } from '../convex/hasib/workspace/autoSend.js';
import { automationActor, automationRefusal, agentDetails } from '../convex/hasib/workspace/automation.js';

const autoMessages = s => s.h.m.table('blueMessages').filter(m => String(m.key || '').startsWith('auto:'));
const prepDrafts = s => s.h.m.table('mediaDrafts').filter(d => d.ruleId === 'prep_request');

/** A booked production two hours before its shoot, with the customer's files still missing: prep_request fires. */
async function bookedWithGaps(s, name = 'Salma') {
  const run = s.manager, now = s.h.m.now(), c = await customer(s, name);
  const conversation = s.h.m.table('blueConversations').find(x => String(x.contactId) === String(c.id));
  let p = value(await brief(run, c.id, { conversationId: conversation._id }, now));
  p = await accepted(run, p);
  await hold(run, p, [await resource(run, `Crew ${name}`, 'crew')], p.shootStartsAt, p.shootEndsAt);
  p = value(await move(run, value(await run('media_production', { productionId: p.id })), 'booked'));
  return { p, conversation };
}
const runOnce = s => automationRun(s.h.m.ctx, { accountId: s.t.accountId, workerFunction: null, secret: 'x' }, s.h.m.now());

test('a new studio sends its prep request by itself, once, named as Hasib; a dashboard read sends nothing', async () => {
  const s = await studio();
  await bookedWithGaps(s);
  value(await s.manager('media_overview'));
  assert.equal(autoMessages(s).length, 0, 'reading the workspace never sends');
  assert.equal(prepDrafts(s).length, 1, 'the auto rule wrote its draft from the records');
  assert.match(await runOnce(s), /^sent:1 skipped:0/);
  const [msg] = autoMessages(s);
  assert.equal(msg.manual, false, 'sent as an automated reply, so every Layla fence applies');
  assert.equal(msg.handoff, false);
  assert.equal(s.h.m.table('blueConversations').find(c => c._id === msg.conversationId).takeover, false, 'the chat is not taken over');
  const draft = prepDrafts(s)[0];
  assert.deepEqual([draft.status, draft.sentBy], ['queued', 'automation']);
  const act = s.h.m.table('ascendActivity').find(a => a.action === 'draft_auto_sent');
  assert.equal(act.actorRole, 'automation');
  assert.match(act.details, /^agent:hasib\|rule:prep_request$/);
  assert.match(await runOnce(s), /^sent:0 skipped:0/);
  assert.equal(autoMessages(s).length, 1, 'never sent twice');
  assertHasibRows(s.h.m);
});

test('fences: a closed window, a team takeover, an opt-out or a paused Layla keep the draft, with the reason', async () => {
  for (const [reason, arrange] of [
    ['window_closed', (s, c) => s.h.m.db.patch(c._id, { lastInbound: s.h.m.now() - DAY - HOUR })],
    ['team_handling', (s, c) => s.h.m.db.patch(c._id, { takeover: true })],
    ['opted_out', (s, c) => s.h.m.db.patch(c._id, { optout: true })],
    ['layla_paused', s => s.h.m.db.patch(s.h.m.table('blueMessagingControls')[0]._id, { active: false })],
  ]) {
    const s = await studio();
    const { conversation } = await bookedWithGaps(s);
    await arrange(s, conversation);
    await runOnce(s);
    assert.equal(autoMessages(s).length, 0, reason);
    const draft = prepDrafts(s)[0];
    assert.deepEqual([draft?.status, draft?.autoSkip], ['draft', reason], `${reason}: the draft waits with its reason`);
    assertHasibRows(s.h.m);
  }
});

test('at most three automatic messages per customer a day', async () => {
  const s = await studio();
  const { conversation } = await bookedWithGaps(s);
  for (let i = 0; i < AUTO_SENDS_PER_DAY; i++) await s.h.m.db.insert('blueMessages', { key: `auto:other:${i}`, integrationId: conversation.integrationId, accountId: s.t.accountId,
    conversationId: conversation._id, direction: 'out', text: 'x', at: s.h.m.now(), status: 'sent', manual: false });
  await runOnce(s);
  assert.equal(prepDrafts(s)[0].autoSkip, 'daily_cap');
  assertHasibRows(s.h.m);
});

test('the kill switch and the schedule: off stops every run; the sweep schedules due accounts only', async () => {
  const s = await studio();
  await bookedWithGaps(s);
  value(await s.manager('media_overview'));
  assert.equal(s.h.m.table('hasibAutomation')[0].enabled, true, 'opening Media puts the studio on the schedule');
  process.env.HASIB_AUTOMATION = 'off';
  try {
    assert.equal(await runOnce(s), 'off');
    assert.deepEqual(await automationSweep(s.h.m.ctx, null, s.h.m.now()), { scheduled: 0, off: true });
  } finally { delete process.env.HASIB_AUTOMATION; }
  assert.equal(autoMessages(s).length, 0);
  // With every rule off the studio stays on the schedule (Adiba still drafts offers), but nothing is sent by a rule.
  value(await s.manager('settings_update', { mediaSettings: { rules: ['prep_request', 'cut_approval', 'delivery_balance'].map(id => ({ id, enabled: false, mode: 'auto', offsetMinutes: 60 })) } }));
  assert.equal(s.h.m.table('hasibAutomation')[0].enabled, true);
  assert.match(await runOnce(s), /^sent:0 skipped:0/);
  assert.equal(autoMessages(s).length, 0);
  assertHasibRows(s.h.m);
});

test('automated actors may only run the operations their sector allows, and name themselves', () => {
  const actor = automationActor({ _id: 'w' }, 'a1', 'adiba');
  assert.equal(automationRefusal(actor, 'media_payment_record', new Set(['media_quote'])), 'automation_not_allowed');
  assert.equal(automationRefusal(actor, 'media_quote', new Set(['media_quote'])), null);
  assert.equal(automationRefusal({ role: 'manager' }, 'media_payment_record', new Set()), null, 'people are not affected');
  assert.equal(agentDetails(actor, 'x'), 'agent:adiba|x');
  assert.equal(agentDetails({ role: 'manager' }, 'x'), 'x');
  assert.throws(() => automationActor(null, 'a', 'stranger'));
});
