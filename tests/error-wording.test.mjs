// A server reason code is a key, not a sentence. A component that keeps the raw
// code as its error must word it before showing it. Until 14 Nov 2026 the
// automotive, construction and clinic dashboards printed codes such as
// "automotive_unavailable" on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function* sources(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (/\.jsx?$/.test(name)) yield path;
  }
}

const KEEPS_RAW_CODE = /setError\(e\.reason\b|useViewData\(/;
const SHOWS_ERROR_AS_IS = /\{error\}\s*<\/(p|div|span)>/;

test('components that keep a raw reason code never show it as is', () => {
  const offenders = [];
  for (const path of sources('src')) {
    const source = readFileSync(path, 'utf8');
    if (KEEPS_RAW_CODE.test(source) && SHOWS_ERROR_AS_IS.test(source)) offenders.push(path);
  }
  assert.deepEqual(offenders, []);
});
