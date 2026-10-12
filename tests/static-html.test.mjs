import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeStaticHtml } from '../scripts/static-html.mjs';

test('Arabic text and raw structured data survive prerender padding removal', () => {
  const name = 'تأهيل الاستفسارات';
  const valid = `<h1>${name}</h1><script type="application/ld+json">${JSON.stringify({ name })}</script>`;
  const padded = valid.replaceAll('تأهيل', 'تأه\0يل');
  assert.equal(normalizeStaticHtml(Buffer.from(padded)), valid);
  assert.equal(normalizeStaticHtml(Buffer.from(valid)), valid);
});

test('invalid UTF-8 and malformed JSON-LD fail the build instead of being hidden', () => {
  assert.throws(() => normalizeStaticHtml(Buffer.from([0xc3, 0x28])));
  assert.throws(() => normalizeStaticHtml(Buffer.from('<script type="application/ld+json">{"name":}</script>')));
});
