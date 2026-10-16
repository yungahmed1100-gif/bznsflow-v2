// A synthetic store for tests: one tenant on the retail or retail-tech pack with WhatsApp open, an
// invited employee, and helpers that drive orders, requests and repairs through the real operations.
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

export async function store({ packId = 'retail', name = 's' } = {}) {
  const h = blueHarness();
  await h.enable();
  await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
  const t = await seedTenant(h.m, { name, sector: 'Retail', waba: '1234', phone: '5678', sender: '96890000000' });
  await h.messaging('activate', { sessionHash: t.sessionHash });
  value(await grantPlan(h.m.ctx, { email: `${name}@example.com`, plan: 'ascend', packId }, h.m.now()));
  const as = actorAccountId => (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: t.sessionHash, hashSecret: SECRET, ...(actorAccountId ? { actorAccountId } : {}), ...args }, h.m.now());
  const manager = as(null);
  const member = value(await manager('team_invite', { email: `staff-${name}@example.com` }));
  const employeeId = await h.m.db.insert('accounts', { email: `staff-${name}@example.com`, role: 'customer', createdAt: h.m.now() });
  await h.m.db.patch(member.id, { accountId: employeeId, status: 'active', activatedAt: h.m.now() });
  const run = () => automationRun(h.m.ctx, { accountId: t.accountId, workerFunction: null, secret: SECRET }, h.m.now());
  return { h, t, packId, manager, employee: as(employeeId), employeeId, run };
}

let phoneSeq = 5000000;
/** A customer who wrote in on WhatsApp (the 24-hour window is open). */
export async function customer(s, { name = 'Mariam', text = 'Hello' } = {}) {
  const from = `9689${phoneSeq++}`;
  await s.h.inbound(s.t, { from, text, profileName: name });
  const contact = (await s.h.dashboard('contacts', { sessionHash: s.t.sessionHash })).value.items.find(c => c.name === name);
  return { from, contact };
}

/** A product with one variant; stock as given. */
export async function product(s, { nameEn = 'Black abaya', nameAr = 'عباية سوداء', priceMinor = 25000, stock = 3, sku = `AB-${randomUUID().slice(0, 6)}` } = {}) {
  const r = value(await s.manager('item_save', { requestId: randomUUID(), item: { kind: 'product', nameAr, nameEn, category: 'Abayas', unit: 'piece', trackStock: true },
    variants: [{ sku, options: [{ key: 'size', value: '56' }], priceMinor, costMinor: Math.round(priceMinor / 2), reorderPoint: 0, ...(stock ? { openingStock: stock } : {}) }] }));
  return { itemId: r.item.id, variantId: r.variants[0].id };
}

export const order = (s, contactId, variantId, extra = {}) => s.manager('order_create', { requestId: randomUUID(), channel: 'whatsapp', contactId, fulfilment: { type: 'pickup' },
  lines: [{ variantId, qty: 1 }], confirm: true, ...extra }).then(value);
export const orderStatus = (s, o, to) => s.manager('order_status', { orderId: o.id, to, version: o.version }).then(value);
export const repairStatus = (s, r, to) => s.manager('repair_status', { repairId: r.id, to, version: r.version }).then(value);
export const repair = (s, contactId, { quoteMinor = 45000, device = 'iPhone 15 128GB' } = {}) => s.manager('repair_create', { requestId: randomUUID(), device, fault: 'Screen cracked', contactId, quoteMinor }).then(value);
export const followups = (s, filter, as = s.manager) => as('store_followups', { filter }).then(value);
export const sentRule = s => s.h.m.table('blueMessages').filter(m => m.direction === 'out' && m.retailDraftId);
