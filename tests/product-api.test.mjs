import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../api/layla-meta.js';
import { GREEN_CLOUD, GREEN_SITE, GREEN_SECRET } from './helpers/green-env.mjs';

const ORIGIN = 'https://www.bznsflowai.com';
const env = { PUBLIC_SITE_ORIGIN: ORIGIN, CONVEX_CLOUD_URL: GREEN_CLOUD, CONVEX_SITE_URL: GREEN_SITE, CONVEX_SERVICE_SECRET: GREEN_SECRET };
const SESSION = 'a1'.repeat(32);

function convex(reply) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    assert.equal(init.headers.Authorization, `Bearer ${GREEN_SECRET}`);
    assert.match(url, /\/(product-setup|knowledge-sources)$/);
    if (reply instanceof Error) throw reply;
    return { ok: true, json: async () => reply };
  };
  return { fetcher, calls };
}
async function call(fetcher, req) {
  const headers = {};
  const res = { status(c) { this.code = c; }, setHeader(k, v) { headers[k] = v; }, getHeader: k => headers[k], end(v) { this.body = v ? JSON.parse(v) : undefined; } };
  await createHandler({ env, fetcher })(req, res);
  return res;
}
const get = (surface, query, extra = {}) => ({ method: 'GET', url: `/api/layla-meta?surface=${surface}${query}`, query: { surface, ...Object.fromEntries(new URLSearchParams(query)) }, headers: { host: 'www.bznsflowai.com', ...extra.headers } });
const post = (surface, body, headers = {}) => ({ method: 'POST', url: `/api/layla-meta?surface=${surface}`, query: { surface }, body,
  headers: { host: 'www.bznsflowai.com', origin: ORIGIN, cookie: `bf_session=${SESSION}; bf_csrf=tok`, 'x-csrf-token': 'tok', ...headers } });
const signed = { cookie: `bf_session=${SESSION}` };
const save = { product: 'catalyst', step: 1, version: 0, requestId: 'req-12345678' };
const ok = { ok: true, value: { version: 1 } };

test('product setup: boundary checks', async () => {
  const { fetcher, calls } = convex(ok);
  assert.equal((await call(fetcher, get('product-setup', '&product=catalyst'))).code, 401);
  const wrongHost = await call(fetcher, get('product-setup', '&product=catalyst', { headers: { host: 'evil.example', ...signed } }));
  assert.deepEqual([wrongHost.code, wrongHost.body.reason], [403, 'origin']);
  assert.equal((await call(fetcher, post('product-setup', save, { origin: 'https://evil.example' }))).code, 403);
  assert.equal((await call(fetcher, post('product-setup', save, { 'x-csrf-token': 'bad' }))).body.reason, 'csrf');
  assert.equal((await call(fetcher, get('product-setup', '&product=bogus'))).code, 400);
  assert.equal((await call(fetcher, post('product-setup', { ...save, step: 4 }))).code, 400);
  assert.equal((await call(fetcher, post('product-setup', { ...save, vat: { registered: true, rateBps: 5, pricesIncludeVat: true, vatin: 'ab' } }))).code, 400);
  assert.equal((await call(fetcher, { ...get('product-setup', '&product=catalyst'), headers: { host: 'www.bznsflowai.com', cookie: 'bf_session=short' } })).code, 401);
  assert.equal(calls.length, 0);
});

test('product setup: Convex reasons map to statuses', async () => {
  for (const [reason, status] of [['access_required', 403], ['manager_required', 403], ['setup_conflict', 409], ['sign_in_required', 401], ['invalid_vat', 400]]) {
    const res = await call(convex({ ok: false, reason }).fetcher, get('product-setup', '&product=ascend', { headers: signed }));
    assert.deepEqual([res.code, res.body.reason], [status, reason]);
  }
  const down = await call(convex(new Error('boom')).fetcher, get('product-setup', '&product=ascend', { headers: signed }));
  assert.deepEqual([down.code, down.body.reason], [503, 'setup_unavailable']);
});

test('product setup: success forwards only the cookie identity and sets a csrf token', async () => {
  const { fetcher, calls } = convex(ok);
  const res = await call(fetcher, post('product-setup', { ...save, sessionHash: 'forged' }));
  assert.equal(res.code, 200);
  assert.ok(res.body.csrfToken);
  assert.equal(calls[0].body.operation, 'save');
  assert.notEqual(calls[0].body.sessionHash, 'forged');
  assert.equal('completed' in calls[0].body, false);
  const read = await call(fetcher, get('product-setup', '&product=catalyst', { headers: signed }));
  assert.equal(read.code, 200);
  assert.equal(calls[1].body.operation, 'get');
  assert.equal(calls[1].body.product, 'catalyst');
});

test('knowledge: boundary checks and success', async () => {
  const { fetcher, calls } = convex({ ok: true, value: { sources: [] } });
  assert.equal((await call(fetcher, post('knowledge', { operation: 'nope' }))).body.reason, 'invalid_operation');
  assert.equal((await call(fetcher, get('knowledge', ''))).code, 401);
  assert.equal((await call(fetcher, post('knowledge', { operation: 'list' }, { origin: 'https://evil.example' }))).code, 403);
  assert.equal((await call(fetcher, post('knowledge', { operation: 'list' }, { 'x-csrf-token': 'bad' }))).code, 403);
  assert.equal((await call(fetcher, post('knowledge', { operation: 'list', text: 'x'.repeat(450001) }))).code, 413);
  assert.equal(calls.length, 0);
  const res = await call(fetcher, get('knowledge', '', { headers: signed }));
  assert.equal(res.code, 200);
  assert.equal(calls[0].body.operation, 'list');
  assert.equal((await call(convex({ ok: false, reason: 'manager_required' }).fetcher, get('knowledge', '', { headers: signed }))).code, 403);
});
