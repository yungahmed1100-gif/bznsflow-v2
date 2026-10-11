// Synthetic gyms for tests: two tenants on the live fitness pack, a manager and a front-desk coach,
// and helpers that drive plans, classes, seats, check-ins and memberships through the real Hasib
// operations. The clock is the B15 fixture clock; nothing reaches a provider.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from '../../helpers/blue-tenant.mjs';
import { SECRET } from '../../helpers/convex-memory.mjs';
import { executeHasib } from '../../../convex/hasib/hasibState.js';
import { grantPlan } from '../../../convex/hasib/plans.js';

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const CLOCK = Date.UTC(2026, 9, 12, 5, 0, 0);
export const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
export const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}, got ok`); assert.equal(r.reason, reason); };

/** One gym tenant on the fitness pack, with a manager runner and a coach (employee). Fitness is live: no preview harness. */
export async function gym({ h = null, name = 'a', waba = '1234', phone = '5678', sender = '96890000000' } = {}) {
  const harness = h || blueHarness({ start: CLOCK });
  if (!h) {
    await harness.enable();
    await harness.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  }
  const t = await seedTenant(harness.m, { name, sector: 'Fitness & wellness', waba, phone, sender });
  await harness.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(harness.m.ctx, { email: `${name}@example.com`, plan: 'ascend', packId: 'fitness' }, harness.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(harness.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, harness.m.now());
  const manager = as(null);
  value(await manager('settings_update', { packId: 'fitness' }));
  const team = value(await manager('team_invite', { email: `coach-${name}@example.com` }));
  const coachId = await harness.m.db.insert('accounts', { email: `coach-${name}@example.com`, role: 'customer', createdAt: harness.m.now() });
  await harness.m.db.patch(team.id, { accountId: coachId, status: 'active', activatedAt: harness.m.now() });
  return { h: harness, t, manager, coach: as(coachId), coachId };
}

let phoneSeq = 3000000;
/** A customer who wrote in on WhatsApp, as Customers lists them. */
export async function customer(g, name, text = 'I want to join the gym') {
  await g.h.inbound(g.t, { from: `9689${phoneSeq++}`, text, profileName: name });
  return (await g.h.dashboard('contacts', { sessionHash: g.t.sessionHash })).value.items.find(c => c.name === name);
}

export const plan = (run, fitness) => run('fitness_plan_save', { requestId: randomUUID(), fitness: { name: 'Monthly', kind: 'membership', termDays: 30, billingMonths: 1, priceMinor: 30000, freezeMaxDays: 14, graceDays: 7, ...fitness } }).then(value);
export const klass = (run, startsAt, fitness = {}) => run('fitness_class_save', { requestId: randomUUID(), fitness: { title: 'HIIT', classType: 'hiit', startsAt, endsAt: startsAt + HOUR, capacity: 10, ...fitness } }).then(value);
export const book = (run, c, contactId, fitness = {}) => run('fitness_seat_book', { requestId: randomUUID(), classId: c.id, contactId, fitness });
export const checkin = (run, seatId, fitness = {}) => run('fitness_checkin', { seatId, fitness });

/** Adds a membership on a plan and pays it in full, so it starts. */
export async function join(run, contactId, p) {
  const m = value(await run('fitness_membership_save', { requestId: randomUUID(), contactId, planId: p.id }));
  if (p.priceMinor === 0) return m;
  return value(await run('fitness_payment_record', { requestId: randomUUID(), membershipId: m.id, amountMinor: p.priceMinor, method: 'cash' }));
}

export const member = (run, contactId) => run('fitness_member', { contactId }).then(value);
export const metric = (insights, id) => [...insights.headline, ...insights.diagnostics].find(m => m.id === id);
export { randomUUID };
