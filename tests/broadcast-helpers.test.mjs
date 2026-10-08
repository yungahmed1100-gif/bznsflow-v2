import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTemplate, renderTemplate, resolveParameters } from '../config/layla-templates.js';
import { buildImportPreview, guessMapping } from '../src/lib/dashboard/import.js';
import { applyColumns, cellValue, defaultRules, guessVariableColumns, mergeRows, recipientValues, rowFromContact, rowMissing, rowParameters, rowsFromSheet, serverMapping } from '../src/lib/dashboard/broadcast.js';

const positional = sanitizeTemplate({ id: '1', name: 'offer', language: 'en', status: 'APPROVED', category: 'MARKETING', components: [
  { type: 'BODY', text: 'Hello {{1}}, your {{2}} is ready until {{3}}.', example: { body_text: [['Sara', 'voucher', 'Friday']] } }] });
const named = sanitizeTemplate({ id: '2', name: 'named', language: 'ar', status: 'APPROVED', category: 'MARKETING', parameter_format: 'NAMED', components: [
  { type: 'BODY', text: 'مرحبا {{first_name}}، خصمك {{discount}}', example: { body_text_named_params: [{ param_name: 'first_name', example: 'سارة' }, { param_name: 'discount', example: '10%' }] } }] });

test('variable columns are matched by number, braces, component, named key or example', () => {
  assert.deepEqual(guessVariableColumns(['phone', 'name', '{{2}}', 'body_3'], positional), { 'body:2': 2, 'body:3': 3 });
  assert.deepEqual(guessVariableColumns(['رقم', 'First Name', 'Discount'], named), { 'body:first_name': 1, 'body:discount': 2 });
  assert.deepEqual(guessVariableColumns(['phone', 'Voucher'], positional), { 'body:2': 1 }, 'the template example also matches');
});

test('default rules use the customer name for {{1}} and typing for the rest, then take over matched columns', () => {
  const rules = defaultRules(positional);
  assert.deepEqual(rules.map(r => r.source), ['name', 'each', 'each']);
  assert.deepEqual(applyColumns(rules, ['phone', 'name', 'offer', '3'], positional).map(r => r.source), ['name', 'each', 'column:3']);
  assert.deepEqual(defaultRules(named).map(r => r.source), ['name', 'each'], 'a variable called *name* is the customer name');
});

test('every contact gets their own values: a typed cell wins, then the source, then the fallback', () => {
  const sheet = [['phone', 'name', 'offer', 'until'], ['+968 9123 4567', 'Aisha', 'voucher', 'Friday'], ['0501234567', 'Omar', 'gift card', ''], ['+968 9123 4567', 'Dup', 'x', 'y']];
  const preview = buildImportPreview(sheet, guessMapping(sheet[0], []), 'AE', []);
  assert.equal(preview.duplicates, 1);
  const rows = rowsFromSheet(sheet, preview);
  const rules = [{ key: 'body:1', source: 'name', value: '' }, { key: 'body:2', source: 'column:2', value: '' }, { key: 'body:3', source: 'column:3', value: 'this week' }];
  assert.deepEqual(rows.map(r => rules.map(rule => cellValue(r, rule))), [['Aisha', 'voucher', 'Friday'], ['Omar', 'gift card', '']]);
  assert.deepEqual(rowMissing(rows[1], rules), [], 'the fallback fills the empty date');
  const edited = { ...rows[1], edits: { 'body:2': 'VIP pass' } };
  assert.equal(renderTemplate(positional, rowParameters(edited, rules, positional)), 'Hello Omar, your VIP pass is ready until this week.');
  assert.deepEqual(rowMissing({ ...rows[1], name: '' }, rules), ['body:1']);

  // The values sent to the server resolve to exactly what the table shows.
  const withIds = [{ ...rows[0], contactId: 'c1' }, { ...edited, contactId: 'c2' }];
  const values = recipientValues(withIds, rules);
  assert.deepEqual(values, [
    { contactId: 'c1', values: [{ key: 'body:1', text: 'Aisha' }, { key: 'body:2', text: 'voucher' }, { key: 'body:3', text: 'Friday' }] },
    { contactId: 'c2', values: [{ key: 'body:1', text: 'Omar' }, { key: 'body:2', text: 'VIP pass' }] },
  ]);
  const own = new Map(values[1].values.map(v => [v.key, v.text]));
  const server = resolveParameters(positional, serverMapping(rules), {}, own);
  assert.deepEqual(server.parameters.map(p => p.text), ['Omar', 'VIP pass', 'this week']);
  assert.deepEqual(server.parameters, rowParameters(edited, rules, positional));
});

test('the same text for everyone, lead details and saved contacts', () => {
  const contact = rowFromContact({ id: 'k1', number: '96891234567', name: 'Salma', fields: [{ key: 'service', value: 'Cleaning' }] });
  const rules = [{ key: 'body:1', source: 'name', value: '' }, { key: 'body:2', source: 'field:service', value: '' }, { key: 'body:3', source: 'static', value: 'Sunday' }];
  assert.deepEqual(rowParameters(contact, rules, positional).map(p => p.text), ['Salma', 'Cleaning', 'Sunday']);
  assert.deepEqual(rowMissing(contact, [{ key: 'body:3', source: 'static', value: ' ' }]), ['body:3'], 'blank shared text is missing');
});

test('rows merge by number and stop at the broadcast limit', () => {
  const a = { waId: '1' }, b = { waId: '2' }, c = { waId: '3' };
  assert.deepEqual(mergeRows([a], [a, b, c], 2), { rows: [a, b], duplicates: 1, overLimit: 1 });
});
