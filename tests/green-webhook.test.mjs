// The one Green webhook URL serves WhatsApp and Instagram: the payload's `object` picks the
// route, each channel must carry its own valid signature, and ingress is durable even while
// that channel's sending is paused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createHandler } from '../api/layla-meta-webhook.js';
import { GREEN_CLOUD, GREEN_ORIGIN, GREEN_SECRET, GREEN_SITE } from './helpers/green-env.mjs';

const IG_APP = '1674756910890232', IG_ACCOUNT = '17841400000000001', CUSTOMER = '1234567890123456';
const env = {
  VERCEL_ENV: 'production', GREEN_CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SITE_URL: GREEN_SITE, CONVEX_SERVICE_SECRET: GREEN_SECRET,
  PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, GREEN_CONVEX_CUTOVER: 'true', GREEN_DATA_MIGRATION_VERIFIED: 'true', GREEN_STATE_PATHS_CONVEX: 'true',
  GREEN_WHATSAPP_VERIFY_TOKEN: 'wa-verify', GREEN_INSTAGRAM_VERIFY_TOKEN: 'ig-verify', LAYLA_META_APP_SECRET: 'parent-secret',
  MAIN_INSTAGRAM_APP_ID: IG_APP, MAIN_INSTAGRAM_APP_SECRET: 'instagram-secret', GREEN_WHATSAPP_ENABLED: 'true',
  GREEN_INSTAGRAM_APPROVED: 'true', GREEN_INSTAGRAM_ENABLED: 'true', LAYLA_CREDENTIAL_ENCRYPTION_KEY: 'b'.repeat(64),
};
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; }, end(body) { this.body = body; } });
const sign = (raw, secret) => `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
const instagramBody = (text = 'Hi') => Buffer.from(JSON.stringify({ object: 'instagram', entry: [{ id: IG_ACCOUNT, time: Date.now(),
  messaging: [{ sender: { id: CUSTOMER }, recipient: { id: IG_ACCOUNT }, timestamp: Date.now(), message: { mid: 'mid.test.1', text } }] }] }));
const whatsappBody = () => Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '111', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '222' },
  messages: [{ id: 'wamid.test', from: '96891111111', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Hello' } }] } }] }] }));
const post = (raw, secret) => ({ method: 'POST', url: '/api/layla-meta-webhook', headers: { 'x-hub-signature-256': secret ? sign(raw, secret) : '' }, body: raw });
const igBinding = { integrationId: 'ig-integration', channel: 'instagram', app: IG_APP, igAccount: IG_ACCOUNT, sessionHash: 'a'.repeat(64),
  integration: { id: 'ig-integration', channel: 'instagram', app: IG_APP, igAccount: IG_ACCOUNT, credential: { v: 1, iv: 'x', data: 'x', tag: 'x' } },
  profile: { businessName: 'Nour', services: 'Abayas', reviewed: true, handoffMode: 'inbox' }, profileVersion: 1 };
const waBinding = { integrationId: 'wa-integration', app: '1388038082832745', waba: '111', phone: '222', sender: '96890000000', profile: { services: 'Test', reviewed: true }, profileVersion: 1 };

function recorder(binding) {
  const calls = [];
  const messaging = async (op, args) => { calls.push({ op, args }); return op === 'binding' ? binding : null; };
  return { calls, messaging, ingested: () => calls.find(c => c.op === 'ingest')?.args };
}

test('Meta verifies either channel with its own token; anything else is refused', async () => {
  const handler = createHandler({ env, messaging: async () => assert.fail('no storage on verification') });
  for (const [token, code] of [['wa-verify', 200], ['ig-verify', 200], ['nope', 403]]) {
    const res = response();
    await handler({ method: 'GET', url: `/api/layla-meta-webhook?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=probe`, headers: {} }, res);
    assert.equal(res.statusCode, code, token);
    if (code === 200) assert.equal(res.body, 'probe');
  }
});

test('an Instagram DM signed by the Instagram app reaches Layla with a reply', async () => {
  const r = recorder(igBinding);
  const res = response();
  await createHandler({ env, messaging: r.messaging })(post(instagramBody(), 'instagram-secret'), res);
  assert.equal(res.statusCode, 200);
  const [event] = r.ingested().events;
  assert.equal(event.from, CUSTOMER);
  assert.equal(event.text.length > 0, true, 'the message text reaches Convex; Layla’s AI turn writes the reply there');
  assert.equal(event.reply, undefined, 'nothing is answered inside the webhook');
  assert.equal(r.ingested().suppressAutomation, false);
});

test('the parent app secret also signs Instagram webhooks; a wrong secret never does', async () => {
  const ok = recorder(igBinding), resOk = response();
  await createHandler({ env, messaging: ok.messaging })(post(instagramBody(), 'parent-secret'), resOk);
  assert.equal(resOk.statusCode, 200);
  const bad = recorder(igBinding), resBad = response();
  await createHandler({ env, messaging: bad.messaging })(post(instagramBody(), 'someone-else'), resBad);
  assert.equal(resBad.statusCode, 403);
  assert.equal(bad.calls.length, 0);
});

test('a WhatsApp payload signed only with the Instagram secret is refused', async () => {
  const r = recorder(waBinding), res = response();
  await createHandler({ env, messaging: r.messaging })(post(whatsappBody(), 'instagram-secret'), res);
  assert.equal(res.statusCode, 403);
  assert.equal(r.calls.length, 0);
  const good = recorder(waBinding), resGood = response();
  await createHandler({ env, messaging: good.messaging })(post(whatsappBody(), 'parent-secret'), resGood);
  assert.equal(resGood.statusCode, 200);
});

test('Instagram ingress is kept while Instagram sending is paused, with automation suppressed', async () => {
  const r = recorder(igBinding), res = response();
  await createHandler({ env: { ...env, GREEN_INSTAGRAM_ENABLED: 'false' }, messaging: r.messaging })(post(instagramBody(), 'instagram-secret'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(r.ingested().suppressAutomation, true);
});

test('unknown objects are refused', async () => {
  const raw = Buffer.from(JSON.stringify({ object: 'page', entry: [] }));
  const res = response();
  await createHandler({ env, messaging: async () => assert.fail('nothing stored') })(post(raw, 'parent-secret'), res);
  assert.equal(res.statusCode, 400);
});
