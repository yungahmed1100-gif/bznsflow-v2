// Cross-file contracts.
//
// Every check here guards a value that is correct in one file and has to agree
// with another file that cannot import it. That class of bug does not show up in
// unit tests of either side, does not break the build, and does not throw at
// runtime — it just quietly does the wrong thing.
//
// This file exists because that already happened: commit d5ec7b6 renamed the
// playbook PDF and apps-script/Code.gs kept fetching the old name. The fetch
// 404'd, a try/catch swallowed it, and every lead for weeks was written to the
// sheet while silently never receiving the email. `playbook assets` below is the
// check that would have caught it on the first `npm test`.

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PLAYBOOK_PDF, PLAYBOOK_TEASER } from '../src/lib/constants.js';
import { MAX_CHARS } from '../api/_lib/guard.js';
import { CHAT_MAX_CHARS } from '../src/lib/chat.js';
import * as replies from '../api/_lib/replies.js';
import en from '../src/i18n/en.js';
import ar from '../src/i18n/ar.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); pass++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); fail++; }
};

console.log('\nplaybook assets');
t('the PDF the page offers actually exists in public/', () => {
  assert.ok(
    existsSync(join(root, 'public', PLAYBOOK_PDF)),
    `public${PLAYBOOK_PDF} is missing — the download link is dead`,
  );
});
t('the teaser the email uses as its body exists in public/', () => {
  // Referenced extensionless because Vercel's cleanUrls redirects .html.
  assert.ok(
    existsSync(join(root, 'public', `${PLAYBOOK_TEASER}.html`)),
    `public${PLAYBOOK_TEASER}.html is missing — the playbook email has no body`,
  );
});
t('api/lead.js emails the same PDF the page offers', () => {
  // api/lead.js cannot import from src/lib at the top of a bundled function
  // without dragging the module graph in, so it holds its own copy. This is what
  // keeps the two honest.
  const lead = read('api/lead.js');
  assert.ok(
    lead.includes(`'${PLAYBOOK_PDF}'`),
    `api/lead.js does not reference ${PLAYBOOK_PDF} — the email would attach a different file`,
  );
  assert.ok(
    lead.includes(`'${PLAYBOOK_TEASER}'`),
    `api/lead.js does not reference ${PLAYBOOK_TEASER}`,
  );
});
t('the Apps Script fallback URL points at a file that exists', () => {
  // Code.gs takes the URLs from /api/lead now, but keeps constants as a
  // fallback. A stale fallback is exactly what broke this before.
  const gs = read('apps-script/Code.gs');
  const m = gs.match(/var PLAYBOOK_URL\s*=\s*'([^']+)'/);
  assert.ok(m, 'PLAYBOOK_URL not found in Code.gs');
  const path = m[1].replace(/^https?:\/\/[^/]+/, '');
  assert.equal(path, PLAYBOOK_PDF, 'Code.gs fallback disagrees with src/lib/constants.js');
});

console.log('\ncanned chat replies');
t('every replies.* referenced in api/ resolves to a non-empty string', () => {
  // A typo yields `undefined` as the visitor-facing reply text, which is the
  // exact failure replies.js warns about in its own header.
  const sources = ['api/chat.js', 'api/_lib/guard.js'].map(read).join('\n');
  const referenced = [...sources.matchAll(/\breplies\.([A-Z_][A-Z0-9_]*)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, 'found no replies.* references — did the regex break?');

  for (const key of new Set(referenced)) {
    assert.equal(typeof replies[key], 'string', `replies.${key} is not a string`);
    assert.ok(replies[key].length > 0, `replies.${key} is empty`);
  }
});

console.log('\ntranslations');
t('en and ar carry exactly the same keys', () => {
  // A key present in one language renders as `undefined` in the other — visible
  // to the visitor, invisible to the build.
  const onlyEn = Object.keys(en).filter((k) => !(k in ar));
  const onlyAr = Object.keys(ar).filter((k) => !(k in en));
  assert.deepEqual(onlyEn, [], `missing from ar.js: ${onlyEn.join(', ')}`);
  assert.deepEqual(onlyAr, [], `missing from en.js: ${onlyAr.join(', ')}`);
});
t('no translation value is empty', () => {
  for (const [k, v] of Object.entries({ ...en, ...ar })) {
    assert.ok(String(v).trim().length > 0, `empty translation: ${k}`);
  }
});

console.log('\nclient/server limits');
t('the chat character cap matches on both sides', () => {
  // src/lib/chat.js truncates before sending; api/_lib/guard.js rejects on
  // receipt. If the client's cap is the larger of the two, a visitor can type a
  // message the page accepts and the server silently refuses.
  //
  // Both values are imported rather than read out of the source, so this keeps
  // working however either side chooses to express the number.
  assert.equal(CHAT_MAX_CHARS, MAX_CHARS, 'client and server disagree on the message cap');
});

console.log('\nroutes and the sitemap');
t('/signin is noindex and absent from the sitemap', () => {
  const manifest = read('src/routes-manifest.js');
  assert.ok(!manifest.includes('signin'), '/signin must stay out of PAGES');
  assert.ok(read('src/pages/SignIn.jsx').includes('noindex'), 'SignIn must render <Seo noindex>');
});

console.log(`\n${fail ? '✗' : '✓'} contracts: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
