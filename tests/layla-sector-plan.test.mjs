import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERAL_SECTOR, laylaSectorFor, textRetention, TEXT_RETENTION_MS, CLINICAL_TEXT_RETENTION_MS } from '../convex/blueContacts.js';
import { convexMemory } from './helpers/convex-memory.mjs';

// Catalyst is the same for every business (Ahmed, 2026-10-17); only Ascend and Apex read the industry.
async function account(m, { plan, status = 'active', sector = 'Dental clinics' } = {}) {
  const email = `${plan || 'none'}-${status}@example.com`;
  const accountId = await m.db.insert('accounts', { email, role: 'customer', createdAt: m.now() });
  if (plan) await m.db.insert('blueAccessGrants', { email, plan, status, grantedAt: m.now(), grantedBy: 'ahmed@bznsflowai.com' });
  return { accountId, profile: { sector } };
}

test('Catalyst, no grant, a revoked grant and a browser draft all get the general pack', async () => {
  const m = convexMemory();
  for (const row of [await account(m, { plan: 'catalyst' }), await account(m), await account(m, { plan: 'ascend', status: 'revoked' }), { profile: { sector: 'Dental clinics' } }]) {
    assert.equal(await laylaSectorFor(m.ctx, row), GENERAL_SECTOR);
  }
});

test('Ascend and Apex keep the industry pack', async () => {
  const m = convexMemory();
  assert.equal(await laylaSectorFor(m.ctx, await account(m, { plan: 'ascend' })), 'dental');
  assert.equal(await laylaSectorFor(m.ctx, await account(m, { plan: 'apex', sector: 'Real estate' })), 'real-estate');
});

test('the 24-hour clinical text window applies only on the industry plans', async () => {
  const m = convexMemory();
  const catalyst = await account(m, { plan: 'catalyst' }), ascend = await account(m, { plan: 'ascend' });
  assert.equal(await textRetention(m.ctx, catalyst.accountId, catalyst), TEXT_RETENTION_MS);
  assert.equal(await textRetention(m.ctx, ascend.accountId, ascend), CLINICAL_TEXT_RETENTION_MS);
});
