import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { answer, reviewProfile } from '../api/_lib/layla/domain.js';
import { validateReviewProfile } from '../api/_lib/layla/review-profile.js';
import { messagingReady } from '../convex/blueMessagingState.js';

const bundle = await build({ entryPoints: [fileURLToPath(new URL('../convex/blueDashboard.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' });
const { execute } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const entry = (h, tenant, operation, args = {}) => execute._handler(h.m.ctx, { operation, sessionHash: tenant.sessionHash, actorAccountId: tenant.accountId, ...args });

test('inbox handoffs require no external staff address and preserve legacy contact without advertising it', () => {
  const facts = { sector: 'Retail', services: 'Clothes', prices: '', hours: '', location: '', humanContact: '', handoffMode: 'inbox', reviewed: true };
  assert.equal(reviewProfile(facts).handoffMode, 'inbox');
  assert.equal(validateReviewProfile(facts).handoffMode, 'inbox');
  assert.equal(messagingReady({ accountId: 'owner', expiresAt: 100, status: 'connected', profile: facts }, 1), true);
  for (const question of ['I want to speak to a human', 'أريد التحدث مع موظف']) {
    const result = answer(question, { ...facts, humanContact: 'legacy@example.test' }, true);
    assert.ok(!result.text.includes('legacy@example.test'), 'inbox mode never advertises a legacy contact');
  }
});

test('asking for a person is answered by Layla; the owner switch still pauses a chat, and resolving never restarts cancelled automation', async () => {
  const h = blueHarness(); await h.enable();
  const tenant = await seedTenant(h.m);
  await h.messaging('activate', { sessionHash: tenant.sessionHash });
  await h.inbound(tenant, { text: 'I want a villa', from: '96891111111' });
  await h.inbound(tenant, { text: 'Please let me speak to a person', intent: 'human', handoff: true, from: '96891111111' });
  // Layla is the whole front office: she answers with the team contact and stays on the chat.
  assert.equal((await entry(h, tenant, 'handoffs')).value.items.length, 0, 'nothing waits in a queue');
  assert.equal(h.m.table('blueConversations')[0].takeover, false);
  // The owner's own switch (Stop Layla) still pauses that one chat.
  const [chat] = (await entry(h, tenant, 'conversations')).value.items;
  const stopped = await entry(h, tenant, 'takeover_handoff', { conversationId: chat.id, expectedVersion: chat.handoff?.version || 0 });
  assert.equal(stopped.ok, true, JSON.stringify(stopped));
  let queue = await entry(h, tenant, 'handoffs');
  assert.equal(queue.ok, true); assert.equal(queue.value.items.length, 1);
  const item = queue.value.items[0];
  assert.equal(item.handoff.reason, 'team_takeover');
  assert.equal(item.lastCustomerMessage.text, 'Please let me speak to a person');
  assert.ok(Array.isArray(item.contact.fields));
  // Long staff activity must not hide the retained customer message from the queue.
  for (let i = 0; i < 55; i++) await h.m.db.insert('blueMessages', { conversationId: item.id, accountId: tenant.accountId, integrationId: tenant.integration.id, direction: 'out', text: 'Staff reply', textExpiresAt: 1e15, at: h.m.now() + i + 1, status: 'sent' });
  assert.equal((await entry(h, tenant, 'handoffs')).value.items[0].lastCustomerMessage.text, 'Please let me speak to a person');
  const conversationId = item.id;
  assert.equal(stopped.value.handoff.state, 'handling');
  const args = { conversationId, expectedVersion: stopped.value.handoff.version };
  assert.equal((await entry(h, tenant, 'resolve_handoff', args)).ok, true);
  assert.equal((await entry(h, tenant, 'resolve_handoff', args)).ok, true);
  assert.equal(h.m.table('blueHandoffAudit').filter(x => x.action === 'resolve').length, 1);
  assert.equal(h.m.table('blueConversations')[0].takeover, true);
  assert.equal((await entry(h, tenant, 'handoffs')).value.items.length, 0);
  assert.equal((await entry(h, tenant, 'return_handoff', args)).reason, 'handoff_changed');
  const resolvedVersion = h.m.table('blueConversations')[0].version;
  assert.equal((await entry(h, tenant, 'return_handoff', { ...args, expectedVersion: resolvedVersion })).ok, true);
  assert.equal(h.m.table('blueConversations')[0].takeover, false);
  assert.equal(h.m.table('blueMessages').filter(x => x.direction === 'out' && x.status === 'queued').length, 0);
  // A stale team member cannot resolve after somebody has returned the thread.
  assert.equal((await entry(h, tenant, 'resolve_handoff', args)).reason, 'handoff_changed');
  await h.inbound(tenant, { text: 'What are your hours?', intent: 'hours' });
  assert.equal(h.m.table('blueMessages').filter(x => x.direction === 'out' && x.status === 'queued').length, 1);
});

test('handoff entry rejects foreign actor, record, revoked grant, expired session and opt-out resume', async () => {
  const h = blueHarness(); await h.enable();
  const a = await seedTenant(h.m), b = await seedTenant(h.m, { name: 'b', phone: '6789' });
  await h.messaging('activate', { sessionHash: a.sessionHash });
  await h.inbound(a, { intent: 'human', handoff: true });
  const person = h.m.table('blueConversations')[0], args = { conversationId: person._id, expectedVersion: person.version };
  assert.equal((await entry(h, b, 'resolve_handoff', args)).reason, 'conversation_not_found');
  assert.equal((await entry(h, a, 'resolve_handoff', { ...args, actorAccountId: b.accountId })).reason, 'workspace_access_revoked');
  await h.m.db.patch(person._id, { optout: true });
  assert.equal((await entry(h, a, 'return_handoff', args)).reason, 'contact_opted_out');
  const grant = h.m.table('blueAccessGrants').find(x => x.email === 'a@example.com');
  await h.m.db.patch(grant._id, { status: 'revoked' });
  assert.equal((await entry(h, a, 'handoffs')).reason, 'access_required');
  await h.m.db.patch(grant._id, { status: 'active' });
  await h.m.db.patch(a.rowId, { expiresAt: 1 });
  assert.equal((await entry(h, a, 'handoffs')).reason, 'sign_in_required');
});
