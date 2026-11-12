// Every serverless function answers before the platform stops it, and says which surface
// was slow when it cannot finish. Ten silent 60-second kills on /api/layla-meta (8–10 Nov
// 2026) had no record of the surface; this suite keeps that class of failure closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DeadlineError, deadlineFor, raceDeadline, withDeadline } from '../api/_lib/deadline.js';
import { createHandler as createLaylaMeta } from '../api/layla-meta.js';
import { processMediaJob } from '../api/_lib/layla/inbound-media.js';

const root = new URL('../', import.meta.url);
const functions = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8')).functions || {};
const entries = readdirSync(new URL('api/', root))
  .filter(f => f.endsWith('.js'))
  .map(f => `api/${f}`);

function response() {
  const res = { statusCode: 200, headers: {}, body: '', headersSent: false, writableEnded: false };
  res.setHeader = (k, v) => {
    res.headers[k.toLowerCase()] = v;
  };
  res.end = (chunk = '') => {
    res.body += chunk;
    res.writableEnded = true;
    res.headersSent = true;
    return res;
  };
  return res;
}

test('every function declares a maxDuration and exports a deadline below it', async () => {
  for (const entry of entries) {
    const max = functions[entry]?.maxDuration;
    assert.ok(Number.isInteger(max), `${entry}: set maxDuration in vercel.json`);
    const { DEADLINE_MS } = await import(new URL(entry, root).href);
    assert.equal(typeof DEADLINE_MS, 'number', `${entry}: export DEADLINE_MS (deadlineFor(maxDuration))`);
    assert.ok(
      DEADLINE_MS <= max * 1000 - 5000,
      `${entry}: deadline ${DEADLINE_MS} ms leaves under 5 s before ${max} s`,
    );
  }
  assert.deepEqual(
    Object.keys(functions).filter(f => !entries.includes(f)),
    [],
    'vercel.json lists no missing function',
  );
});

test('the budget leaves ten seconds and never drops under five', () => {
  assert.equal(deadlineFor(60), 50000);
  assert.equal(deadlineFor(30), 20000);
  assert.equal(deadlineFor(10), 5000);
});

test('a hanging handler answers 504 in time and logs its surface', async t => {
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  const res = response();
  const started = Date.now();
  await withDeadline(() => new Promise(() => {}), { ms: 30, label: 'layla-meta' })(
    { method: 'POST', url: '/api/layla-meta?surface=knowledge' },
    res,
  );
  assert.ok(Date.now() - started < 1000);
  assert.equal(res.statusCode, 504);
  assert.deepEqual(JSON.parse(res.body), { ok: false, reason: 'request_timeout' });
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(logs[0], /^request_deadline .*"label":"layla-meta".*"surface":"knowledge"/);
});

test('a handler that already started answering is ended once, not answered twice', async t => {
  t.mock.method(console, 'error', () => {});
  const res = response();
  await withDeadline(
    (req, r) => {
      r.statusCode = 200;
      r.headersSent = true;
      return new Promise(() => {});
    },
    { ms: 20, label: 'x' },
  )({ url: '/' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.writableEnded, true);
  assert.equal(res.body, '');
});

test('normal answers and ordinary errors pass through untouched', async () => {
  const res = response();
  assert.equal(
    await withDeadline(
      async (req, r) => {
        r.end('ok');
        return 'done';
      },
      { ms: 1000, label: 'x' },
    )({ url: '/' }, res),
    'done',
  );
  assert.equal(res.body, 'ok');
  await assert.rejects(
    withDeadline(
      async () => {
        throw new Error('boom');
      },
      { ms: 1000, label: 'x' },
    )({ url: '/' }, response()),
    /boom/,
  );
});

test('late work that fails after the deadline cannot crash the instance', async () => {
  let reject;
  const late = new Promise((_, r) => {
    reject = r;
  });
  await assert.rejects(raceDeadline(late, 10, 'x'), e => e instanceof DeadlineError && e.status === 504);
  reject(new Error('late failure'));
  await new Promise(r => setTimeout(r, 10));
});

test('the shared function answers a slow surface itself instead of being killed', async t => {
  t.mock.method(console, 'error', () => {});
  const handler = createLaylaMeta({ env: {}, deadlineMs: 30, surfaces: { knowledge: () => new Promise(() => {}) } });
  const res = response();
  await handler(
    { method: 'GET', url: '/api/layla-meta?surface=knowledge', query: { surface: 'knowledge' }, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 504);
});

test('a photo that cannot be read in time still reaches Layla, kept and marked', async () => {
  const job = {
    integrationId: 'int1',
    messageId: 'wamid.7',
    channel: 'instagram',
    kind: 'image',
    ref: 'https://scontent.fbcdn.net/p.jpg',
  };
  const calls = [];
  const store = async (op, args) => {
    calls.push([op, args]);
    return op === 'media_context' ? {} : op === 'media_upload_url' ? { url: 'https://upload.test/1' } : null;
  };
  const fetcher = async url =>
    new URL(url).hostname === 'upload.test'
      ? new Response(JSON.stringify({ storageId: 'kg7' }))
      : new URL(url).hostname === 'qwen.test'
        ? new Promise(() => {})
        : new Response(new Uint8Array(900), { headers: { 'content-type': 'image/jpeg' } });
  const env = { QWEN_API_KEY: 'k', QWEN_BASE_URL: 'https://qwen.test' };
  await processMediaJob(job, { store, env, fetcher, budgetMs: 50 });
  assert.deepEqual(calls.at(-1), [
    'media_attach',
    {
      integrationId: 'int1',
      attach: {
        messageId: 'wamid.7',
        storageId: 'kg7',
        mimeType: 'image/jpeg',
        size: 900,
        status: 'unread',
        error: 'media_deadline',
      },
    },
  ]);
});

test('a download that never finishes still reports back before the platform limit', async t => {
  t.mock.method(console, 'warn', () => {});
  const job = {
    integrationId: 'int1',
    messageId: 'wamid.8',
    channel: 'instagram',
    kind: 'image',
    ref: 'https://scontent.fbcdn.net/p.jpg',
  };
  const calls = [];
  const store = async (op, args) => {
    calls.push([op, args]);
    return op === 'media_context' ? {} : null;
  };
  await processMediaJob(job, { store, env: {}, fetcher: () => new Promise(() => {}), budgetMs: 30 });
  assert.deepEqual(calls.at(-1), [
    'media_attach',
    { integrationId: 'int1', attach: { messageId: 'wamid.8', status: 'failed', error: 'media_deadline' } },
  ]);
});
