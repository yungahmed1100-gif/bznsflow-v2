// HVAC at synthetic scale: the overview, Insights and the dispatch board stay bounded (and say when
// they are incomplete), and competing bookings for one technician's slot accept exactly one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { convexMemory } from './helpers/convex-memory.mjs';
import { executeHvac } from '../convex/hasib/hvacState.js';
import { hasibPack } from '../config/hasib-packs.js';

const DAY = 86400000, HOUR = 3600000;

test('hvac synthetic scale stays bounded and a contested technician slot accepts one booking', { timeout: 180000 }, async () => {
  const m = convexMemory(), accountId = 'hvac-load-account', now = m.now();
  const managerId = await m.db.insert('accounts', { email: 'load@example.com', role: 'customer', createdAt: now });
  const workspaceId = await m.db.insert('ascendWorkspaces', { managerAccountId: managerId, employeeLimit: 5, createdAt: now, updatedAt: now });
  const actor = { workspace: { _id: workspaceId, managerAccountId: managerId, employeeLimit: 5 }, role: 'manager', operationalRole: 'manager', actorAccountId: managerId };
  const tenant = { accountId, pack: hasibPack('hvac'), actor };
  const run = (operation, args = {}) => executeHvac(m.ctx, tenant, actor, { operation, ...args }, m.now());

  const contacts = [], units = [], jobs = [];
  for (let i = 0; i < 3000; i++) contacts.push(await m.db.insert('blueContacts', { accountId, state: 'active', createdAt: now - i, updatedAt: now - i }));
  for (let i = 0; i < 3000; i++) units.push(await m.db.insert('hvacUnits', { accountId, requestId: randomUUID(), contactId: contacts[i], label: `Unit ${i}`, unitType: 'split', version: 1, createdAt: now - i, updatedAt: now - i }));
  for (let i = 0; i < 500; i++) await m.db.insert('hvacContracts', { accountId, requestId: randomUUID(), number: i + 1, reference: `AMC-${i + 1}`, contactId: contacts[i], unitIds: [units[i]], visitsPerYear: 4,
    startsAt: now - 200 * DAY, endsAt: now + 165 * DAY, priceMinor: 40000, status: 'active', acceptedAt: now - 200 * DAY, history: [], version: 1, createdAt: now - 200 * DAY, updatedAt: now });
  for (let i = 0; i < 2500; i++) jobs.push(await m.db.insert('hvacJobs', { accountId, requestId: randomUUID(), number: i + 1, contactId: contacts[i % 3000], unitIds: [units[i % 3000]], jobType: 'repair', source: 'phone',
    urgent: i % 5 === 0, status: 'completed', requestedAt: now - 60 * DAY - i * 1000, scheduledAt: now - 60 * DAY, firstArrivedAt: now - 59 * DAY, completedAt: now - 58 * DAY, checklist: [], costs: [], history: [], version: 1, createdAt: now - 60 * DAY - i * 1000, updatedAt: now - 58 * DAY }));
  for (let i = 0; i < 2500; i++) await m.db.insert('hvacVisits', { accountId, requestId: randomUUID(), jobId: jobs[i], technicianAccountId: managerId, startsAt: now - 59 * DAY - i * 1000, endsAt: now - 59 * DAY + HOUR, status: 'done',
    jobStatusBefore: 'triaged', arrivedAt: now - 59 * DAY, version: 1, createdAt: now - 60 * DAY, updatedAt: now - 59 * DAY });

  let started = performance.now();
  const overview = await run('hvac_overview');
  assert.equal(overview.ok, true, overview.reason);
  assert.ok(performance.now() - started < 4000, `overview took ${(performance.now() - started).toFixed(0)}ms`);
  started = performance.now();
  const insights = await run('hvac_insights', { period: 'month' });
  assert.equal(insights.ok, true, insights.reason);
  assert.equal(insights.value.complete, false, 'a business past the read cap is told its figures are partial');
  assert.ok(performance.now() - started < 8000, `insights took ${(performance.now() - started).toFixed(0)}ms`);
  assert.equal(insights.value.contracts.active, 500);
  const board = await run('hvac_schedule', { fromAt: now, toAt: now + DAY });
  assert.equal(board.ok, true, board.reason);
  assert.ok(board.value.unscheduled.length <= 100, 'the unscheduled column is capped');

  // Competing bookings for the same technician and window, replayed in Convex's serial commit order.
  const open = [];
  for (let i = 0; i < 30; i++) open.push(await m.db.insert('hvacJobs', { accountId, requestId: randomUUID(), number: 9000 + i, contactId: contacts[i], unitIds: [], jobType: 'cleaning', source: 'phone',
    urgent: false, status: 'triaged', requestedAt: now, checklist: [], costs: [], history: [], version: 1, createdAt: now, updatedAt: now }));
  const slot = now + 4 * HOUR, attempts = [];
  for (const jobId of open) attempts.push(await run('hvac_visit_save', { requestId: randomUUID(), jobId, hvac: { technicianAccountId: managerId, startsAt: slot, endsAt: slot + 2 * HOUR } }));
  assert.equal(attempts.filter(r => r.ok).length, 1);
  assert.equal(attempts.filter(r => r.reason === 'technician_busy').length, 29);
});
