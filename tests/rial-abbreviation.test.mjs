// "ر.ع" (Omani rial) written without its dot is the two letters رع, which also end common words: شارع
// (street) is the one Omani addresses use with a number, as in "شارع 18 نوفمبر". Every price check must
// read the abbreviation only when it stands alone, or a street address is taken for a price.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBzns } from '../src/lib/bzns-doc.js';
import { extractCatalogRows } from '../src/lib/catalog-import.js';
import { textToStockRows } from '../src/lib/hasib/stockImport.js';
import { validateBehaviour } from '../config/layla-behaviour.js';
import { writtenCurrency, verifyProposals } from '../config/brain-extract.js';
import { untracedAmount } from '../config/layla-prices.js';
import { extractCatalogFacts } from '../api/_lib/layla/website-import.js';

const ADDRESS = 'مبنى الريان، شارع 18 نوفمبر، الخوير، مسقط';
const PRICE = 'شقة غرفتين 350 ر.ع شهرياً';
const doc = location => `---\nname: دار الريان\nsector: real-estate\n---\n# دار الريان\n## خدماتنا\n- شقق للإيجار\n## الموقع\n${location}\n`;
const money = markdown => validateBzns(markdown).errors.some(e => e.code === 'bzns_money');

test('bzns.md: a street number is not a price; a rial amount still is', () => {
  assert.equal(money(doc(ADDRESS)), false);
  assert.equal(money(doc('شارع ٢٣، بوشر')), false, 'Arabic digits too');
  assert.equal(money(doc('شارع رقم 4512، الموج')), false);
  for (const priced of [PRICE, 'الإيجار ر.ع 350', 'رسوم المعاينة 5 ر ع', '350 رع', '20 OMR', 'ريال 40']) assert.equal(money(doc(priced)), true, priced);
});

test('catalog and website imports do not read an address as a price', () => {
  assert.equal(extractCatalogRows(ADDRESS).length, 0);
  assert.equal(extractCatalogRows('شقة غرفتين ر.ع 350').length, 1);
  assert.equal(extractCatalogFacts(ADDRESS).entries.length, 0);
  assert.equal(extractCatalogFacts('شقة غرفتين ر.ع 350').entries.length, 1);
});

test('Hasib stock import does not take a street number for a price', () => {
  // Rows are [name, price, quantity] after the header row.
  assert.deepEqual(textToStockRows(`مكتب ${ADDRESS}`).slice(1), []);
  assert.deepEqual(textToStockRows('قلم أزرق 2.500 ر.ع').slice(1), [['قلم أزرق', '2.500', '']]);
});

test('Layla: an address in a reply or a handoff note is not an untraced amount', () => {
  assert.equal(untracedAmount(`مكتبنا في ${ADDRESS}.`, { catalog: [] }), null);
  assert.ok(untracedAmount('الإيجار 350 ر.ع شهرياً.', { catalog: [] }), 'a real amount is still caught');
  const behaviour = note => validateBehaviour({ tone: 'informative', askName: true, appointmentPreferences: false, ask: [], handoffNote: note }, 'real-estate');
  assert.equal(behaviour(`زورونا في ${ADDRESS}`).ok, true);
  assert.equal(behaviour('رسوم المعاينة 20 ر.ع').reason, 'handoff_note_money');
});

test('BznsBrain extraction keeps an address section and still knows the rial', () => {
  assert.equal(writtenCurrency(ADDRESS), undefined);
  assert.equal(writtenCurrency(PRICE), 'OMR');
  const out = verifyProposals({ sections: [{ key: 'location', text: ADDRESS, evidence: ADDRESS }] }, ADDRESS);
  assert.equal(JSON.stringify(out).includes('price_in_section'), false, JSON.stringify(out));
});
