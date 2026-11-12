import assert from 'node:assert/strict';
import { createPublicKey } from 'node:crypto';

export function validateSigningKeys(value) {
  assert.ok(Array.isArray(value?.keys) && value.keys.length > 0, 'No public signing keys');
  assert.ok(
    value.keys.every(
      key =>
        key &&
        typeof key === 'object' &&
        !['d', 'p', 'q', 'dp', 'dq', 'qi', 'k'].some(field => Object.hasOwn(key, field)),
    ),
    'JWKS must contain only public keys',
  );
  const signing = value.keys.filter(
    key => key.kty === 'RSA' && (!key.use || key.use === 'sig') && (!key.alg || key.alg === 'RS256'),
  );
  assert.ok(signing.length > 0, 'No supported RS256 signing key');
  for (const key of signing) {
    assert.ok(typeof key.kid === 'string' && key.kid.length > 0, 'Signing key is missing its identifier');
    assert.ok(typeof key.n === 'string' && typeof key.e === 'string', 'Signing key is missing public material');
    assert.ok(!key.key_ops || key.key_ops.includes('verify'), 'Signing key does not allow verification');
    const imported = createPublicKey({ key, format: 'jwk' });
    assert.equal(imported.asymmetricKeyType, 'rsa');
    assert.ok(imported.asymmetricKeyDetails.modulusLength >= 2048, 'RSA signing key must have at least 2048 bits');
  }
  return signing.length;
}
