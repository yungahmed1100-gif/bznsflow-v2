// Synthetic dental clinics for tests: two tenants on the live dental pack, a manager and a
// receptionist, and helpers that drive providers, chairs, treatments, visits, charges and recalls
// through the real Hasib operations. The clock is the B06 fixture clock; nothing reaches a provider.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from '../../helpers/blue-tenant.mjs';
import { SECRET } from '../../helpers/convex-memory.mjs';
import { executeHasib } from '../../../convex/hasib/hasibState.js';
import { grantPlan } from '../../../convex/hasib/plans.js';

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const CLOCK = Date.UTC(2026, 9, 12, 5, 0, 0); // 09:00 in Muscat
export const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
export const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}, got ok`); assert.equal(r.reason, reason); };

/** One clinic on the dental pack with a manager runner, a receptionist (employee), a provider, a chair and two treatments. */
export async function clinic({ h = null, name = 'a', waba = '1234', phone = '5678', sender = '96890000000' } = {}) {
  const harness = h || blueHarness({ start: CLOCK });
  if (!h) {
    await harness.enable();
    await harness.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  }
  const t = await seedTenant(harness.m, { name, sector: 'Dental clinics', waba, phone, sender });
  await harness.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(harness.m.ctx, { email: `${name}@example.com`, plan: 'ascend', packId: 'dental' }, harness.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(harness.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, harness.m.now());
  const manager = as(null);
  value(await manager('settings_update', { packId: 'dental' }));
  const team = value(await manager('team_invite', { email: `desk-${name}@example.com` }));
  const deskId = await harness.m.db.insert('accounts', { email: `desk-${name}@example.com`, role: 'customer', createdAt: harness.m.now() });
  await harness.m.db.patch(team.id, { accountId: deskId, status: 'active', activatedAt: harness.m.now() });
  const provider = value(await manager('dental_resource_save', { requestId: randomUUID(), dental: { kind: 'provider', name: 'Dr Salma' } }));
  const chair = value(await manager('dental_resource_save', { requestId: randomUUID(), dental: { kind: 'chair', name: 'Chair 1' } }));
  for (const [nameEn, nameAr, category, amount] of [['Check-up', 'فحص', 'Examinations', 10], ['Scaling', 'تنظيف', 'Cleaning', 20]]) {
    await harness.m.db.insert('blueCatalogEntries', { ownerKey: String(t.accountId), entryKey: randomUUID(), kind: 'service', status: 'approved', nameEn, nameAr, category,
      benefitEn: '', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: '', prices: [{ type: 'fixed', currency: 'OMR', amount, unit: 'visit', label: `${amount} OMR` }],
      source: 'owner', confidence: 1, laylaUseEn: '', laylaUseAr: '', revision: 1, sortOrder: 0, createdAt: harness.m.now(), updatedAt: harness.m.now() });
  }
  value(await manager('services_sync'));
  const items = value(await manager('items', { limit: 50 })).items;
  const treatment = nameEn => items.find(i => i.nameEn === nameEn);
  return { h: harness, t, manager, desk: as(deskId), deskId, provider, chair, checkup: treatment('Check-up'), scaling: treatment('Scaling') };
}

let phoneSeq = 4000000;
/** A patient who wrote in on WhatsApp, as Customers lists them. */
export async function patient(c, name, text = 'Hello') {
  await c.h.inbound(c.t, { from: `9689${phoneSeq++}`, text, profileName: name });
  return (await c.h.dashboard('contacts', { sessionHash: c.t.sessionHash })).value.items.find(x => x.name === name);
}

/** Books a visit with the clinic's provider (and chair unless told otherwise). */
export const book = (c, run, contactId, startsAt, dental = {}) => run('dental_visit_book', { requestId: randomUUID(), contactId,
  dental: { providerId: c.provider.id, chairId: c.chair.id, serviceItemId: c.checkup.id, startsAt, ...dental } });
export const visitRow = (c, id) => c.h.m.table('dentalVisits').find(v => v._id === id);
export const status = (c, run, id, to, extra = {}) => run('dental_visit_status', { visitId: id, version: visitRow(c, id).version, status: to, ...extra });
export const record = (run, visitId) => run('dental_visit', { visitId }).then(value);
export const metric = (insights, id) => [...insights.headline, ...insights.diagnostics].find(m => m.id === id);
export { randomUUID };
