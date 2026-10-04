import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { blueHarness, seedTenant } from './helpers/blue-tenant.mjs';
import { createStrings } from '../src/lib/dashboard/strings.js';

// Exercise the deployed Convex wrapper, including its grant and role gates.
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../convex/blueDashboard.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' });
const { execute } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('Convex dashboard entry admits Catalyst chats but keeps paid operations and revoked access gated', async () => {
  const h = blueHarness();
  await h.enable();
  const a = await seedTenant(h.m, { plan: 'catalyst' });
  const call = operation => execute._handler(h.m.ctx, { operation, sessionHash: a.sessionHash, actorAccountId: a.accountId });
  for (const operation of ['overview', 'conversations', 'contacts']) assert.equal((await call(operation)).ok, true, operation);
  for (const operation of ['export_account', 'import_contacts', 'campaigns']) assert.equal((await call(operation)).reason, 'plan_required', operation);
  const outsider = await seedTenant(h.m, { name: 'b', plan: 'ascend' });
  assert.equal((await execute._handler(h.m.ctx, { operation: 'overview', sessionHash: a.sessionHash, actorAccountId: outsider.accountId })).reason, 'workspace_access_revoked');
  const grant = h.m.table('blueAccessGrants')[0];
  await h.m.db.patch(grant._id, { status: 'revoked' });
  assert.equal((await call('overview')).reason, 'access_required');
  await h.m.db.patch(grant._id, { status: 'active', plan: 'ascend' });
  assert.equal((await call('overview')).ok, true);
});

test('missing product access has specific bilingual guidance', () => {
  for (const lang of ['en', 'ar']) assert.notEqual(createStrings(lang).reason('access_required'), createStrings(lang).reason('unknown_error'));
});
