import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { validateSigningKeys } from '../scripts/lib/mcp-health.js';

const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-health', alg: 'RS256', use: 'sig' };
test('MCP health accepts an importable public signing key', () => {
  assert.equal(validateSigningKeys({ keys: [key] }), 1);
});
test('MCP health refuses unusable, private or inappropriate signing keys', () => {
  for (const keys of [
    [],
    [{}],
    [{ ...key, n: undefined }],
    [{ ...key, n: 'bad' }],
    [{ ...key, kid: '' }],
    [{ ...key, d: 'private' }],
    [{ ...key, use: 'enc' }],
    [{ ...key, key_ops: ['encrypt'] }],
  ]) {
    assert.throws(() => validateSigningKeys({ keys }));
  }
});
