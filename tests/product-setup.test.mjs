import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { convexMemory } from './helpers/convex-memory.mjs';
import { executeReview } from '../convex/reviewState.js';
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../convex/productSetup.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' });
const { execute } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
async function fixture({ plan = 'ascend', email = 'owner@example.com', employee = false } = {}) {
  const m = convexMemory({ start: Date.now() });
  const accountId = await m.db.insert('accounts', { email });
  const sessionHash = 'a'.repeat(64);
  const sessionId = await m.db.insert('sessions', { tokenHash: sessionHash, accountId, expiresAt: Date.now() + 60000 });
  if (plan) await m.db.insert('blueAccessGrants', { email, plan, status: 'active' });
  if (employee) await m.db.insert('ascendWorkspaceMembers', { accountId, status: 'active', workspaceId: 'other' });
  const call = (operation = 'get', args = {}) => execute._handler(m.ctx, { operation, product: 'ascend', sessionHash, ...args });
  const save = (args = {}) => call('save', { step: 1, version: 0, requestId: 'request_0001', draftHash: 'b'.repeat(64), packId: 'retail', ...args });
  return { m, accountId, sessionId, call, save };
}
test('actual Convex setup entry enforces grants, manager status, and session expiry', async () => {
  for (const [options, reason] of [[{ plan: null }, 'access_required'], [{ plan: 'catalyst' }, 'access_required'], [{ employee: true }, 'manager_required']]) {
    const f = await fixture(options); assert.equal((await f.save()).reason, reason); assert.equal(f.m.table('hasibSettings').length, 0);
  }
  const f = await fixture(); await f.m.db.patch(f.sessionId, { expiresAt: 1 }); assert.equal((await f.call()).reason, 'sign_in_required');
  const admin = await fixture({ plan: null, email: 'ahmed@bznsflowai.com' }); assert.equal((await admin.call()).ok, true); assert.equal((await admin.call('get', { product: 'catalyst' })).ok, true);
  const catalyst = await fixture({ plan: 'catalyst' }); assert.equal((await catalyst.call('get', { product: 'catalyst' })).ok, true);
});
test('Ascend saves without chatbot configuration; independent progress survives resume', async () => {
  const f = await fixture(); assert.equal((await f.save()).ok, true);
  const draft = f.m.table('blueReviewSessions')[0]; assert.equal(draft.profile, undefined); assert.equal(draft.integration, undefined);
  assert.equal((await f.call()).value.progress.step, 1);
  assert.equal((await f.call('get', { product: 'catalyst' })).value.progress.version, 0);
  assert.equal((await f.save({ product: 'catalyst', packId: undefined, step: 2 })).ok, true);
  assert.equal((await f.call()).value.progress.step, 1);
});
test('duplicate submission does not repeat audit, changed payload and stale writers conflict', async () => {
  const f = await fixture(); await f.save(); assert.equal((await f.save()).ok, true);
  assert.equal(f.m.table('productSetupAudit').length, 1);
  assert.equal((await f.save({ packId: 'automotive' })).reason, 'setup_conflict');
  assert.equal((await f.save({ requestId: 'request_0002' })).reason, 'setup_conflict');
  assert.equal(f.m.table('hasibSettings')[0].packId, 'retail');
});
test('invalid draft and unreleased sector cannot partially write settings', async () => {
  const f = await fixture(); assert.equal((await f.save({ draftHash: 'bad' })).reason, 'invalid_state'); assert.equal(f.m.table('hasibSettings').length, 0);
  assert.equal((await f.save({ packId: 'fitness' })).reason, 'pack_not_live'); assert.equal(f.m.table('productSetupProgress').length, 0);
});
test('session identity cannot read foreign progress and revoked grants are immediate', async () => {
  const f = await fixture(); await f.save(); const other = await f.m.db.insert('accounts', { email: 'other@example.com' });
  await f.m.db.insert('sessions', { tokenHash: 'c'.repeat(64), accountId: other, expiresAt: Date.now() + 60000 });
  await f.m.db.insert('blueAccessGrants', { email: 'other@example.com', plan: 'ascend', status: 'active' });
  assert.equal((await f.call('get', { sessionHash: 'c'.repeat(64) })).value.progress.version, 0);
  await f.m.db.patch(f.m.table('blueAccessGrants')[0]._id, { status: 'revoked' }); assert.equal((await f.call()).reason, 'access_required');
});
test('saving Catalyst business facts preserves explicit Ascend sector and settings', async () => {
  const f = await fixture(); await f.save(); const draft = f.m.table('blueReviewSessions')[0];
  const result = await executeReview(f.m.ctx, { operation: 'profile', sessionHash: draft.sessionHash, profile: { reviewed: true, businessName: 'Store', sector: 'Technology', services: 'Phones', prices: '', hours: '', location: '', humanContact: '' } });
  assert.equal(result.ok, true); assert.equal(f.m.table('hasibSettings')[0].packId, 'retail');
});
