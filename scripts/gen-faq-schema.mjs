// Regenerates the FAQPage JSON-LD in index.html from the canonical English
// translation strings (src/i18n/en.js), so the on-page FAQ and the structured
// data can never drift. Run: `npm run gen:faq`.
//
// It rewrites only the content between the FAQ:BEGIN and FAQ:END markers, so the
// rest of index.html is never touched.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const { default: en } = await import(resolve(root, 'src/i18n/en.js'));

const faq = [];
for (let i = 1; i <= 6; i++) {
  const q = (en[`faq_q${i}`] || '').trim();
  const a = (en[`faq_a${i}`] || '').trim().replace(/<[^>]+>/g, '');
  if (q && a) {
    faq.push({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    });
  }
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq,
};

// Indent the JSON to match the surrounding 4-space block.
const json = JSON.stringify(schema, null, 2)
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n');

const begin = '<!-- FAQ:BEGIN';
const end = '<!-- FAQ:END -->';

const htmlPath = resolve(root, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const beginIdx = html.indexOf(begin);
const endIdx = html.indexOf(end);
if (beginIdx === -1 || endIdx === -1) {
  console.error('FAQ markers not found in index.html. Aborting.');
  process.exit(1);
}

const beginLineEnd = html.indexOf('\n', beginIdx) + 1;
const block =
  '    <script type="application/ld+json">\n' +
  json +
  '\n    </script>\n    ';

html = html.slice(0, beginLineEnd) + block + html.slice(endIdx);
writeFileSync(htmlPath, html);
console.log(`FAQ schema regenerated with ${faq.length} questions.`);
