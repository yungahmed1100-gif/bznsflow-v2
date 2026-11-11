// Source files stay under 800 lines, so a module is split while it is still easy to split.
// Generated files are exempt. The one older file over the limit is capped where it is:
// it may shrink, never grow, until it is split.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const LIMIT = 800;
const CAPPED = { 'config/mcp/hasib-policy.js': 1311 };
const GENERATED = [/(^|\/)_generated\//, /\.generated\./, /^config\/mcp\/hasib-contracts\.js$/];

// A directory walk, not `git ls-files`: the release check also runs on a `git archive` copy.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : walk(path);
  return [path];
});
const tracked = ['api', 'src', 'convex', 'config']
  .flatMap(walk)
  .filter((f) => /\.(js|jsx|ts|tsx|mjs|css)$/.test(f) && !GENERATED.some((re) => re.test(f)));

const lines = (file) => readFileSync(file, 'utf8').split('\n').length - 1;

test(`source files stay within ${LIMIT} lines`, () => {
  assert.ok(tracked.length > 100, 'git lists the source tree');
  const over = tracked.filter((f) => !(f in CAPPED) && lines(f) > LIMIT).map((f) => `${f}: ${lines(f)}`);
  assert.deepEqual(over, [], 'split these modules');
});

test('a capped file never grows past its cap', () => {
  for (const [file, cap] of Object.entries(CAPPED)) {
    assert.ok(lines(file) <= cap, `${file} grew to ${lines(file)} lines (cap ${cap}); split it instead`);
  }
});
