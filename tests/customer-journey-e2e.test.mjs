// A whole customer, end to end, through the real API handlers and Convex state machines:
// Ahmed grants access → the customer signs in with an emailed code → opens setup →
// publishes bzns.md → connects Instagram (OAuth) → activates → a customer DMs through
// the signed webhook → the worker sends Layla's reply → the owner sees it in the inbox.
// The same journey then runs on WhatsApp. Only Meta, the email sender and the Convex
// network hop are fakes; every handler, store client and mutation body is real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { convexMemory, SECRET } from './helpers/convex-memory.mjs';
import { GREEN_CLOUD, GREEN_ORIGIN, GREEN_SECRET, GREEN_SITE } from './helpers/green-env.mjs';
import { createBlueAuthHandler } from '../api/_lib/blue-auth.js';
import { createAccessAdmin } from '../api/access-admin.js';
import { accessStore } from '../api/_lib/convex.js';
import { createHandler as createLaylaMeta } from '../api/layla-meta.js';
import { createHandler as createWebhook } from '../api/layla-meta-webhook.js';
import { createHandler as createWorker } from '../api/layla-meta-worker.js';
import { executeBlueAuth } from '../convex/blueAuthState.js';
import { executeAccess } from '../convex/blueAccessState.js';
import { executeReview } from '../convex/reviewState.js';
import { executeMessaging } from '../convex/blueMessagingState.js';
import { executeInstagram } from '../convex/blueInstagramState.js';
import { executeDashboard } from '../convex/blueDashboardState.js';
import { executeProductSetup } from '../convex/productSetupState.js';
import { executeKnowledge } from '../convex/knowledgeSourceState.js';
import { realEstateDoc } from './helpers/layla-conversation.mjs';
import { runReplyTurn } from '../convex/laylaRespond.js';
import { REPLY_DEBOUNCE_MS } from '../convex/laylaTurn.js';

const IG_APP = '1674756910890232', IG_ACCOUNT = '17841400000000088', CSRF = 'f'.repeat(64);
const env = {
  VERCEL_ENV: 'production', GREEN_CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SITE_URL: GREEN_SITE, CONVEX_SERVICE_SECRET: GREEN_SECRET,
  PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, GREEN_CONVEX_CUTOVER: 'true', GREEN_DATA_MIGRATION_VERIFIED: 'true', GREEN_STATE_PATHS_CONVEX: 'true',
  LEAD_ENDPOINT: 'https://script.example/exec', OTP_SHARED_SECRET: 'o'.repeat(32), LAYLA_CREDENTIAL_ENCRYPTION_KEY: 'b'.repeat(64),
  GREEN_MESSAGING_WORKER_SECRET: 'c'.repeat(64), LAYLA_META_APP_SECRET: 'parent-secret', LAYLA_META_APP_ID: '1388038082832745',
  MAIN_INSTAGRAM_APP_ID: IG_APP, MAIN_INSTAGRAM_APP_SECRET: 'instagram-secret', GREEN_INSTAGRAM_APPROVED: 'true', GREEN_INSTAGRAM_ENABLED: 'true',
  GREEN_INSTAGRAM_VERIFY_TOKEN: 'ig-verify', GREEN_WHATSAPP_VERIFY_TOKEN: 'wa-verify', GREEN_WHATSAPP_ENABLED: 'true',
};

function world() {
  // The handlers run on the real clock (token expiry, webhook timestamps), so Convex's clock
  // starts just behind it and the journey's few minutes never run ahead of it.
  const m = convexMemory({ start: Date.now() - 20 * 60000 });
  const codes = new Map(), sent = [];
  // The Convex HTTP hop: each route runs its real mutation body against the memory database.
  const ROUTES = {
    'blue-auth': a => executeBlueAuth(m.ctx, a, m.now()),
    'blue-access': a => executeAccess(m.ctx, a, m.now()),
    'blue-review': a => executeReview(m.ctx, a, m.now()),
    'blue-messaging': a => executeMessaging(m.ctx, { ...a, hashSecret: SECRET, workerFunction: 'dispatch' }, m.now()),
    'blue-instagram': a => executeInstagram(m.ctx, { ...a, purgeFunction: 'purge' }, m.now()),
    'blue-dashboard': a => executeDashboard(m.ctx, { ...a, hashSecret: SECRET }, m.now()),
    'product-setup': a => executeProductSetup(m.ctx, a, m.now()),
    'knowledge-sources': a => executeKnowledge(m.ctx, a, m.now()),
  };
  const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetcher = async (url, init = {}) => {
    const u = new URL(url);
    if (u.origin === GREEN_SITE) {
      const route = ROUTES[u.pathname.slice(1)];
      assert.ok(route, `unexpected Convex route ${u.pathname}`);
      return json(await route(JSON.parse(init.body)));
    }
    // Instagram Login: code → short token → long token → identity → subscribe → send.
    if (u.hostname === 'api.instagram.com') return json({ access_token: 'short-token', user_id: IG_ACCOUNT, permissions: ['instagram_business_basic', 'instagram_business_manage_messages'] });
    if (u.hostname === 'graph.instagram.com') {
      if (u.pathname === '/access_token') return json({ access_token: 'long-lived-token', expires_in: 5184000 });
      if (u.pathname.endsWith('/me')) return json({ user_id: IG_ACCOUNT, username: 'qurum.coast' });
      if (u.pathname.endsWith('/subscribed_apps')) return json({ success: true });
      if (u.pathname.endsWith('/messages')) {
        const body = JSON.parse(init.body);
        sent.push({ channel: 'instagram', to: body.recipient.id, text: body.message?.text || '' });
        return json({ recipient_id: body.recipient.id, message_id: `mid.out.${sent.length}` });
      }
      return json({ username: 'a.customer' });
    }
    if (u.hostname === 'graph.facebook.com' && u.pathname.endsWith('/messages')) {
      const body = JSON.parse(init.body);
      sent.push({ channel: 'whatsapp', to: body.to, text: body.text?.body || '' });
      return json({ messages: [{ id: `wamid.out.${sent.length}` }] });
    }
    assert.fail(`unexpected network call ${url}`);
  };
  const auth = createBlueAuthHandler({ env, fetcher, sendCode: async ({ email, code }) => { codes.set(email, code); } });
  const laylaMeta = createLaylaMeta({ env, fetcher });
  const access = createAccessAdmin({ store: accessStore({ env, fetcher }) });
  const webhook = createWebhook({ env, fetcher });
  // Meta's WhatsApp number check (Graph reads) is part of the fake Meta.
  const worker = createWorker({ env, fetcher, inspect: async () => ({ connected: true }) });
  return { m, codes, sent, fetcher, auth, laylaMeta, access, webhook, worker };
}

/** A browser for one person: cookies, CSRF and same-origin headers, as the real pages send them. */
function browser(w) {
  const jar = { bf_csrf: CSRF }, surfaceCsrf = {};
  const call = async (handler, method, url, body, ...extra) => {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    // Like the pages: a surface that hands out its own CSRF token gets it back on writes.
    const surface = new URL(url, GREEN_ORIGIN).searchParams.get('surface') || '';
    const req = { method, url, body, headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie, 'x-csrf-token': surfaceCsrf[surface] || CSRF, 'content-type': 'application/json' } };
    const res = { statusCode: 200, headers: {}, getHeader(k) { return this.headers[k.toLowerCase()]; }, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(n) { this.statusCode = n; return this; }, end(v) { this.body = v; } };
    await handler(req, res, ...extra);
    for (const c of [].concat(res.headers['set-cookie'] || [])) { const [pair] = c.split(';'); const [k, ...v] = pair.split('='); jar[k.trim()] = v.join('='); }
    let parsed = null; try { parsed = res.body ? JSON.parse(res.body) : null; } catch { parsed = res.body; }
    if (typeof parsed?.csrfToken === 'string' && surface) surfaceCsrf[surface] = parsed.csrfToken;
    return { status: res.statusCode, body: parsed, location: res.headers.location };
  };
  return {
    signIn: async email => {
      assert.equal((await call(w.auth, 'POST', '/api/auth-code', { email }, 'code')).status, 200);
      const r = await call(w.auth, 'POST', '/api/auth-session', { email, code: w.codes.get(email) }, 'session');
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.account;
    },
    get: url => call(w.laylaMeta, 'GET', url),
    post: (url, body) => call(w.laylaMeta, 'POST', url, body),
    grant: body => call(w.access, 'POST', '/api/access-admin', body),
  };
}

const signedWebhook = async (w, envelope, secret) => {
  const raw = Buffer.from(JSON.stringify(envelope));
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; }, end(v) { this.body = v; } };
  await w.webhook({ method: 'POST', url: '/api/layla-meta-webhook', headers: { 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}` }, body: raw }, res);
  return res.statusCode;
};
// Layla's AI turn with a stand-in for Qwen: it answers viewings from the published FAQ, and
// records every prompt so the test can check the model was given the owner's facts.
const WELCOME = 'Hello Sara, I’m Layla from Qurum Coast Properties. We rent villas in Al Mouj.';
const prompts = [];
const model = async messages => {
  prompts.push(messages);
  const q = [...messages].reverse().find(m => m.role === 'user').content;
  return { text: JSON.stringify({ reply: /viewings/i.test(q) ? 'Yes, viewings are always free.' : WELCOME, intent: 'answer' }), usage: { input: 1, output: 1 }, ms: 1, model: 'test-model' };
};
const runQueued = async w => {
  w.m.advance(REPLY_DEBOUNCE_MS);
  for (const c of w.m.table('blueConversations').filter(c => c.pendingReply))
    await runReplyTurn({ exec: (operation, args) => executeMessaging(w.m.ctx, { operation, ...args, hashSecret: SECRET }, w.m.now()), conversationId: c._id, key: c.pendingReply.key, generate: model });
  for (const job of w.m.table('blueMessages').filter(x => x.direction === 'out' && x.status === 'queued')) {
    const res = { headers: {}, setHeader() {}, status(n) { this.statusCode = n; }, end() {} };
    await w.worker({ method: 'POST', headers: { authorization: `Bearer ${env.GREEN_MESSAGING_WORKER_SECRET}` }, body: { jobId: job._id } }, res);
  }
};

async function onboard(w, email) {
  await w.m.db.insert('blueMessagingSettings', { key: 'global', enabled: true, rolloutMode: 'live', smokeVerifiedAt: 1, smokeEvidence: 'synthetic-test' });
  const ahmed = browser(w), owner = browser(w);
  await ahmed.signIn('ahmed@bznsflowai.com');
  // Before the grant the customer has no setup.
  await owner.signIn(email);
  assert.equal((await owner.get('/api/layla-meta?surface=product-setup&product=catalyst')).status, 403, 'no access before the grant');
  assert.equal((await ahmed.grant({ email, plan: 'catalyst' })).status, 200);
  assert.equal((await owner.get('/api/layla-meta?surface=product-setup&product=catalyst')).status, 200, 'Setup Catalyst opens after the grant');
  // Setup: open the business draft, then save and publish the one bzns.md document.
  const draft = await owner.get('/api/layla-meta?surface=customer');
  assert.equal(draft.status, 200);
  const save = await owner.post('/api/layla-meta?surface=customer', { action: 'bzns_save', markdown: realEstateDoc('informative'), version: 0 });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  const publish = await owner.post('/api/layla-meta?surface=customer', { action: 'bzns_publish', markdown: realEstateDoc('informative'), version: 1 });
  assert.equal(publish.status, 200, JSON.stringify(publish.body));
  // Published details in hand, the setup page claims the draft for the signed-in account.
  const claim = await owner.post('/api/layla-meta?surface=customer', { action: 'claim_draft' });
  assert.equal(claim.status, 200, JSON.stringify(claim.body));
  return owner;
}

test('a granted customer sets up, connects Instagram, activates, and Layla answers a DM they see in the inbox', async () => {
  const w = world(), email = 'owner@qurumcoast.example';
  const owner = await onboard(w, email);
  // Instagram: connect → Instagram's login → our callback → connected and subscribed.
  const connect = await owner.post('/api/layla-meta?surface=instagram', { action: 'connect', lang: 'en' });
  assert.equal(connect.status, 200, JSON.stringify(connect.body));
  const state = new URL(connect.body.url).searchParams.get('state');
  const back = await owner.get(`/api/layla-meta?code=instagram-code&state=${state}`);
  assert.equal(back.status, 303);
  assert.match(back.location, /instagram=connected/, back.location);
  // Back on the setup page, Layla switches on by herself (a few minutes later: the old 60-second trap).
  w.m.advance(5 * 60000);
  const activate = await owner.post('/api/layla-meta?surface=messaging', { action: 'activate', channel: 'instagram', auto: true });
  assert.equal(activate.status, 200, JSON.stringify(activate.body));
  assert.equal(activate.body.active, true, JSON.stringify(activate.body));
  // The owner can turn her off, and a later automatic switch-on (a page reload) keeps that choice.
  assert.equal((await owner.post('/api/layla-meta?surface=messaging', { action: 'pause', channel: 'instagram' })).body.active, false);
  const reload = await owner.post('/api/layla-meta?surface=messaging', { action: 'activate', channel: 'instagram', auto: true });
  assert.equal(reload.body.active, false, JSON.stringify(reload.body));
  assert.equal(reload.body.reason, 'owner_paused');
  assert.equal((await owner.post('/api/layla-meta?surface=messaging', { action: 'activate', channel: 'instagram' })).body.active, true);
  // A customer DMs; Meta delivers it signed with the Instagram app secret.
  const dm = text => ({ object: 'instagram', entry: [{ id: IG_ACCOUNT, time: w.m.now(), messaging: [{ sender: { id: '1999000000000001' }, recipient: { id: IG_ACCOUNT }, timestamp: w.m.now(), message: { mid: `mid.${w.m.now()}`, text } }] }] });
  assert.equal(await signedWebhook(w, dm("Hi I'm Sara, looking for a villa to rent in Al Mouj"), 'instagram-secret'), 200);
  await runQueued(w);
  const [welcome] = w.sent;
  assert.equal(welcome.channel, 'instagram');
  assert.equal(welcome.text, WELCOME);
  assert.match(prompts.at(-1)[0].content, /introducing yourself as Layla from Qurum Coast Properties/);
  w.m.advance(60000);
  assert.equal(await signedWebhook(w, dm('Are the viewings free?'), 'instagram-secret'), 200);
  await runQueued(w);
  assert.equal(w.sent.at(-1).text, 'Yes, viewings are always free.');
  assert.match(prompts.at(-1)[0].content, /Are viewings free\?\s*A: Yes, viewings are always free\./, 'the model was given the owner’s own FAQ');
  // The owner's inbox shows the chat, its channel and what Layla captured.
  const chats = await owner.post('/api/layla-meta?surface=dashboard', { action: 'conversations' });
  assert.equal(chats.status, 200, JSON.stringify(chats.body));
  const [chat] = chats.body.items;
  assert.equal(chat.channel, 'instagram');
  const contact = w.m.table('blueContacts')[0];
  assert.equal(contact.customerName, 'Sara');
  assert.deepEqual(Object.fromEntries(contact.fields.map(f => [f.key, f.value])), { need: 'rent', property_type: 'villa', area: 'Al Mouj' });
});

test('the same journey on WhatsApp gives the same answers', async () => {
  const w = world(), email = 'owner2@qurumcoast.example';
  const owner = await onboard(w, email);
  // WhatsApp's connection is set up in Meta's Embedded Signup; here the bound number stands in for it.
  const row = w.m.table('blueReviewSessions').find(r => r.profile?.businessName === 'Qurum Coast Properties');
  const { sealToken, credentialContext } = await import('../api/_lib/layla/customer-meta.js');
  const integration = { id: 'wa-integration', app: '1388038082832745', waba: '1234', phone: '5678', sender: '96890000000', path: 'new_number' };
  integration.credential = sealToken('wa-token', credentialContext(row.sessionHash, integration), env);
  await w.m.db.patch(row._id, { integration, phone: '5678', waba: '1234', status: 'connected', checkedAt: w.m.now(), connectionChecks: { routing: true, registered: true, path: true } });
  assert.equal((await executeMessaging(w.m.ctx, { operation: 'activate', sessionHash: row.sessionHash, hashSecret: SECRET }, w.m.now())).ok, true);
  const msg = text => ({ object: 'whatsapp_business_account', entry: [{ id: '1234', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '5678' },
    messages: [{ id: `wamid.${w.m.now()}`, from: '96891234567', timestamp: String(Math.floor(w.m.now() / 1000)), type: 'text', text: { body: text } }] } }] }] });
  assert.equal(await signedWebhook(w, msg("Hi I'm Sara, looking for a villa to rent in Al Mouj"), 'parent-secret'), 200);
  await runQueued(w);
  assert.equal(w.sent[0].text, WELCOME);
  w.m.advance(60000);
  assert.equal(await signedWebhook(w, msg('Are the viewings free?'), 'parent-secret'), 200);
  await runQueued(w);
  assert.equal(w.sent.at(-1).text, 'Yes, viewings are always free.');
});
