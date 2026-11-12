// Source files stay under 800 lines, so a module is split while it is still easy to split.
// Generated files are exempt. Older files over the limit are capped where they are:
// they may shrink, never grow, until they are split. Most were dense one-line code
// whose real size showed only once Prettier formatted it (November 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const LIMIT = 800;
const CAPPED = {
  'api/_lib/hasib/validate.js': 1237,
  'api/_lib/layla/review-api.js': 1034,
  'config/layla-qualification.js': 1214,
  'convex/blueMessagingState.js': 1286,
  'convex/hasib/automotiveState.js': 1269,
  'convex/hasib/constructionState.js': 984,
  'convex/hasib/fitnessState.js': 935,
  'convex/hasib/mediaState.js': 921,
  'convex/hasib/workflowSchema.ts': 865,
  'convex/rasilState.js': 889,
  'convex/schema.ts': 1692,
  'src/components/ascend-draft/AscendDraft.jsx': 980,
  'src/components/ascend-draft/draft.css': 1750,
  'src/components/hasib/AutomotiveDashboard.jsx': 1225,
  'src/components/hasib/ConstructionDashboard.jsx': 1338,
  'src/components/hasib/RestaurantControls.jsx': 944,
  'src/components/hasib/media/ProductionRecord.jsx': 885,
  'src/lib/dashboard/strings.js': 1270,
  'src/lib/hasib/strings.js': 1945,
  'src/styles/brain.css': 1213,
  'src/styles/hasib.css': 1908,
  'src/styles/layla-dashboard.css': 3232,
  'src/styles/layla-onboarding.css': 1325,
};
const GENERATED = [/(^|\/)_generated\//, /\.generated\./, /^config\/mcp\/hasib-contracts\.js$/];

// A directory walk, not `git ls-files`: the release check also runs on a `git archive` copy.
const walk = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name.startsWith('.') ? [] : walk(path);
    return [path];
  });
const tracked = ['api', 'src', 'convex', 'config']
  .flatMap(walk)
  .filter(f => /\.(js|jsx|ts|tsx|mjs|css)$/.test(f) && !GENERATED.some(re => re.test(f)));

const lines = file => readFileSync(file, 'utf8').split('\n').length - 1;

test(`source files stay within ${LIMIT} lines`, () => {
  assert.ok(tracked.length > 100, 'git lists the source tree');
  const over = tracked.filter(f => !(f in CAPPED) && lines(f) > LIMIT).map(f => `${f}: ${lines(f)}`);
  assert.deepEqual(over, [], 'split these modules');
});

test('a capped file never grows past its cap', () => {
  for (const [file, cap] of Object.entries(CAPPED)) {
    assert.ok(lines(file) <= cap, `${file} grew to ${lines(file)} lines (cap ${cap}); split it instead`);
  }
});
