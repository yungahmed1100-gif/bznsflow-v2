import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { executeInstagram } from '../convex/blueInstagramState.js';
import { resetAccount, resetMessages } from '../convex/blueResetState.js';
import { executeBlueAuth } from '../convex/blueAuthState.js';

async function populated() {
  const h = blueHarness(); await h.enable();
  const a = await seedTenant(h.m, { name: 'a' });
  const b = await seedTenant(h.m, { name: 'b', phone: '999', waba: '888' });
  const ig = (operation, args = {}) => executeInstagram(h.m.ctx, { operation, sessionHash: a.sessionHash, ...args }, h.m.now());
  const integration = { id: randomUUID(), channel: 'instagram', app: '123456', igAccount: '17841400000000001', username: 'bznsflow', credential: { v: 1, iv: 't', data: 't', tag: 't' } };
  await ig('begin', { stateHash: 'c'.repeat(64), lang: 'en' });
  await ig('consume', { stateHash: 'c'.repeat(64) });
  await ig('connect', { stateHash: 'c'.repeat(64), integration, tokenExpiresAt: h.m.now() + 86400000 });
  await h.messaging('activate', { sessionHash: a.sessionHash });
  await h.inbound(a, { from: '96891111111', text: 'hi' });
  await h.inbound(b, { from: '96892222222', text: 'hello' });
  await h.m.db.insert('blueAssetClaims', { phone: a.integration.phone, waba: a.integration.waba, sessionHash: a.sessionHash, createdAt: h.m.now() });
  await h.m.db.insert('blueBusinessSettings', { accountId: a.accountId, timezone: 'Asia/Muscat' });
  return { h, a, b };
}
const email = 'a@example.com';
const ownRows = (h, a) => ['blueInstagramConnections', 'blueMessagingControls', 'blueConversations', 'blueMessages', 'blueContacts', 'blueBusinessSettings']
  .reduce((n, t) => n + h.m.table(t).filter(r => r.accountId === a.accountId).length, 0)
  + h.m.table('blueReviewSessions').filter(r => r.sessionHash === a.sessionHash).length
  + h.m.table('blueAssetClaims').filter(r => r.sessionHash === a.sessionHash).length
  + h.m.table('blueInstagramAttempts').filter(r => r.sessionHash === a.sessionHash).length;

test('reset needs explicit confirmation and a dry run changes nothing', async () => {
  const { h, a } = await populated();
  assert.equal((await resetAccount(h.m.ctx, { email })).ok, false);
  const before = ownRows(h, a);
  const dry = await resetAccount(h.m.ctx, { email, dryRun: true });
  assert.equal(dry.ok, true); assert.equal(dry.value.dryRun, true);
  assert(dry.value.counts.blueMessages > 0 && dry.value.counts.blueInstagramConnections === 1 && dry.value.counts.blueReviewSessions === 1);
  assert.equal(ownRows(h, a), before, 'dry run writes nothing');
});

test('reset removes every connection, answer and chat for one account only', async () => {
  const { h, a, b } = await populated();
  const bBefore = h.m.table('blueMessages').filter(r => r.accountId === b.accountId).length;
  const result = await resetAccount(h.m.ctx, { email, confirm: true });
  assert.equal(result.ok, true); assert.equal(result.value.done, true);
  assert.equal(ownRows(h, a), 0);
  const account = h.m.table('accounts').find(r => r._id === a.accountId);
  assert.equal(account.draftHash, undefined, 'the login stays, the saved setup is released');
  assert.equal(h.m.table('blueMessages').filter(r => r.accountId === b.accountId).length, bBefore, 'other accounts untouched');
  assert(h.m.table('blueReviewSessions').some(r => r.sessionHash === b.sessionHash));
});

test('after a reset the signed-in owner can claim a brand-new setup', async () => {
  const { h, a } = await populated();
  await resetAccount(h.m.ctx, { email, confirm: true });
  const tokenHash = 'e'.repeat(64), fresh = 'f'.repeat(64), newHash = '1'.repeat(64);
  await h.m.db.insert('sessions', { tokenHash, accountId: a.accountId, expiresAt: 1e15, createdAt: h.m.now() });
  await h.m.db.insert('blueReviewSessions', { sessionHash: fresh, expiresAt: h.m.now() + 86400000, status: 'business_saved', profile: { businessName: 'BznsFlow', sector: 'Technology & software', services: 'Layla', prices: '', hours: '', location: '', humanContact: 'team@example.com', reviewed: true }, profileVersion: 1, lastPreview: { question: 'q', text: 't', sourceFields: [], needsHuman: false, intent: 'services' }, createdAt: h.m.now(), updatedAt: h.m.now(), attempts: 0 });
  const claimed = await executeBlueAuth(h.m.ctx, { operation: 'claim_draft', tokenHash, sessionHash: fresh, draftHash: newHash }, h.m.now());
  assert.deepEqual(claimed, { ok: true, value: { draftHash: newHash } });
});

test('reset refuses while a reply is being sent', async () => {
  const { h, a } = await populated();
  const job = h.m.table('blueMessages').find(m => m.accountId === a.accountId && m.direction === 'out');
  await h.m.db.patch(job._id, { status: 'attempting' });
  assert.deepEqual(await resetAccount(h.m.ctx, { email, confirm: true }), { ok: false, reason: 'send_in_progress' });
});

// 2026-10-25: Basma Muscat Dental Clinic moved to Dental with its chats cleared and everything else kept.
test('a messages reset clears chats and chat contacts for one account and keeps its setup, connection, catalog and settings', async () => {
  const { h, a, b } = await populated();
  const conversation = h.m.table('blueConversations').find(r => r.accountId === a.accountId);
  await h.m.db.insert('blueHandoffAudit', { accountId: a.accountId, conversationId: conversation._id, actorAccountId: String(a.accountId), action: 'takeover', at: h.m.now(), version: 1 });
  await h.m.db.insert('blueCatalogEntries', { ownerKey: String(a.accountId), status: 'approved', nameEn: 'Cleaning', nameAr: 'تنظيف' });
  const chats = t => h.m.table(t).filter(r => r.accountId === a.accountId).length;
  const kept = () => [h.m.table('blueReviewSessions').filter(r => r.sessionHash === a.sessionHash).length, chats('blueMessagingControls'), chats('blueBusinessSettings'),
    h.m.table('blueAssetClaims').filter(r => r.sessionHash === a.sessionHash).length, chats('blueInstagramConnections'), h.m.table('blueCatalogEntries').filter(r => r.ownerKey === String(a.accountId)).length];
  const before = kept(), bMessages = h.m.table('blueMessages').filter(r => r.accountId === b.accountId).length;
  assert.equal((await resetMessages(h.m.ctx, { email })).reason, 'confirmation_required');
  const dry = await resetMessages(h.m.ctx, { email, dryRun: true });
  assert.ok(dry.value.counts.blueMessages > 0 && dry.value.counts.blueConversations === 1 && dry.value.counts.blueContacts === 1 && dry.value.counts.blueHandoffAudit === 1);
  assert.ok(chats('blueMessages') > 0, 'a dry run deletes nothing');
  const result = await resetMessages(h.m.ctx, { email, confirm: true });
  assert.deepEqual([result.ok, result.value.done], [true, true]);
  assert.deepEqual(['blueMessages', 'blueConversations', 'blueContacts', 'blueHandoffAudit'].map(chats), [0, 0, 0, 0]);
  assert.deepEqual(kept(), before, 'setup, control, settings, claim, Instagram and catalog stay');
  assert.ok(before.every(n => n > 0), 'the kept rows were really there');
  assert.equal(h.m.table('accounts').find(r => r._id === a.accountId).draftHash, a.sessionHash, 'the saved setup stays attached');
  assert.equal(h.m.table('blueMessages').filter(r => r.accountId === b.accountId).length, bMessages, 'other accounts untouched');
});

test('a messages reset refuses while a reply is being sent', async () => {
  const { h, a } = await populated();
  const job = h.m.table('blueMessages').find(m => m.accountId === a.accountId && m.direction === 'out');
  await h.m.db.patch(job._id, { status: 'attempting' });
  assert.deepEqual(await resetMessages(h.m.ctx, { email, confirm: true }), { ok: false, reason: 'send_in_progress' });
});
