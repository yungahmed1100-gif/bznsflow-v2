// Characterisation of every route in convex/http.ts, the only door from the
// Vercel functions into Convex. Each route is driven through the same scenarios
// and everything observable (status, headers, body, the function it calls with
// which arguments, log lines) is compared with tests/fixtures/convex-http-golden.json.
//
// The golden file is today's behaviour, recorded before the routes were folded
// into a shared factory. A difference is a behaviour change: make it on purpose,
// then re-record with `UPDATE_GOLDEN=1 node --test tests/convex-http.test.mjs`
// and review the fixture diff.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { call, loadRoutes } from './helpers/convex-http-harness.mjs';

const GOLDEN = new URL('./fixtures/convex-http-golden.json', import.meta.url);
const SESSION = 'a'.repeat(64);
// Every size limit used by a route; each is probed at the limit and one past it.
const LIMITS = [4000, 5000, 8000, 16000, 20000, 65536, 131072, 262144, 450000, 700000, 850000];

/** A JSON body of exactly `length` characters. */
function sized(length, fields = { sessionHash: SESSION, operation: 'probe' }) {
  const json = JSON.stringify(fields);
  return `${json.slice(0, -1)}${' '.repeat(Math.max(0, length - json.length))}}`;
}

const SCENARIOS = {
  'no token': { auth: '' },
  'wrong token': { auth: `Bearer ${'0'.repeat(64)}` },
  'bad JSON': { body: '{' },
  'JSON null': { body: 'null' },
  'no session': { body: JSON.stringify({ operation: 'probe' }) },
  'malformed session': { body: JSON.stringify({ sessionHash: 'bad', operation: 'probe' }) },
  success: { body: JSON.stringify({ sessionHash: SESSION, operation: 'probe', photoCheck: 'x', fileCheck: 'x' }) },
  'function throws': { body: JSON.stringify({ sessionHash: SESSION, operation: 'probe' }), outcome: 'throw' },
  'photo register': { body: JSON.stringify({ sessionHash: SESSION, operation: 'photo_register', storageId: 's1' }) },
  'file register (document)': {
    body: JSON.stringify({ sessionHash: SESSION, operation: 'file_register', kind: 'doc_id', storageId: 's1' }),
  },
  'file register (image)': {
    body: JSON.stringify({ sessionHash: SESSION, operation: 'file_register', kind: 'logo', storageId: 's1' }),
  },
  'migration import': {
    body: JSON.stringify({ operation: 'import', rows: [] }),
    env: { GREEN_MIGRATION_ENABLED: 'true' },
  },
  'migration verify': {
    body: JSON.stringify({ operation: 'verify', expected: { a: 1 } }),
    env: { GREEN_MIGRATION_ENABLED: 'true' },
  },
  'migration other': { body: JSON.stringify({ operation: 'x' }), env: { GREEN_MIGRATION_ENABLED: 'true' } },
  // 3,000 Arabic letters: under a 4,000-character limit, but 6,000+ bytes.
  'multibyte body': { body: JSON.stringify({ sessionHash: SESSION, operation: 'probe', text: 'ع'.repeat(3000) }) },
};

async function characterise() {
  const routes = await loadRoutes();
  const out = {};
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    out[key] = {};
    for (const [name, scenario] of Object.entries(SCENARIOS)) out[key][name] = await call(route, scenario);
    out[key].sizes = {};
    for (const limit of LIMITS)
      for (const length of [limit, limit + 1])
        out[key].sizes[length] = (await call(route, { body: sized(length) })).status;
  }
  return out;
}

test('every Convex HTTP route behaves as recorded', async () => {
  const actual = await characterise();
  assert.equal(Object.keys(actual).length, 24, 'routes registered');
  if (process.env.UPDATE_GOLDEN === '1') writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 2)}\n`);
  assert.deepEqual(actual, JSON.parse(readFileSync(GOLDEN, 'utf8')));
});

test('/mcp-internal answers 200 with ok:false, which the MCP store relies on', async () => {
  const route = (await loadRoutes()).find(r => r.path === '/mcp-internal');
  const failed = await call(route, { body: '{}', outcome: 'throw' });
  assert.equal(failed.status, 200);
  assert.deepEqual(JSON.parse(failed.body), { ok: false, reason: 'probe_reason' });
});

test.todo('size limits count bytes, not characters (Arabic bodies can exceed a limit by 2x today)');
