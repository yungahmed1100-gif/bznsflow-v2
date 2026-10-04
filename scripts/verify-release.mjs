import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const tests = readdirSync('tests').filter(name => name.endsWith('.test.mjs')).sort().map(name => `tests/${name}`);
const checks = [
  ['node', ['--test', ...tests]],
  ['npm', ['run', 'typecheck:convex']],
  ['npm', ['run', 'build']],
  ['npm', ['audit', '--audit-level=moderate']],
  ['node', ['scripts/run-browser-tests.mjs']],
  ['node', ['scripts/test-demo-browser.mjs', 'catalyst']],
  ['node', ['tests/retail-browser.mjs']],
  ['node', ['tests/retail-tech-browser.mjs']],
  ['node', ['scripts/test-demo-browser.mjs', 'dental']],
  ['node', ['tests/real-estate-browser.mjs']],
  ['node', ['tests/hasib-industries-browser.mjs', 'construction', 'automotive']],
];
for (const [command, args] of checks) {
  console.log(`Release check: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Local release verification passed. Migration and live integration evidence are separate production gates.');
