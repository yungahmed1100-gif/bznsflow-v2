// Synthetic AC service businesses for tests: a tenant on the hvac pack with a manager, a service
// advisor and a technician, three fixed-price services from Layla's catalog, and helpers that drive
// customers, units, jobs, visits, estimates and contracts through the real Hasib operations. Until
// the pack is live the harness runs as the founder preview; nothing reaches a provider.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from '../../helpers/blue-tenant.mjs';
import { SECRET } from '../../helpers/convex-memory.mjs';
import { executeHasib } from '../../../convex/hasib/hasibState.js';
import { grantPlan } from '../../../convex/hasib/plans.js';
import { isLivePack } from '../../../config/hasib-packs.js';
import { automationRun } from '../../../convex/hasib/automationRun.js';

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const CLOCK = Date.UTC(2026, 9, 12, 5, 0, 0); // 09:00 in Muscat
export const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
export const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}, got ok`); assert.equal(r.reason, reason); };

async function member(harness, manager, name, email, operationalRole) {
  const invite = value(await manager('team_invite', { email, operationalRole }));
  const accountId = await harness.m.db.insert('accounts', { email, role: 'customer', createdAt: harness.m.now() });
  await harness.m.db.patch(invite.id, { accountId, status: 'active', activatedAt: harness.m.now() });
  return accountId;
}

/** One AC business on the hvac pack: manager, advisor (desk), technician (tech) and three catalog services. */
export async function shop({ h = null, name = 'a', waba = '1234', phone = '5678', sender = '96890000000' } = {}) {
  const harness = h || blueHarness({ start: CLOCK });
  if (!h) {
    await harness.enable();
    await harness.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  }
  if (!isLivePack('hvac')) harness.m.ctx.hasibPreview = true;
  const t = await seedTenant(harness.m, { name, sector: 'Air conditioning', waba, phone, sender });
  await harness.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(harness.m.ctx, { email: `${name}@example.com`, plan: 'ascend' }, harness.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(harness.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, harness.m.now());
  const manager = as(null);
  value(await manager('settings_update', { packId: 'hvac' }));
  const deskId = await member(harness, manager, name, `desk-${name}@example.com`, 'service_advisor');
  const techId = await member(harness, manager, name, `tech-${name}@example.com`, 'technician');
  for (const [nameEn, nameAr, amount, type] of [['AC cleaning', 'تنظيف مكيف', 8, 'fixed'], ['Gas refill R410A', 'تعبئة غاز', 15, 'fixed'], ['Inspection visit', 'زيارة فحص', 5, 'fixed'], ['Compressor replacement', 'تبديل كمبروسر', null, 'quote']]) {
    await harness.m.db.insert('blueCatalogEntries', { ownerKey: String(t.accountId), entryKey: randomUUID(), kind: 'service', status: 'approved', nameEn, nameAr, category: 'AC services',
      benefitEn: '', benefitAr: '', descriptionEn: '', descriptionAr: '', availability: '',
      prices: type === 'quote' ? [{ type, currency: 'OMR', unit: 'job', label: 'On request' }] : [{ type, currency: 'OMR', amount, unit: 'unit', label: `${amount} OMR` }],
      source: 'owner', confidence: 1, laylaUseEn: '', laylaUseAr: '', revision: 1, sortOrder: 0, createdAt: harness.m.now(), updatedAt: harness.m.now() });
  }
  value(await manager('services_sync'));
  const items = value(await manager('items', { limit: 50 })).items;
  const service = nameEn => { const item = items.find(i => i.nameEn === nameEn); return item && { itemId: item.id, variantId: item.variants[0].id, priceMinor: item.variants[0].priceMinor, name: nameEn }; };
  const run = () => automationRun(harness.m.ctx, { accountId: t.accountId, workerFunction: null, secret: SECRET }, harness.m.now());
  return { h: harness, t, manager, desk: as(deskId), tech: as(techId), deskId, techId, managerId: String(t.accountId), run,
    cleaning: service('AC cleaning'), gas: service('Gas refill R410A'), inspection: service('Inspection visit') };
}

let phoneSeq = 5000000;
/** A customer who wrote in on WhatsApp, as Customers lists them. */
export async function customer(c, name, text = 'Hello') {
  const from = `9689${phoneSeq++}`;
  await c.h.inbound(c.t, { from, text, profileName: name });
  return { ...(await c.h.dashboard('contacts', { sessionHash: c.t.sessionHash })).value.items.find(x => x.name === name), from };
}

export const unit = (c, run, contactId, hvac = {}) => run('hvac_unit_save', { requestId: randomUUID(), contactId, hvac: { label: 'Living room split', unitType: 'split', ...hvac } });
export const job = (c, run, contactId, hvac = {}) => run('hvac_job_save', { requestId: randomUUID(), contactId, hvac });
export const jobRow = (c, id) => c.h.m.table('hvacJobs').find(j => j._id === id);
export const visitRow = (c, id) => c.h.m.table('hvacVisits').find(v => v._id === id);
export const estimateRow = (c, id) => c.h.m.table('hvacEstimates').find(e => e._id === id);
export const contractRow = (c, id) => c.h.m.table('hvacContracts').find(x => x._id === id);
export const move = (c, run, id, status, extra = {}) => run('hvac_job_status', { jobId: id, version: jobRow(c, id).version, status, ...extra });
/** Books a visit window for the technician, starting `inMs` from now and lasting two hours. */
export const book = (c, run, jobId, inMs = HOUR, technicianAccountId = c.techId, hours = 2) => {
  const startsAt = c.h.m.now() + inMs;
  return run('hvac_visit_save', { requestId: randomUUID(), jobId, hvac: { technicianAccountId, startsAt, endsAt: startsAt + hours * HOUR } });
};
export const visitMove = (c, run, id, status, extra = {}) => run('hvac_visit_status', { visitId: id, version: visitRow(c, id).version, status, ...extra });
/** A one-line estimate from a catalog service. */
export const estimate = (c, run, jobId, service, qty = 1) => run('hvac_estimate_save', { requestId: randomUUID(), jobId,
  hvac: { lines: [{ kind: 'service', name: service.name, variantId: service.variantId, qty, unitPriceMinor: service.priceMinor }] } });
export const issue = (c, run, id) => run('hvac_estimate_status', { estimateId: id, version: estimateRow(c, id).version, status: 'issued' });
export const approve = (c, run, jobId, estimateId, evidenceSource = 'in_person') => run('hvac_approval_record', { jobId, version: jobRow(c, jobId).version, estimateId, approvedBy: 'Customer', evidenceSource });
export const checklist = (c, run, jobId, results = ['pass', 'pass']) => run('hvac_checklist_save', { jobId, version: jobRow(c, jobId).version,
  hvac: { checklist: results.map((result, i) => ({ text: ['Pressure within range', 'Cooling at the vent'][i] || `Check ${i + 1}`, result })), findings: 'Recorded by technician' } });
export const metric = (insights, id) => [...insights.headline, ...insights.diagnostics].find(m => m.id === id);

/** A job taken from request to completed with one on-time visit, the given service approved in person. */
export async function completeJob(c, contactId, { service = c.gas, unitIds = [], arriveLateMs = 0 } = {}) {
  const j = value(await job(c, c.desk, contactId, { jobType: 'gas_refill', unitIds }));
  const e = value(await estimate(c, c.manager, j.id, service));
  value(await issue(c, c.manager, e.id));
  value(await approve(c, c.desk, j.id, e.id));
  const v = value(await book(c, c.desk, j.id, HOUR));
  c.h.m.advance(HOUR + arriveLateMs);
  value(await visitMove(c, c.tech, v.id, 'arrived'));
  value(await move(c, c.tech, j.id, 'repairing'));
  value(await checklist(c, c.tech, j.id));
  value(await move(c, c.tech, j.id, 'tested'));
  value(await move(c, c.tech, j.id, 'completed'));
  return { job: jobRow(c, j.id), visit: visitRow(c, v.id), estimate: estimateRow(c, e.id) };
}
export { randomUUID };
