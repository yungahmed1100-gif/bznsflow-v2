// Synthetic Media & production studios for tests: two tenants, a manager, an assigned producer,
// resources and helpers that drive productions through the real Hasib operations.
// Media is not a live pack, so the studios run under the synthetic preview harness only.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from '../../helpers/blue-tenant.mjs';
import { SECRET } from '../../helpers/convex-memory.mjs';
import { executeHasib } from '../../../convex/hasib/hasibState.js';
import { grantPlan } from '../../../convex/hasib/plans.js';

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const value = r => { assert.equal(r?.ok, true, r?.reason); return r.value; };
export const refused = (r, reason) => { assert.equal(r?.ok, false, `expected ${reason}, got ok`); assert.equal(r.reason, reason); };

/** One studio tenant on the media pack, with a manager runner and (optionally) a producer. */
export async function studio({ h = null, name = 'a', waba = '1234', phone = '5678', sender = '96890000000' } = {}) {
  const harness = h || blueHarness();
  if (!h) {
    await harness.enable();
    await harness.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
    harness.m.ctx.hasibPreview = true;
  }
  const t = await seedTenant(harness.m, { name, sector: 'Media & production', waba, phone, sender });
  await harness.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(harness.m.ctx, { email: `${name}@example.com`, plan: 'ascend', packId: 'retail' }, harness.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(harness.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, harness.m.now());
  const manager = as(null);
  value(await manager('settings_update', { packId: 'media' }));
  const team = value(await manager('team_invite', { email: `producer-${name}@example.com` }));
  const producerId = await harness.m.db.insert('accounts', { email: `producer-${name}@example.com`, role: 'customer', createdAt: harness.m.now() });
  await harness.m.db.patch(team.id, { accountId: producerId, status: 'active', activatedAt: harness.m.now() });
  return { h: harness, t, manager, producer: as(producerId), producerId };
}

let phoneSeq = 2000000;
/** A customer who wrote in on WhatsApp, as Customers lists them. */
export async function customer(s, name, text = 'We need a brand film') {
  await s.h.inbound(s.t, { from: `9689${phoneSeq++}`, text, profileName: name });
  return (await s.h.dashboard('contacts', { sessionHash: s.t.sessionHash })).value.items.find(c => c.name === name);
}

export const resource = (run, name, category) => run('media_resource_save', { requestId: randomUUID(), media: { name, category, active: true } }).then(value);

/** A complete brief ready to quote. */
export const brief = (run, contactId, extra = {}, now) => run('media_production_save', { requestId: randomUUID(), media: {
  contactId, title: 'Brand film', productionType: 'video', deliverables: [{ format: 'video', quantity: 1, language: 'ar', durationSeconds: 90 }],
  shootStartsAt: now + 2 * HOUR, shootEndsAt: now + 6 * HOUR, location: 'Studio 1, Al Khuwair', deliveryDueAt: now + 3 * DAY, revisionAllowance: 2, ...extra } });

/** Quote → presented → accepted → deposit paid. Returns the production card. */
export async function accepted(run, p, quoteMinor = 100000) {
  p = value(await run('media_quote', { productionId: p.id, version: p.version, media: { quoteMinor } }));
  p = value(await run('media_production_status', { productionId: p.id, version: p.version, status: 'awaiting_acceptance' }));
  p = value(await run('media_accept', { productionId: p.id, version: p.version, media: { quoteVersion: 1, acceptedBy: 'Client', evidenceSource: 'chat' } }));
  return value(await run('media_payment_record', { requestId: randomUUID(), productionId: p.id, amountMinor: Math.round(quoteMinor / 5), method: 'bank_transfer' }));
}

/** Holds and confirms each resource for the shoot interval. */
export async function hold(run, p, resources, startsAt, endsAt) {
  const out = [];
  for (const r of resources) {
    const held = value(await run('media_reservation_save', { requestId: randomUUID(), productionId: p.id, mediaResourceId: r.id, media: { startsAt, endsAt } }));
    out.push(value(await run('media_reservation_status', { reservationId: held.id, version: held.version, status: 'confirmed' })));
  }
  return out;
}

export const record = (run, p) => run('media_production', { productionId: p.id }).then(value);
export const move = (run, p, status, extra = {}) => run('media_production_status', { productionId: p.id, version: p.version, status, ...extra });

/** Verifies every preparation item (or the keys given). */
export async function prepare(run, p, keys = ['crew_confirmed', 'location_permission', 'equipment_ready', 'client_assets', 'talent_releases']) {
  for (const key of keys) p = value(await run('media_prep_verify', { productionId: p.id, version: p.version, media: { key, verified: true } }));
  return p;
}

/** Booked → preproduction → shooting → shoot recorded → editing. */
export async function shoot(run, p) {
  p = value(await move(run, p, 'booked'));
  p = value(await move(run, p, 'preproduction'));
  p = await prepare(run, p);
  p = value(await move(run, p, 'shooting'));
  return value(await run('media_shoot_complete', { productionId: p.id, version: p.version, media: { mediaReceived: true } }));
}

export const submitCut = (run, p, label, approverName = 'Client') => run('media_cut_submit', { requestId: randomUUID(), productionId: p.id, version: p.version, media: { label, assetRef: `https://review.example/${label}`, approverName } });
export const decide = (run, cut, decision, feedback = 'Shorter intro') => run('media_cut_decide', { cutId: cut.id, version: cut.version, media: { decision, approverName: 'Client', evidenceSource: 'chat', ...(decision === 'changes_requested' ? { feedback } : {}) } });
export const metric = (insights, id) => [...insights.headline, ...insights.diagnostics].find(m => m.id === id);
export { randomUUID };
