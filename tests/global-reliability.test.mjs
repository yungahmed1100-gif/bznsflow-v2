import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Vercel functions run beside the Ireland Convex deployment', async () => {
  const config = JSON.parse(await read('../vercel.json'));
  assert.deepEqual(config.regions, ['dub1']);
});

test('public pages do not depend on Google Fonts at runtime', async () => {
  const [root, fonts, csp] = await Promise.all([
    read('../src/root.jsx'),
    read('../src/styles/fonts.css'),
    read('../vercel.json'),
  ]);
  assert.doesNotMatch(root, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.doesNotMatch(csp, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.match(fonts, /font-display:\s*swap/g);
  assert.match(fonts, /Poppins/);
  assert.match(fonts, /IBM Plex Sans Arabic/);
});

test('responsive team artwork keeps its intrinsic ratio and size budget', async () => {
  const component = await read('../src/components/sections/AboutSection.jsx');
  assert.match(component, /<picture>/);
  assert.match(component, /type="image\/avif"/);
  assert.match(component, /type="image\/webp"/);
  assert.match(component, /width=\{1536\}/);
  assert.match(component, /height=\{1024\}/);
  const largest = await stat(new URL('../src/assets/team-operations-meeting.webp', import.meta.url));
  assert.ok(largest.size < 250_000, `largest WebP is ${largest.size} bytes`);
});

test('reachability diagnostic exposes a read-only CLI', () => {
  const result = spawnSync(process.execPath, ['scripts/check-global-reachability.mjs', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--base/);
  assert.match(result.stdout, /--timeout/);
});

test('monitoring covers three global locations and avoids authenticated flows', async () => {
  const monitor = await read('../monitoring/global-reliability.check.ts');
  for (const location of ['eu-central-1', 'ap-southeast-1', 'us-east-1']) assert.match(monitor, new RegExp(location));
  assert.match(monitor, /EVERY_5M/);
  assert.match(monitor, /EVERY_30M/);
  assert.match(monitor, /anonymous-auth-session/);
  assert.doesNotMatch(monitor, /method:\s*['"]POST['"]/);
});
