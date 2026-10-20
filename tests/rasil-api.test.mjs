// Rasil's Vercel side: who may use it, the domain and draft calls, the send worker, Resend's webhook and the
// links a subscriber clicks. Convex is a recorded fake here; tests/rasil-state.test.mjs covers its rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRasilApi, draftEmail, rasilOpen } from '../api/_lib/rasil-api.js';
import { createConfirm, createRasilWebhook, createSubscribe, createUnsubscribe, runRasilSend } from '../api/_lib/rasil-public.js';
import { signLink } from '../api/_lib/rasil-sign.js';
import { PilotError } from '../api/_lib/layla/config.js';
import { GREEN_ORIGIN } from './helpers/green-env.mjs';

const env = { PUBLIC_SITE_ORIGIN: GREEN_ORIGIN, CONVEX_SERVICE_SECRET: 'c'.repeat(64), RASIL_RESEND_API_KEY: 're_test', RASIL_TEST_EMAILS: 'owner@example.om' };
const csrf = 'b'.repeat(64);
const request = (method, body, { url = '/api/layla-meta?surface=rasil', headers = {} } = {}) => ({ method, body, url,
  headers: { host: 'www.bznsflowai.com', origin: GREEN_ORIGIN, cookie: `bf_session=${'a'.repeat(64)}; bf_csrf=${csrf}`, 'x-csrf-token': csrf, ...headers } });
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(n) { this.statusCode = n; return this; },
  end(v) { this.raw = v ?? ''; try { this.body = JSON.parse(v); } catch { this.body = null; } } });
const accounts = email => async () => ({ id: 'acct1', email, draftHash: 'd'.repeat(64) });
function recorder(answers = {}) {
  const calls = [];
  const store = async (op, args) => {
    calls.push({ op, args });
    const answer = answers[op];
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? answer(args) : Object.hasOwn(answers, op) ? answer : {};
  };
  return { calls, store };
}

test('Rasil opens to testers first, then to every Ascend account when switched on', async () => {
  assert.equal(rasilOpen(env, 'Owner@Example.om'), true);
  assert.equal(rasilOpen(env, 'other@example.om'), false);
  assert.equal(rasilOpen({ RASIL_ENABLED: 'true' }, 'other@example.om'), true);
  const { store } = recorder({ state: { domain: null } });
  const res = response();
  await createRasilApi({ env, store, accounts: accounts('other@example.om') })(request('GET'), res);
  assert.deepEqual([res.statusCode, res.body.reason], [503, 'email_unavailable']);
  const ok = response();
  await createRasilApi({ env, store, accounts: accounts('owner@example.om') })(request('GET'), ok);
  assert.equal(ok.statusCode, 200);
  const cross = response();
  await createRasilApi({ env, store, accounts: accounts('owner@example.om') })(request('POST', { action: 'campaigns' }, { headers: { origin: 'https://evil.example' } }), cross);
  assert.equal(cross.statusCode, 403);
});

test('connecting a domain creates it in Resend and stores its records with a form key', async () => {
  const { calls, store } = recorder({ domain_save: args => ({ domain: { domain: args.domain, status: args.status } }) });
  const fetches = [];
  const fetcher = async (url, opts) => { fetches.push({ url, body: opts.body && JSON.parse(opts.body) });
    return { status: 200, json: async () => ({ id: 'dom_123', status: 'not_started', records: [{ type: 'TXT', name: 'resend._domainkey', value: 'p=x', status: 'not_started' }] }) }; };
  const res = response();
  await createRasilApi({ env, fetcher, store, accounts: accounts('owner@example.om') })(request('POST', { action: 'domain_connect', domain: 'https://www.DarAlRayan.om/' }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(fetches[0], { url: 'https://api.resend.com/domains', body: { name: 'daralrayan.om', region: 'eu-west-1' } });
  const saved = calls.find(c => c.op === 'domain_save').args;
  assert.deepEqual([saved.domain, saved.resendDomainId, saved.status, saved.records.map(r => r.name)], ['daralrayan.om', 'dom_123', 'pending', ['resend._domainkey', '_dmarc']]);
  assert.match(saved.formKey, /^[A-Za-z0-9_-]{24}$/);
  const bad = response();
  await createRasilApi({ env, fetcher, store, accounts: accounts('owner@example.om') })(request('POST', { action: 'domain_connect', domain: 'gmail.com' }), bad);
  assert.deepEqual([bad.statusCode, bad.body.reason], [400, 'invalid_domain']);
});

test('Adiba’s draft uses the business’s own facts and flags a price the catalog does not have', async () => {
  const context = { business: { name: 'Dar Al Rayan' }, bzns: '# Dar Al Rayan', catalog: [{ entryKey: 'a', nameEn: 'Two-bedroom flat', nameAr: 'شقة غرفتين', prices: [{ amount: 350, currency: 'OMR', unit: 'month' }] }] };
  let prompt;
  const generate = reply => async messages => { prompt = messages; return { text: JSON.stringify(reply) }; };
  const clean = await draftEmail({ context, brief: 'new flats', lang: 'en', generate: generate({ subject: 'New flats', body: 'Hello {{name}},\n\nOur two-bedroom flat is ready.' }) });
  assert.deepEqual(clean, { subject: 'New flats', body: 'Hello {{name}},\n\nOur two-bedroom flat is ready.', untracedPrice: null });
  assert.match(prompt[0].content, /Never invent prices/);
  assert.match(prompt[1].content, /new flats/);
  const priced = await draftEmail({ context, lang: 'en', generate: generate({ subject: 'Offer', body: 'Hello {{name}}, villas from 900 OMR this week.' }) });
  assert.match(priced.untracedPrice, /900/);
  await assert.rejects(draftEmail({ context, lang: 'en', generate: generate({ subject: '', body: '' }) }), e => e.code === 'draft_failed');
});

test('the worker sends one email with the unsubscribe headers, from the owner’s domain, and records the outcome', async () => {
  const job = { jobId: 'job1', intent: 'i1', to: 'huda@example.om', name: 'Huda', subscriberId: 'sub12345', subject: 'Autumn', body: 'Hello {{name}}', lang: 'en',
    sender: { domain: 'daralrayan.om', fromName: 'Dar Al Rayan', fromLocal: 'news', replyTo: 'owner@daralrayan.om' }, business: { name: 'Dar Al Rayan', address: 'Muscat' } };
  const { calls, store } = recorder({ claim: job, result: null });
  let sent;
  const fetcher = async (url, opts) => { sent = { url, headers: opts.headers, body: JSON.parse(opts.body) }; return { status: 200, json: async () => ({ id: 'em_1' }) }; };
  assert.deepEqual(await runRasilSend({ jobId: 'job1', env, fetcher, store }), { processed: true, status: 'submitted' });
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.equal(sent.headers['Idempotency-Key'], 'rasil/job1');
  assert.deepEqual([sent.body.from, sent.body.to, sent.body.subject, sent.body.reply_to], ['"Dar Al Rayan" <news@daralrayan.om>', ['huda@example.om'], 'Autumn', 'owner@daralrayan.om']);
  assert.match(sent.body.headers['List-Unsubscribe'], /^<https:\/\/www\.bznsflowai\.com\/email\/unsubscribe\?t=sub12345\.[A-Za-z0-9_-]{32}>$/);
  assert.equal(sent.body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.match(sent.body.html, /Hello Huda/);
  assert.deepEqual(calls.at(-1), { op: 'result', args: { jobId: 'job1', intent: 'i1', status: 'submitted', providerId: 'em_1' } });
  const none = recorder({ claim: null });
  assert.deepEqual(await runRasilSend({ jobId: 'job1', env, fetcher: () => assert.fail('nothing to send'), store: none.store }), { processed: false });
});

test('the webhook applies only Resend-signed events', async () => {
  const key = Buffer.from('rasil-webhook-key-for-the-tests!');
  const hookEnv = { ...env, RESEND_WEBHOOK_SECRET: `whsec_${key.toString('base64')}` };
  const raw = JSON.stringify({ type: 'email.bounced', data: { email_id: 'em_1', bounce: { type: 'Permanent' } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', key).update(`m1.${ts}.${raw}`).digest('base64');
  const { calls, store } = recorder({ event: null });
  const hook = createRasilWebhook({ env: hookEnv, store, raw: async req => Buffer.from(req.raw) });
  const good = response();
  await hook({ method: 'POST', raw, headers: { 'svix-id': 'm1', 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` } }, good);
  assert.equal(good.statusCode, 200);
  assert.deepEqual(calls, [{ op: 'event', args: { type: 'email.bounced', providerId: 'em_1', bounceType: 'Permanent' } }]);
  const forged = response();
  await hook({ method: 'POST', raw, headers: { 'svix-id': 'm1', 'svix-timestamp': ts, 'svix-signature': 'v1,AAAA' } }, forged);
  assert.equal(forged.statusCode, 401);
  assert.equal(calls.length, 1);
});

test('unsubscribe: the link asks first, the click or the mail app’s one-click does it; a forged link does nothing', async () => {
  const { calls, store } = recorder({ unsubscribe: { business: 'Dar Al Rayan' } });
  const handler = createUnsubscribe({ env, store });
  const token = signLink(env, 'unsubscribe', 'sub12345');
  const url = `/email/unsubscribe?t=${token}`;
  const ask = response();
  await handler({ method: 'GET', url, headers: {} }, ask);
  assert.equal(ask.statusCode, 200);
  assert.match(ask.raw, /<form method="post"/);
  assert.equal(calls.length, 0, 'opening the link (or a scanner) unsubscribes nobody');
  const done = response();
  await handler({ method: 'POST', url, headers: {}, body: 'List-Unsubscribe=One-Click' }, done);
  assert.equal(done.statusCode, 200);
  assert.match(done.raw, /from Dar Al Rayan/);
  assert.deepEqual(calls, [{ op: 'unsubscribe', args: { subscriberId: 'sub12345' } }]);
  const forged = response();
  await handler({ method: 'POST', url: `/email/unsubscribe?t=sub99999.${token.split('.')[1]}`, headers: {} }, forged);
  assert.equal(forged.statusCode, 400);
  assert.equal(calls.length, 1);
});

test('the website form asks Convex, emails a confirmation from the owner’s domain, and answers the same either way', async () => {
  const known = { send: false, subscriberId: 'sub12345', email: 'n@example.om', name: '', lang: 'ar', business: { name: 'Dar Al Rayan', address: '' }, sender: { domain: 'daralrayan.om', fromName: 'Dar Al Rayan', fromLocal: 'news' } };
  let answer = { ...known, send: true };
  const { calls, store } = recorder({ subscribe_request: () => answer });
  const sent = [];
  const fetcher = async (url, opts) => { sent.push(JSON.parse(opts.body)); return { status: 200, json: async () => ({ id: 'em_c' }) }; };
  const handler = createSubscribe({ env, fetcher, store });
  const form = body => ({ method: 'POST', url: '/email/subscribe', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const first = response();
  await handler(form({ k: 'k'.repeat(24), email: 'n@example.om', name: 'Nasser', lang: 'ar' }), first);
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, '"Dar Al Rayan" <news@daralrayan.om>');
  assert.match(sent[0].html, /\/email\/confirm\?t=sub12345\./);
  answer = known;
  const second = response();
  await handler(form({ k: 'k'.repeat(24), email: 'n@example.om', lang: 'ar' }), second);
  assert.deepEqual([second.statusCode, second.raw], [first.statusCode, first.raw], 'a known address gets the same page');
  assert.equal(sent.length, 1, 'and no second email');
  const bot = response();
  await handler(form({ k: 'k'.repeat(24), email: 'n@example.om', website: 'spam.example' }), bot);
  assert.equal(calls.length, 2, 'the hidden field stops a bot before Convex');
  const bad = response();
  await handler({ method: 'POST', url: '/email/subscribe', headers: { 'content-type': 'application/json' }, body: { k: 'k'.repeat(24), email: 'nope' } }, bad);
  assert.deepEqual([bad.statusCode, bad.body.reason], [400, 'invalid_email']);
});

test('confirming a sign-up takes a click on the page, not just opening the link', async () => {
  const { calls, store } = recorder({ subscribe_confirm: { status: 'subscribed', business: 'Dar Al Rayan' } });
  const handler = createConfirm({ env, store });
  const url = `/email/confirm?t=${signLink(env, 'confirm', 'sub12345')}`;
  const ask = response();
  await handler({ method: 'GET', url, headers: {} }, ask);
  assert.equal(calls.length, 0);
  const done = response();
  await handler({ method: 'POST', url, headers: {} }, done);
  assert.match(done.raw, /You are subscribed/);
  const wrong = response();
  await handler({ method: 'POST', url: `/email/confirm?t=${signLink(env, 'unsubscribe', 'sub12345')}`, headers: {} }, wrong);
  assert.equal(wrong.statusCode, 400, 'an unsubscribe link cannot confirm');
  const missing = recorder({ unsubscribe: new PilotError('subscriber_not_found', 409) });
  const gone = response();
  await createUnsubscribe({ env, store: missing.store })({ method: 'POST', url: `/email/unsubscribe?t=${signLink(env, 'unsubscribe', 'sub12345')}`, headers: {} }, gone);
  assert.equal(gone.statusCode, 200, 'a deleted subscriber still sees that they are off the list');
});
