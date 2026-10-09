import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTemplate } from '../config/layla-templates.js';
import { buildImportPreview, guessMapping } from '../src/lib/dashboard/import.js';
import { parseDelimited } from '../src/lib/dashboard/csv.js';
import { defaultRules, applyColumns, rowsFromSheet, cellValue } from '../src/lib/dashboard/broadcast.js';

// Same shape as a Google Maps export: two countries, codes without "+", a country column
// with short names, a number type column, and wa.me links. Numbers are made up.
const CSV = `Company,Country,City,Category,Phone (E.164),WhatsApp Link,Number Type,Rating
مكتب انوار نجد للخدمات العقارية,KSA,Riyadh,Property management company,966500000001,https://wa.me/966500000001,Mobile,4.7
Sahli Real Estate Office,KSA,Hafar Al Batin,Real estate agency,966530000002,https://wa.me/966530000002,Mobile,3.8
Al Ayan Real Estate Broker LLC,UAE,,Commercial real estate agency,971550000003,https://wa.me/971550000003,Mobile,4.7
Axis Real Estate Brokerage Dubai,UAE,Dubai,Real estate agency,971520000004,https://wa.me/971520000004,Mobile,5
Harbor Real Estate Broker LLC,UAE,Dubai,Real estate consultant,97140000005,,Landline,4.7
Wasalt Real Estate Services,KSA,Riyadh,Real estate agency,9668000000006,,Unified/toll-free,4.6
`;

test('a two-country list keeps each number in its own country, whatever the fallback country is', () => {
  const sheet = parseDelimited(CSV);
  const mapping = guessMapping(sheet[0]);
  assert.deepEqual([sheet[0][mapping.phone], sheet[0][mapping.name], sheet[0][mapping.country], sheet[0][mapping.type]], ['Phone (E.164)', 'Company', 'Country', 'Number Type']);
  const preview = buildImportPreview(sheet, mapping, 'OM');
  assert.deepEqual(preview.valid.map(r => [r.waId, r.countryIso]), [['966500000001', 'SA'], ['966530000002', 'SA'], ['971550000003', 'AE'], ['971520000004', 'AE']]);
  assert.equal(preview.notWhatsApp, 2, 'landline and toll-free rows are skipped');
  assert.equal(preview.invalid.length, 0);
  // With no phone column, the wa.me link is used.
  const linkOnly = buildImportPreview(sheet, { ...mapping, phone: sheet[0].indexOf('WhatsApp Link') }, 'OM');
  assert.deepEqual(linkOnly.valid.map(r => r.waId), ['966500000001', '966530000002', '971550000003', '971520000004']);
});

test('variables are matched to columns automatically, by header or by the example value', () => {
  const sheet = parseDelimited(CSV);
  const template = sanitizeTemplate({ id: '9', name: 'intro', language: 'en', status: 'APPROVED', category: 'MARKETING', components: [
    { type: 'BODY', text: 'Hello {{1}}, we help {{2}} agencies in {{3}}.', example: { body_text: [['Sara', 'Real estate agency', 'Riyadh']] } }] });
  const rules = applyColumns(defaultRules(template), sheet[0], template, sheet.slice(1));
  assert.deepEqual(rules.map(r => r.source), ['name', 'column:3', 'column:2']);
  const rows = rowsFromSheet(sheet, buildImportPreview(sheet, guessMapping(sheet[0]), 'OM'));
  assert.deepEqual(rules.map(r => cellValue(rows[0], r)), ['مكتب انوار نجد للخدمات العقارية', 'Property management company', 'Riyadh']);
  const named = sanitizeTemplate({ id: '10', name: 'named', language: 'en', status: 'APPROVED', category: 'MARKETING', parameter_format: 'NAMED', components: [
    { type: 'BODY', text: 'Hi {{company}} in {{city}}', example: { body_text_named_params: [{ param_name: 'company', example: 'X' }, { param_name: 'city', example: 'Y' }] } }] });
  assert.deepEqual(defaultRules(named, sheet[0], sheet.slice(1)).map(r => r.source), ['column:0', 'column:2'], 'named parameters match their header');
});
