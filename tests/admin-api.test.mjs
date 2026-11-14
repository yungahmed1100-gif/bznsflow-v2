// The admin pages (Access, Apex requests, Websites) share one loader. Until
// 14 Nov 2026 each read its lists unchecked: an answer without `requests` threw
// after the data was stored, and the Apex page crashed rendering it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminList } from '../src/lib/admin-api.js';

const CSRF = 'c'.repeat(64);
function stubFetch(answers) {
  const seen = [];
  globalThis.fetch = async url => {
    seen.push(String(url));
    const answer = answers[String(url)];
    if (answer instanceof Error) throw answer;
    const { status = 200, body } = answer;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return seen;
}
const signedIn = { status: 200, body: { ok: true, csrfToken: CSRF, account: { email: 'owner@example.com' } } };

test('a missing or malformed list arrives as an empty list', async () => {
  stubFetch({
    '/api/auth-session': signedIn,
    '/api/access-admin?op=apex': { body: { ok: true, requests: 'not a list' } },
  });
  const result = await loadAdminList('apex', ['requests', 'archived']);
  assert.equal(result.state, 'ready');
  assert.equal(result.csrf, CSRF);
  assert.deepEqual(result.data.requests, []);
  assert.deepEqual(result.data.archived, []);
});

test('lists that arrive are kept, with the other fields', async () => {
  stubFetch({
    '/api/auth-session': signedIn,
    '/api/access-admin?op=websites': { body: { ok: true, open: [{ id: 1 }], live: [{ id: 2 }], total: 2 } },
  });
  const { data } = await loadAdminList('websites', ['open', 'live']);
  assert.deepEqual(data, { ok: true, open: [{ id: 1 }], live: [{ id: 2 }], total: 2 });
});

test('the access list is the endpoint without an op', async () => {
  const seen = stubFetch({
    '/api/auth-session': signedIn,
    '/api/access-admin': { body: { ok: true, grants: [] } },
  });
  assert.equal((await loadAdminList('', ['grants', 'revoked'])).state, 'ready');
  assert.deepEqual(seen, ['/api/auth-session', '/api/access-admin']);
});

test('signed out stops before asking for the list', async () => {
  const seen = stubFetch({ '/api/auth-session': { body: { ok: true, csrfToken: CSRF, account: null } } });
  assert.deepEqual(await loadAdminList('apex', ['requests']), { state: 'signed_out', csrf: CSRF });
  assert.deepEqual(seen, ['/api/auth-session']);
});

test('a non-administrator is told so; other refusals and network failures are failures', async () => {
  stubFetch({
    '/api/auth-session': signedIn,
    '/api/access-admin?op=apex': { status: 403, body: { ok: false, reason: 'admin_required' } },
  });
  assert.equal((await loadAdminList('apex', ['requests'])).state, 'denied');
  stubFetch({
    '/api/auth-session': signedIn,
    '/api/access-admin?op=apex': { status: 500, body: { ok: false, reason: 'core_unavailable' } },
  });
  assert.equal((await loadAdminList('apex', ['requests'])).state, 'failed');
  stubFetch({ '/api/auth-session': new TypeError('offline') });
  assert.deepEqual(await loadAdminList('apex', ['requests']), { state: 'failed', csrf: '' });
});
