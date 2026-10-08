// One published business behind the real webhook path, on WhatsApp or Instagram:
// envelope → ingestBlueEnvelope / ingestInstagramEnvelope → Convex ingest (memory) → Layla's
// AI turn (runReplyTurn with a scripted model, never a real one) → worker → a fake Meta sender.
// Tests read exactly what each customer receives, and every prompt the model was given.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { blueHarness, seedTenant } from './blue-tenant.mjs';
import { SECRET } from './convex-memory.mjs';
import { executeReview } from '../../convex/reviewState.js';
import { executeHasib } from '../../convex/hasib/hasibState.js';
import { executeInstagram } from '../../convex/blueInstagramState.js';
import { grantPlan } from '../../convex/hasib/plans.js';
import { ingestBlueEnvelope, ingestInstagramEnvelope, createBlueWorker } from '../../api/_lib/layla/blue-messaging.js';
import { runReplyTurn } from '../../convex/laylaRespond.js';
import { REPLY_DEBOUNCE_MS } from '../../convex/laylaTurn.js';
import { sealToken, credentialContext } from '../../api/_lib/layla/customer-meta.js';
import { GREEN_CLOUD } from './green-env.mjs';

export const IG_APP = '1674756910890232', IG_ACCOUNT = '17841400000000077';

/** The last customer message in a prompt. */
export const lastCustomer = messages => [...messages].reverse().find(m => m.role === 'user')?.content || '';
/**
 * A scripted stand-in for Qwen: `answer(question, messages)` returns the reply text, or an object
 * with any of {reply, intent, needs_team, no_reply, asked_field, fields}. The default repeats the
 * question, which always passes the language and grounding checks.
 */
export const scriptedModel = (answer = q => `About "${q}": here is what we have.`) => {
  const calls = [];
  const generate = async messages => {
    calls.push(messages);
    const out = await answer(lastCustomer(messages), messages);
    const body = typeof out === 'string' ? { reply: out, intent: 'answer' } : { intent: 'answer', ...out };
    return { text: JSON.stringify(body), usage: { input: 100, output: 20 }, ms: 5, model: 'qwen-plus' };
  };
  generate.calls = calls;
  return generate;
};
// Green runtime, both channels open, as in production.
export const env = { CONVEX_CLOUD_URL: GREEN_CLOUD, GREEN_CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SERVICE_SECRET: 'a'.repeat(64), LAYLA_CREDENTIAL_ENCRYPTION_KEY: 'b'.repeat(64),
  GREEN_MESSAGING_WORKER_SECRET: 'c'.repeat(64), GREEN_WHATSAPP_ENABLED: 'true', GREEN_INSTAGRAM_APPROVED: 'true', GREEN_INSTAGRAM_ENABLED: 'true',
  MAIN_INSTAGRAM_APP_ID: IG_APP, MAIN_INSTAGRAM_APP_SECRET: 'instagram-secret', LAYLA_META_APP_ID: '1388038082832745' };

/** A filled bzns.md: the same shape an owner publishes from the editor. */
export const bzns = ({ tone = 'informative', sector = 'real-estate', name = 'Qurum Coast Properties' } = {}) => `---
name: ${name}
sector: ${sector}
tone: ${tone}
---
## About us
Family agency in Muscat since 2012.
## Team contact
WhatsApp +968 9100 2000 (Sara)
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
 * @param {{ tone?: string, sector?: string, name?: string, sectorLabel?: string, markdown?: string, ascend?: string, seed?: (hasib: Function) => Promise<void>, channel?: 'whatsapp'|'instagram' }} options
 *   `ascend` grants the Ascend plan with that Hasib pack; `seed` then adds stock rows.
 *   `channel: 'instagram'` connects an Instagram account and talks to Layla through it.
 */
export async function business(options = {}) {
  const h = blueHarness(); await h.enable();
  const model = options.model || scriptedModel();
  const tenant = await seedTenant(h.m, { sector: options.sectorLabel || 'Real estate' });
  // A real sealed credential so the worker can open it, as in production.
  const row = await h.m.db.get(tenant.rowId);
  const integration = { ...row.integration, credential: sealToken('synthetic-token-only', credentialContext(tenant.sessionHash, row.integration), env) };
  await h.m.db.patch(tenant.rowId, { integration });
  const published = await executeReview(h.m.ctx, { operation: 'bzns_publish', sessionHash: tenant.sessionHash, markdown: options.markdown || bzns(options), version: 0 }, h.m.now());
  assert.equal(published.ok, true, JSON.stringify(published));
  const instagram = options.channel === 'instagram';
  if (instagram) await connectInstagram(h, tenant);
  assert.equal((await h.messaging('activate', { sessionHash: tenant.sessionHash, ...(instagram ? { channel: 'instagram' } : {}) })).ok, true);
  const hasib = (operation, args = {}) => executeHasib(h.m.ctx, { operation, sessionHash: tenant.sessionHash, hashSecret: SECRET, ...args }, h.m.now());
  if (options.ascend) {
    await h.m.db.insert('blueMessagingSettings', { key: 'hasib', enabled: true });
    await grantPlan(h.m.ctx, { email: 'a@example.com', plan: 'ascend', packId: options.ascend }, h.m.now());
    if (options.seed) await options.seed(hasib);
  }
  const store = async (operation, args) => { const r = await h.messaging(operation, args); assert.ok(r.ok, `${operation}: ${r.reason}`); return r.value; };
  const sent = [];
  const reply = json => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) });
  const fetcher = async (url, init = {}) => {
    const u = new URL(url);
    // Instagram Graph reads: our own account, and a customer's @username (never a real name).
    if (u.hostname === 'graph.instagram.com' && (init.method || 'GET') === 'GET') return reply(u.pathname.endsWith('/me') ? { user_id: IG_ACCOUNT } : { username: 'customer.ig' });
    const body = JSON.parse(init.body);
    if (u.hostname === 'graph.instagram.com') {
      sent.push({ to: body.recipient.id, text: body.message?.text ?? '', image: !!body.message?.attachment, bytes: Buffer.byteLength(body.message?.text ?? '') });
      return reply({ recipient_id: body.recipient.id, message_id: `mid.out.${sent.length}` });
    }
    sent.push({ to: body.to, text: body.text?.body ?? body.image?.caption ?? '', image: !!body.image });
    return reply({ messages: [{ id: `wamid.out.${sent.length}` }] });
  };
  const worker = createBlueWorker({ env, store, fetcher, inspect: async () => ({ connected: true }) });
  const runJob = async jobId => {
    const res = { headers: {}, setHeader() {}, status(n) { this.code = n; }, end() {} };
    await worker({ method: 'POST', headers: { authorization: `Bearer ${env.GREEN_MESSAGING_WORKER_SECRET}` }, body: { jobId } }, res);
    return res.code;
  };
  const queued = () => h.m.table('blueMessages').filter(m => m.direction === 'out' && m.status === 'queued');
  const flush = async () => { for (const job of queued()) await runJob(job._id); };
  /** Layla's pending AI turns, as the debounced reply action runs them in production. */
  const turns = async () => {
    h.m.advance(REPLY_DEBOUNCE_MS);
    const results = [];
    for (const c of h.m.table('blueConversations').filter(c => c.pendingReply)) results.push(await runReplyTurn({ exec: (operation, args) => h.messaging(operation, args), conversationId: c._id, key: c.pendingReply.key, generate: model }));
    return results;
  };
  /** A webhook envelope for one inbound message on this business's channel. */
  const envelope = (from, message, { name, id = `wamid.${randomUUID()}` } = {}) => {
    if (instagram) return instagramEnvelope(from, message, id.replace('wamid', 'mid'), h.m.now());
    const msg = typeof message === 'string' ? { type: 'text', text: { body: message } } : message;
    const value = { messaging_product: 'whatsapp', metadata: { phone_number_id: integration.phone }, ...(name ? { contacts: [{ wa_id: from, profile: { name } }] } : {}),
      messages: [{ id, from, timestamp: String(Math.floor(h.m.now() / 1000)), ...msg }] };
    return { entry: [{ id: integration.waba, changes: [{ field: 'messages', value }] }] };
  };
  const ingest = body => (instagram ? ingestInstagramEnvelope(body, { store, now: h.m.now, app: IG_APP, env, fetcher }) : ingestBlueEnvelope(body, { store, now: h.m.now }));
  /** One customer message through the real webhook path; returns what that customer received. */
  const say = async (from, message, { name } = {}) => {
    h.m.advance(1000);
    const before = sent.length;
    await ingest(envelope(from, message, { name }));
    await turns();
    await flush();
    return sent.slice(before).filter(s => s.to === from && !s.image).map(s => s.text);
  };
  const conversation = from => h.m.table('blueConversations').find(c => c.number === from || c.key?.endsWith(from));
  const contact = from => { const c = conversation(from); return c && h.m.table('blueContacts').find(x => x._id === c.contactId); };
  const republish = async markdown => {
    const current = await h.m.db.get(tenant.rowId);
    const r = await executeReview(h.m.ctx, { operation: 'bzns_publish', sessionHash: tenant.sessionHash, markdown, version: current.bznsDraft?.version || 0 }, h.m.now());
    assert.equal(r.ok, true, JSON.stringify(r));
  };
  return { h, tenant, integration, hasib, say, envelope, ingest, turns, flush, runJob, queued, conversation, contact, sent, republish, model, channel: instagram ? 'instagram' : 'whatsapp' };
}

/** Connect an Instagram professional account to the tenant, with a real sealed token. */
async function connectInstagram(h, tenant) {
  const ig = (operation, args = {}) => executeInstagram(h.m.ctx, { operation, sessionHash: tenant.sessionHash, ...args }, h.m.now());
  const integration = { id: randomUUID(), channel: 'instagram', app: IG_APP, igAccount: IG_ACCOUNT, username: 'business.ig' };
  integration.credential = sealToken('synthetic-instagram-token', credentialContext(tenant.sessionHash, integration), env);
  const stateHash = 'e'.repeat(64);
  await ig('begin', { stateHash, lang: 'en' });
  await ig('consume', { stateHash });
  const connected = await ig('connect', { stateHash, integration, tokenExpiresAt: h.m.now() + 60 * 86400000 });
  assert.equal(connected.ok, true, JSON.stringify(connected));
}

/** An Instagram webhook envelope: text, a tapped ice breaker ({ postback }) or an attachment ({ type }). */
function instagramEnvelope(from, message, mid, now) {
  const item = { sender: { id: from }, recipient: { id: IG_ACCOUNT }, timestamp: now };
  if (typeof message === 'string') item.message = { mid, text: message };
  else if (message.postback) item.postback = { mid, title: message.postback, payload: 'ICE_BREAKER' };
  else if (message.type === 'text') item.message = { mid, text: message.text.body };
  else item.message = { mid, attachments: [{ type: message.type === 'audio' ? 'audio' : message.type, payload: {} }] };
  return { object: 'instagram', entry: [{ id: IG_ACCOUNT, time: now, messaging: [item] }] };
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
## Team contact
WhatsApp +968 9100 2000 (Sara)
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
## Team contact
WhatsApp +968 9100 2000 (Sara)
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
## Team contact
WhatsApp +968 9100 2000 (Sara)
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
/** A business of one of the three fixture sectors in the given tone, on WhatsApp or Instagram. */
export const fixtureBusiness = (sector, tone, channel = 'whatsapp') => sector === 'retail' ? business({ markdown: retailDoc(tone), sectorLabel: 'Retail', ascend: 'retail', seed: seedBoutique, channel })
  : sector === 'dental' ? business({ markdown: dentalDoc(tone), sectorLabel: 'Dental clinics', channel })
    : business({ markdown: realEstateDoc(tone), channel });
