// One-off codemod (November 2026): rewrite config/mcp/hasib-policy.js from one
// four-line object per operation to one row per operation. Re-run to reproduce
// the commit; tests/hasib-policy.test.mjs proves the exported data is unchanged.
import { writeFileSync } from 'node:fs';
import { HASIB_POLICY } from '../../config/mcp/hasib-policy.js';

const q = value => `'${value}'`;
const row = ({ category, disposition, categories }) =>
  `[${[q(category), q(disposition), ...(categories ? [`[${categories.map(q).join(', ')}]`] : [])].join(', ')}]`;

const body = Object.entries(HASIB_POLICY)
  .map(([operation, policy]) => `  ${operation}: ${row(policy)},`)
  .join('\n');

writeFileSync(
  new URL('../../config/mcp/hasib-policy.js', import.meta.url),
  `// Explicit reviewed execution policy for every current Hasib operation.
// One row per operation: [category, disposition, categories?]
//   category     what the operation does (read, edit, finance, messages, bulk, team, publish)
//   disposition  'tool' (offered to assistants), 'unavailable' or 'handoff'
//   categories   every approval category it touches, when more than one
const ROWS = {
${body}
};

export const HASIB_POLICY = Object.fromEntries(
  Object.entries(ROWS).map(([operation, [category, disposition, categories]]) => [
    operation,
    categories ? { category, disposition, categories } : { category, disposition },
  ]),
);
`,
);
