// The compact policy table must export exactly the reviewed policy captured
// before it was rewritten (tests/fixtures/hasib-policy-golden.json), in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HASIB_POLICY } from '../config/mcp/hasib-policy.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/hasib-policy-golden.json', import.meta.url), 'utf8'));

test('the Hasib policy table exports the reviewed policy unchanged', () => {
  assert.deepEqual(HASIB_POLICY, golden);
  assert.deepEqual(Object.keys(HASIB_POLICY), Object.keys(golden), 'operation order is unchanged');
});
