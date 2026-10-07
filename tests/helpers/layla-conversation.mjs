// One published business behind the real WhatsApp path: envelope → ingestBlueEnvelope →
// liveAnswer → Convex ingest (memory) → worker → a fake Meta sender. Tests read exactly
// what each customer would receive.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from './blue-tenant.mjs';
import { SECRET } from './convex-memory.mjs';
import { executeReview } from '../../convex/reviewState.js';
import { executeHasib } from '../../convex/hasib/hasibState.js';
import { grantPlan } from '../../convex/hasib/plans.js';
import { ingestBlueEnvelope, createBlueWorker } from '../../api/_lib/layla/blue-messaging.js';
import { sealToken, credentialContext } from '../../api/_lib/layla/customer-meta.js';
import { GREEN_CLOUD } from './green-env.mjs';

export const env = { CONVEX_CLOUD_URL: GREEN_CLOUD, BLUE_REVIEW_SERVICE_SECRET: 'a'.repeat(64), LAYLA_CREDENTIAL_ENCRYPTION_KEY: 'b'.repeat(64), BLUE_MESSAGING_WORKER_SECRET: 'c'.repeat(64), BLUE_LIVE_MESSAGING_ENABLED: 'true' };

/** A filled bzns.md: the same shape an owner publishes from the editor. */
export const bzns = ({ tone = 'informative', sector = 'real-estate', name = 'Qurum Coast Properties' } = {}) => `---
name: ${name}
sector: ${sector}
tone: ${tone}
---
## About us
Family agency in Muscat since 2012.
## What we offer
- Villa and apartment rentals
- Property sales
## Location
Al Qurum, Muscat
## Hours
Sunday to Thursday 8:30 to 17:30
## FAQ
Q: Are viewings free?
A: Yes, viewings are always free.
`;

/**
 * @param {{ tone?: string, sector?: string, name?: string, sectorLabel?: string, markdown?: string, ascend?: string, seed?: (hasib: Function) => Promise<void> }} options
 *   `ascend` grants the Ascend plan with that Hasib pack; `seed` then adds stock rows.
 */
export async function business(options = {}) {
  const h = blueHarness(); await h.enable();
  const tenant = await seedTenant(h.m, { sector: options.sectorLabel || 'Real estate' });
  // A real sealed credential so the worker can open it, as in production.
  const row = await h.m.db.get(tenant.rowId);
  const integration = { ...row.integration, credential: sealToken('synthetic-token-only', credentialContext(tenant.sessionHash, row.integration), env) };
  await h.m.db.patch(tenant.rowId, { integration });
  const published = await executeReview(h.m.ctx, { operation: 'bzns_publish', sessionHash: tenant.sessionHash, markdown: options.markdown || bzns(options), version: 0 }, h.m.now());
  assert.equal(published.ok, true, JSON.stringify(published));
  assert.equal((await h.messaging('activate', { sessionHash: tenant.sessionHash })).ok, true);
  const hasib = (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: tenant.sessionHash, hashSecret: SECRET, ...args }, h.m.now());
  if (options.ascend) {
    await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
    await grantPlan(h.m.ctx, { email: 'a@example.com', plan: 'ascend', packId: options.ascend }, h.m.now());
    if (options.seed) await options.seed(hasib);
  }
  const store = async (operation, args) => { const r = await h.messaging(operation, args); assert.ok(r.ok, `${operation}: ${r.reason}`); return r.value; };
  const sent = [];
  const fetcher = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push({ to: body.to, text: body.text?.body ?? body.image?.caption ?? '', image: !!body.image });
    const json = { messages: [{ id: `wamid.out.${sent.length}` }] };
    return { ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) };
  };
  const worker = createBlueWorker({ env, store, fetcher, inspect: async () => ({ connected: true }) });
  const runJob = async jobId => {
    const res = { headers: {}, setHeader() {}, status(n) { this.code = n; }, end() {} };
    await worker({ method: 'POST', headers: { authorization: `Bearer ${env.BLUE_MESSAGING_WORKER_SECRET}` }, body: { jobId } }, res);
    return res.code;
  };
  const queued = () => h.m.table('blueMessages').filter(m => m.direction === 'out' && m.status === 'queued');
  const flush = async () => { for (const job of queued()) await runJob(job._id); };
  /** A WhatsApp webhook envelope for one inbound message. */
  const envelope = (from, message, { name, id = `wamid.${randomUUID()}` } = {}) => {
    const msg = typeof message === 'string' ? { type: 'text', text: { body: message } } : message;
    const value = { messaging_product: 'whatsapp', metadata: { phone_number_id: integration.phone }, ...(name ? { contacts: [{ wa_id: from, profile: { name } }] } : {}),
      messages: [{ id, from, timestamp: String(Math.floor(h.m.now() / 1000)), ...msg }] };
    return { entry: [{ id: integration.waba, changes: [{ field: 'messages', value }] }] };
  };
  const ingest = body => ingestBlueEnvelope(body, { store, now: h.m.now });
  /** One customer message through the real webhook path; returns what that customer received. */
  const say = async (from, message, { name } = {}) => {
    h.m.advance(1000);
    const before = sent.length;
    await ingest(envelope(from, message, { name }));
    await flush();
    return sent.slice(before).filter(s => s.to === from && !s.image).map(s => s.text);
  };
  const conversation = from => h.m.table('blueConversations').find(c => c.number === from || c.key?.endsWith(from));
  const contact = from => h.m.table('blueContacts').find(c => c.waId === from);
  const republish = async markdown => {
    const current = await h.m.db.get(tenant.rowId);
    const r = await executeReview(h.m.ctx, { operation: 'bzns_publish', sessionHash: tenant.sessionHash, markdown, version: current.bznsDraft?.version || 0 }, h.m.now());
    assert.equal(r.ok, true, JSON.stringify(r));
  };
  return { h, tenant, integration, hasib, say, envelope, ingest, flush, runJob, queued, conversation, contact, sent, republish };
}

// Fuller documents for the quality and stress suites: sector sections Layla quotes
// verbatim, and a handoff section she must never show a customer.
export const realEstateDoc = tone => `---
name: Qurum Coast Properties
sector: real-estate
tone: ${tone}
---
## About us
Family agency in Muscat since 2012.
## What we offer
- Villa and apartment rentals
- Property sales
## How viewings work
Send the property reference and two times that suit you. An agent always attends.
## Renting: documents and steps
Passport or Omani ID, residence card for expats, and a salary letter.
## Location
Al Qurum, Muscat
## Hours
Sunday to Thursday 8:30 to 17:30
## When Layla should hand over to the team
Negotiations, complaints and anything legal.
## FAQ
Q: Are viewings free?
A: Yes, viewings are always free.
Q: Do you manage properties for owners who live abroad?
A: Yes. We handle tenants, maintenance and rent collection.
`;
export const retailDoc = tone => `---
name: Nour Abayas
sector: retail
tone: ${tone}
---
## About us
Abaya boutique in Muscat Grand Mall since 2015.
## What we offer
- Abayas and shaylas
- Custom tailoring
## Delivery and pickup
We deliver across Muscat within 2 days. Pickup from the boutique is free.
## Returns and exchanges
Exchanges within 7 days with the receipt.
## Location
Muscat Grand Mall, ground floor
## FAQ
Q: Do you do custom sizes?
A: Yes, custom tailoring takes about 5 days.
`;
export const dentalDoc = tone => `---
name: Bright Smile Dental
sector: dental
tone: ${tone}
---
## About us
Family dental clinic in Al Khuwair.
## What we offer
- Check-ups and cleaning
- Whitening
- Orthodontics
## Insurance
We accept Dhofar and Oman Insurance.
## Location
Al Khuwair, Way 3013
`;
/** Hasib stock for the boutique: size 52 in stock, size 56 and the shayla sold out. */
export async function seedBoutique(hasib) {
  await hasib('item_save', { requestId: randomUUID(), item: { kind: 'product', nameAr: 'عباية سوداء', nameEn: 'Black abaya', category: 'Abayas', unit: 'piece', trackStock: true },
    variants: [{ sku: 'AB-52', options: [{ key: 'size', value: '52' }], priceMinor: 25000, costMinor: 10000, reorderPoint: 1, openingStock: 5 },
      { sku: 'AB-56', options: [{ key: 'size', value: '56' }], priceMinor: 25000, costMinor: 10000, reorderPoint: 1, openingStock: 0 }] });
  await hasib('item_save', { requestId: randomUUID(), item: { kind: 'product', nameAr: 'شيلة حرير', nameEn: 'Silk shayla', category: 'Shaylas', unit: 'piece', trackStock: true },
    variants: [{ sku: 'SH-1', options: [], priceMinor: 8500, costMinor: 3000, reorderPoint: 1, openingStock: 0 }] });
}
/** A business of one of the three fixture sectors in the given tone. */
export const fixtureBusiness = (sector, tone) => sector === 'retail' ? business({ markdown: retailDoc(tone), sectorLabel: 'Retail', ascend: 'retail', seed: seedBoutique })
  : sector === 'dental' ? business({ markdown: dentalDoc(tone), sectorLabel: 'Dental clinics' })
    : business({ markdown: realEstateDoc(tone) });
