// Read-only public connection checks. Never registers a client or submits credentials.
import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { createHash } from 'node:crypto';
import { MCP_ICON_PATH, MCP_NAME } from '../config/mcp/identity.js';
import { validateSigningKeys } from './lib/mcp-health.js';

const base = new URL(process.argv[2] || 'https://www.bznsflowai.com');
assert.ok(
  base.protocol === 'https:' && !base.username && !base.password && base.pathname === '/' && !base.search && !base.hash,
  'Supply only a public HTTPS origin',
);
const origin = base.origin;
const checks = [];
async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, ok: true, durationMs: Date.now() - started, ...detail });
  } catch (error) {
    checks.push({ name, ok: false, durationMs: Date.now() - started, error: error.message });
  }
}
const request = (path, options = {}) =>
  fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
async function json(path, status = 200, options) {
  const response = await request(path, options);
  assert.equal(response.status, status, `${path}: HTTP ${response.status}, expected ${status}`);
  assert.match(response.headers.get('content-type') || '', /^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i);
  const raw = await response.text();
  assert.ok(raw.length <= 500000, 'Metadata exceeds the diagnostic size bound');
  return { response, value: JSON.parse(raw) };
}
await check('dns', async () => ({ addresses: await dns.lookup(base.hostname, { all: true }) }));
const aliases = [
  '/.well-known/oauth-authorization-server',
  '/oauth/.well-known/openid-configuration',
  '/.well-known/oauth-authorization-server/oauth',
  '/.well-known/openid-configuration/oauth',
];
await Promise.all([
  ...aliases.map(path =>
    check(path, async () => {
      const { response, value } = await json(path);
      assert.equal(value.issuer, `${origin}/oauth`);
      for (const [key, suffix] of [
        ['authorization_endpoint', 'auth'],
        ['token_endpoint', 'token'],
        ['registration_endpoint', 'reg'],
        ['jwks_uri', 'jwks'],
      ])
        assert.equal(value[key], `${origin}/oauth/${suffix}`);
      assert.ok(value.code_challenge_methods_supported.includes('S256'));
      assert.ok(value.grant_types_supported.includes('refresh_token'));
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      return { status: response.status, issuer: value.issuer };
    }),
  ),
  check('protected_resource', async () => {
    const { response, value } = await json('/.well-known/oauth-protected-resource/api/mcp');
    assert.equal(value.resource, `${origin}/api/mcp`);
    assert.equal(value.resource_name, MCP_NAME);
    assert.deepEqual(value.authorization_servers, [`${origin}/oauth`]);
    assert.ok(value.scopes_supported.includes('workspace:read'));
    assert.ok(value.scopes_supported.includes('workspace:write'));
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    return { status: response.status, resource: value.resource };
  }),
  check('unauthenticated_admission', async () => {
    // Clients start with a POST (initialize); that is where the OAuth challenge must appear.
    const { response } = await json('/api/mcp', 401, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'bznsflow-health', version: '1' },
        },
      }),
    });
    const challenge = response.headers.get('www-authenticate') || '';
    assert.ok(challenge.includes(`resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`));
    assert.match(challenge, /workspace:read/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    return { status: response.status };
  }),
  check('signing_keys', async () => {
    const { value } = await json('/oauth/jwks');
    return { keyCount: validateSigningKeys(value) };
  }),
  check('bznsflow_logo', async () => {
    const response = await request(MCP_ICON_PATH);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /^image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length >= 24 && bytes.length <= 1000000);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 256);
    assert.equal(bytes.readUInt32BE(20), 256);
    return {
      url: new URL(MCP_ICON_PATH, origin).href,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }),
  // A stateless MCP endpoint must refuse the optional GET stream at once; a held GET
  // ran to Vercel's 60-second limit in production on 10 November 2026.
  ...['GET', 'DELETE'].map(method =>
    check(`method:${method}`, async () => {
      const started = Date.now();
      const response = await request('/api/mcp', {
        method,
        headers: { Accept: 'text/event-stream' },
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
      return { status: response.status, ms: Date.now() - started };
    }),
  ),
  // Once Rasil is open to every Ascend account, its key must still manage customer domains.
  check('rasil_readiness', async () => {
    const { value } = await json('/api/layla-meta?surface=rasil-status');
    assert.equal(value.ok, true);
    if (value.open) assert.equal(value.domains, 'ready', `Rasil is open but domains are ${value.domains}`);
    return { open: value.open, domains: value.domains };
  }),
  ...['https://chatgpt.com', 'https://claude.ai', 'https://claude.com', 'https://untrusted.invalid'].map(from =>
    check(`cors:${from}`, async () => {
      const response = await request('/api/mcp', {
        method: 'OPTIONS',
        headers: {
          Origin: from,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type,mcp-protocol-version',
        },
      });
      const trusted = from !== 'https://untrusted.invalid';
      assert.equal(response.status, trusted ? 204 : 403);
      assert.equal(response.headers.get('access-control-allow-origin'), trusted ? from : null);
      if (trusted) {
        assert.match(response.headers.get('access-control-allow-headers') || '', /Authorization/i);
        assert.match(response.headers.get('access-control-allow-methods') || '', /POST/);
      }
      return { status: response.status };
    }),
  ),
]);
const ok = checks.every(row => row.ok);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      origin,
      ok,
      scope:
        'Public discovery, routing, identity and admission only. Authenticated client and provider delivery are not checked.',
      checks: checks.sort((a, b) => a.name.localeCompare(b.name)),
    },
    null,
    2,
  ),
);
if (!ok) process.exitCode = 1;
