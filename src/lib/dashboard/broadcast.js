// Broadcast wizard rules: which value fills each template variable for each recipient.
// Everything resolves here, in the browser, so the table the owner checks is exactly
// what the server freezes per recipient. Nothing in this module sends a message.
import { variableId } from '../../../config/layla-templates.js';

export const MAX_BROADCAST = 100;

const norm = text => String(text ?? '').toLowerCase().replace(/[{}\s_\-:#]+/g, '');
const NAME_KEY = /name|اسم/i;

/**
 * Which file column fills each variable. A header naming the variable wins ({{2}}, body_2,
 * the named parameter, or the example); otherwise the column whose values contain the
 * template's example (e.g. example "Riyadh" is found in a City column).
 * Rule sources: 'name' | 'column:<index>' | 'field:<key>' | 'static' | 'each' (typed per contact).
 */
export function guessVariableColumns(headers = [], template, rows = []) {
  const out = {}, sample = rows.slice(0, 200);
  for (const v of template?.variables || []) {
    const wanted = new Set([norm(v.key), norm(`${v.component}${v.key}`), norm(`var${v.key}`), norm(`variable${v.key}`), ...(v.example ? [norm(v.example)] : [])].filter(Boolean));
    let index = headers.findIndex(h => wanted.has(norm(h)));
    if (index < 0 && v.example && norm(v.example)) index = headers.findIndex((_, i) => sample.some(r => norm(r[i]) === norm(v.example)));
    if (index >= 0) out[variableId(v)] = index;
  }
  return out;
}

/** One rule per variable. The customer's name fills body {{1}} or a variable called *name*. */
export function defaultRules(template, headers = [], rows = []) {
  const columns = guessVariableColumns(headers, template, rows);
  return (template?.variables || []).map(v => {
    const key = variableId(v);
    const isName = (v.component === 'body' && v.key === '1') || NAME_KEY.test(v.key);
    const source = columns[key] !== undefined ? `column:${columns[key]}` : isName ? 'name' : 'each';
    return { key, source, value: '' };
  });
}

/** Columns found in a new file take over rules still left to typing. */
export function applyColumns(rules, headers, template, rows = []) {
  const columns = guessVariableColumns(headers, template, rows);
  return rules.map(r => r.source === 'each' && columns[r.key] !== undefined ? { ...r, source: `column:${columns[r.key]}` } : r);
}

export function sourceValue(row, rule) {
  if (rule.source === 'name') return row.name || '';
  if (rule.source === 'static') return rule.value || '';
  if (rule.source.startsWith('column:')) return row.cells?.[Number(rule.source.slice(7))] ?? '';
  if (rule.source.startsWith('field:')) return row.fields?.find(f => f.key === rule.source.slice(6))?.value || '';
  return '';
}

/** A typed cell wins over the chosen source; an empty result falls back to the rule's text. */
export function cellValue(row, rule) {
  const edited = row.edits?.[rule.key];
  return String(edited ?? sourceValue(row, rule)).trim();
}
export function resolvedValue(row, rule) {
  return cellValue(row, rule) || (rule.source === 'static' ? '' : String(rule.value || '').trim());
}

export function rowMissing(row, rules) {
  return rules.filter(rule => !resolvedValue(row, rule)).map(rule => rule.key);
}

/** Parameters for renderTemplate, so the preview shows this person's message. */
export function rowParameters(row, rules, template) {
  const byKey = new Map(rules.map(r => [r.key, r]));
  return (template?.variables || []).map(v => {
    const rule = byKey.get(variableId(v));
    return { key: v.key, component: v.component, text: rule ? resolvedValue(row, rule) : '' };
  }).filter(p => p.text);
}

/** Server mapping: every variable is per recipient, with the rule's text as the fallback. */
export function serverMapping(rules) {
  return rules.map(r => ({ key: r.key, source: 'recipient', value: String(r.value || '').trim() }));
}

/** Each recipient's own values, keyed by the contact id returned on import. */
export function recipientValues(rows, rules) {
  return rows.filter(r => r.contactId).map(row => ({
    contactId: row.contactId,
    values: rules.map(rule => ({ key: rule.key, text: cellValue(row, rule) })).filter(v => v.text),
  }));
}

/** Append rows not already present (by WhatsApp number). Returns the new list and counts. */
export function mergeRows(existing, incoming, max = MAX_BROADCAST) {
  const seen = new Set(existing.map(r => r.waId));
  const next = [...existing];
  let duplicates = 0, overLimit = 0;
  for (const row of incoming) {
    if (seen.has(row.waId)) { duplicates++; continue; }
    if (next.length >= max) { overLimit++; continue; }
    seen.add(row.waId);
    next.push(row);
  }
  return { rows: next, duplicates, overLimit };
}

/** Rows from a parsed sheet: valid numbers from buildImportPreview plus their raw cells. */
export function rowsFromSheet(sheet, preview) {
  return preview.valid.map(v => ({ waId: v.waId, countryIso: v.countryIso, name: v.name, cells: sheet[v.line - 1] || [], fields: v.fields || [], origin: 'import' }));
}

/** A saved contact as a recipient row. */
export function rowFromContact(c) {
  return { waId: c.number, contactId: c.id, name: c.name || '', fields: c.fields || [], origin: 'saved' };
}
