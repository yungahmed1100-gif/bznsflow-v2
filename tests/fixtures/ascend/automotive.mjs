// A synthetic workshop for tests: one tenant on the automotive pack with a WhatsApp conversation,
// a bay, a priced service and helpers that drive a work order through the real Hasib operations.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from '../../helpers/blue-tenant.mjs';
import { SECRET } from '../../helpers/convex-memory.mjs';
import { executeHasib } from '../../../convex/hasib/hasibState.js';
import { grantPlan } from '../../../convex/hasib/plans.js';
import { automationRun } from '../../../convex/hasib/automationRun.js';

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
export const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}, got ok`); assert.equal(r.reason, reason); };

export async function workshop({ name = 'w' } = {}) {
  const h = blueHarness();
  await h.enable();
  await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  const t = await seedTenant(h.m, { name, sector: 'Automotive', waba: '1234', phone: '5678', sender: '96890000000' });
  await h.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(h.m.ctx, { email: `${name}@example.com`, plan: 'ascend', packId: 'automotive' }, h.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, h.m.now());
  const manager = as(null);
  const team = value(await manager('team_invite', { email: `tech-${name}@example.com`, operationalRole: 'technician' }));
  const technicianId = await h.m.db.insert('accounts', { email: `tech-${name}@example.com`, role: 'customer', createdAt: h.m.now() });
  await h.m.db.patch(team.id, { accountId: technicianId, status: 'active', activatedAt: h.m.now() });
  const bay = value(await manager('automotive_bay_save', { requestId: randomUUID(), workflow: { name: 'Bay 1', availability: [] } }));
  const service = value(await manager('automotive_service_save', { requestId: randomUUID(), workflow: { name: 'Major service', category: 'maintenance', durationMinutes: 120, standardLaborMinutes: 120, priceMinor: 45000, checklist: ['Oil', 'Filters'] } }));
  const run = () => automationRun(h.m.ctx, { accountId: t.accountId, workerFunction: null, secret: SECRET }, h.m.now());
  return { h, t, manager, technician: as(technicianId), technicianId, bay, service, run };
}

let phoneSeq = 3000000;
/** A customer who wrote in on WhatsApp, with a vehicle and an open work order on the priced service. */
export async function job(w, { name = 'Salim', text = 'My car needs a service', promisedIn = 2 * DAY } = {}) {
  const from = `9689${phoneSeq++}`;
  await w.h.inbound(w.t, { from, text, profileName: name });
  const contact = (await w.h.dashboard('contacts', { sessionHash: w.t.sessionHash })).value.items.find(c => c.name === name);
  const vehicle = value(await w.manager('automotive_vehicle_save', { requestId: randomUUID(), workflow: { contactId: contact.id, plate: `${phoneSeq} A`, make: 'Toyota', model: 'Camry', year: 2022, powertrain: 'petrol', odometerKm: 40000 } }));
  const work = value(await w.manager('automotive_work_order_save', { requestId: randomUUID(), workflow: { vehicleId: vehicle.id, serviceId: w.service.id, bayId: w.bay.id, technicianAccountId: w.technicianId,
    concern: 'Scheduled service', promisedAt: w.h.m.now() + promisedIn, odometerKm: 40000 } }));
  return { from, contact, vehicle, work };
}

export const estimate = (w, work, lines) => w.manager('automotive_estimate_save', { requestId: randomUUID(), workOrderId: work.id, workflow: { lines } }).then(value);
export const workOrder = (w, id) => w.manager('automotive_work_order', { workOrderId: id }).then(value);
export const move = async (w, id, status) => value(await w.manager('automotive_work_order_status', { requestId: randomUUID(), workOrderId: id, version: (await workOrder(w, id)).version, status }));
