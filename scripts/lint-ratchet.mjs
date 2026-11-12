// Lint ratchet: findings may only go down.
//
//   npm run lint          check against tests/lint-baseline.json
//   npm run lint:update   record the current (lower) counts after fixing some
//
// Existing findings are recorded per file and rule. A new finding, or a count
// above its baseline, fails. A count below its baseline also fails until the
// baseline is updated, so an improvement is locked in instead of silently
// leaving room for a regression elsewhere in the same file.
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { ESLint } from 'eslint';

const BASELINE = 'tests/lint-baseline.json';
const update = process.argv.includes('--update');

const results = await new ESLint().lintFiles(['.']);
const fatal = results.flatMap(r => r.messages.filter(m => m.fatal).map(m => `${relative('.', r.filePath)}: ${m.message}`));
if (fatal.length) {
  console.error(`Lint could not parse:\n${fatal.join('\n')}`);
  process.exit(1);
}

/** { file: { rule: count } } with keys sorted, so the baseline diffs cleanly. */
function countFindings() {
  const counts = {};
  for (const result of results) {
    const file = relative('.', result.filePath);
    for (const { ruleId } of result.messages) {
      counts[file] ??= {};
      counts[file][ruleId] = (counts[file][ruleId] || 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.keys(counts)
      .sort()
      .map(file => [file, Object.fromEntries(Object.entries(counts[file]).sort(([a], [b]) => a.localeCompare(b)))]),
  );
}

const current = countFindings();
const total = counts => Object.values(counts).reduce((sum, rules) => sum + Object.values(rules).reduce((a, b) => a + b, 0), 0);

if (update) {
  writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Recorded ${total(current)} findings in ${BASELINE}.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const worse = [];
const better = [];
for (const file of new Set([...Object.keys(current), ...Object.keys(baseline)])) {
  for (const rule of new Set([...Object.keys(current[file] || {}), ...Object.keys(baseline[file] || {})])) {
    const now = current[file]?.[rule] || 0;
    const was = baseline[file]?.[rule] || 0;
    if (now > was) worse.push(`${file}: ${rule} ${was} → ${now}`);
    if (now < was) better.push(`${file}: ${rule} ${was} → ${now}`);
  }
}

if (worse.length) {
  const detail = results.flatMap(r =>
    r.messages
      .filter(m => worse.some(w => w.startsWith(`${relative('.', r.filePath)}: ${m.ruleId} `)))
      .map(m => `  ${relative('.', r.filePath)}:${m.line}:${m.column} ${m.ruleId} ${m.message}`),
  );
  console.error(`New lint findings:\n${worse.join('\n')}\n\n${detail.join('\n')}`);
  process.exit(1);
}
if (better.length) {
  console.error(`Fewer findings than recorded — lock it in with \`npm run lint:update\`:\n${better.join('\n')}`);
  process.exit(1);
}
console.log(`Lint: ${total(current)} recorded findings, none new.`);
