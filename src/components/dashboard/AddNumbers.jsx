import React, { useEffect, useMemo, useState } from 'react';
import { dashboard } from '../../lib/dashboard/api';
import { countryOptions } from '../../lib/countries';
import { normalizePhone, formatPhone, isMobileNumber } from '../../lib/dashboard/phone';
import { buildImportPreview, guessMapping, readContactsFile } from '../../lib/dashboard/import';
import { toCsv } from '../../lib/dashboard/csv';
import { download } from '../../lib/dashboard/exports';
import { applyColumns, mergeRows, rowFromContact, rowsFromSheet, MAX_BROADCAST } from '../../lib/dashboard/broadcast';
import { useDebounced } from '../../hooks/usePolling';

function AddResult({ s, result }) {
  if (!result) return null;
  return <p className="ld-help ld-num" role="status">{s.t('addedRows', result)}{result.overLimit ? ` · ${s.t('overLimit', { count: result.overLimit, max: MAX_BROADCAST })}` : ''}</p>;
}

/** Type one number at a time; the variable values are filled in the table below. */
export function ManualAdd({ s, rows, setRows }) {
  const countries = useMemo(() => countryOptions(s.lang), [s.lang]);
  const [entry, setEntry] = useState({ country: 'OM', number: '', name: '' }), [error, setError] = useState(''), [result, setResult] = useState(null);
  const add = e => {
    e.preventDefault();
    const normalized = normalizePhone(entry.number, entry.country);
    if (normalized.error) { setError(s.t(normalized.error)); return; }
    if (isMobileNumber(normalized.waId) === false) { setError(s.t('not_mobile')); return; }
    setError('');
    const merged = mergeRows(rows, [{ waId: normalized.waId, countryIso: normalized.countryIso, name: entry.name.trim(), origin: 'manual' }]);
    setRows(merged.rows);
    setResult({ added: merged.rows.length - rows.length, duplicates: merged.duplicates, overLimit: merged.overLimit });
    setEntry(x => ({ ...x, number: '', name: '' }));
  };
  return (
    <form className="ld-manual" onSubmit={add}>
      <label className="ld-field">{s.t('country')}<select value={entry.country} onChange={e => setEntry({ ...entry, country: e.target.value })}>{countries.map(c => <option key={c.iso} value={c.iso}>{c.name} +{c.dial}</option>)}</select></label>
      <label className="ld-field">{s.t('nationalNumber')}<input inputMode="tel" dir="ltr" autoComplete="off" value={entry.number} onChange={e => setEntry({ ...entry, number: e.target.value })} required /></label>
      <label className="ld-field">{s.t('contactName')}<input value={entry.name} maxLength={80} dir="auto" onChange={e => setEntry({ ...entry, name: e.target.value })} /></label>
      <button type="submit" className="ld-button">{s.t('addNumber')}</button>
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      <AddResult s={s} result={result} />
    </form>
  );
}

/** CSV or XLSX: phone, name and country columns, plus any column a variable can be filled from. */
export function UploadList({ s, template, rows, setRows, setRules, setHeaders }) {
  const countries = useMemo(() => countryOptions(s.lang), [s.lang]);
  const [sheet, setSheet] = useState(null), [mapping, setMapping] = useState(null), [country, setCountry] = useState('OM');
  const [error, setError] = useState(''), [result, setResult] = useState(null);
  const preview = useMemo(() => sheet && mapping ? buildImportPreview(sheet, mapping, country, []) : null, [sheet, mapping, country]);
  const onFile = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setResult(null);
    try { const parsed = await readContactsFile(file); setSheet(parsed); setMapping(guessMapping(parsed[0], [])); }
    catch (err) { setError(s.reason(err.message)); setSheet(null); }
  };
  const add = () => {
    const merged = mergeRows(rows, rowsFromSheet(sheet, preview));
    setRows(merged.rows);
    setHeaders(sheet[0]);
    setRules(list => applyColumns(list, sheet[0], template, sheet.slice(1)));
    setResult({ added: merged.rows.length - rows.length, duplicates: merged.duplicates + preview.duplicates, overLimit: merged.overLimit });
  };
  const sample = () => {
    const extra = template.variables.filter(v => !(v.component === 'body' && v.key === '1')).map(v => `{{${v.key}}}`);
    download(`${template.name}-numbers.csv`, toCsv([['phone', 'name', ...extra], ['+968 9123 4567', 'Aisha', ...extra.map(() => '')]]), 'text/csv;charset=utf-8');
  };
  return (
    <section>
      <p className="ld-help">{s.t('uploadHelp')} <button type="button" className="ld-link" onClick={sample}>{s.t('downloadSample')}</button></p>
      <label className="ld-field">{s.t('chooseFile')}<input type="file" accept=".csv,.xlsx,.txt" onChange={onFile} /></label>
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {sheet && mapping && (
        <fieldset className="ld-fieldset">
          <legend>{s.t('mapColumns')}</legend>
          <div className="ld-grid-3">
            {['phone', 'name', 'country', 'type'].map(key => (
              <label key={key} className="ld-field">{s.t(`column_${key}`)}
                <select value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: Number(e.target.value) })}>
                  <option value={-1}>{s.t('noColumn')}</option>
                  {sheet[0].map((h, i) => <option key={i} value={i}>{h || `#${i + 1}`}</option>)}
                </select>
              </label>
            ))}
            <label className="ld-field">{s.t('defaultCountry')}
              <select value={country} onChange={e => setCountry(e.target.value)}>{countries.map(c => <option key={c.iso} value={c.iso}>{c.name} +{c.dial}</option>)}</select>
            </label>
          </div>
          {preview && <p className="ld-num" role="status">{s.t('importPreview', { valid: preview.valid.length, duplicates: preview.duplicates, invalid: preview.invalid.length })}{preview.notWhatsApp ? ` · ${s.t('notWhatsApp', { count: preview.notWhatsApp })}` : ''}</p>}
          {preview && preview.valid.length > MAX_BROADCAST - rows.length && <p className="ld-help">{s.t('overLimit', { count: preview.valid.length - Math.max(0, MAX_BROADCAST - rows.length), max: MAX_BROADCAST })}</p>}
          {!!preview?.invalid.length && <ul className="ld-issues">{preview.invalid.slice(0, 20).map(i => <li key={i.line}>{s.t('importRowIssue', { line: i.line, reason: s.t(i.reason) })} <bdi dir="ltr">{i.value}</bdi></li>)}</ul>}
          <button type="button" className="ld-button" disabled={!preview?.valid.length} onClick={add}>{s.t('addToList', { count: preview?.valid.length || 0 })}</button>
        </fieldset>
      )}
      <AddResult s={s} result={result} />
    </section>
  );
}

/** Saved contacts with marketing consent; others are shown but cannot be picked. */
export function SavedPicker({ s, rows, setRows }) {
  const [search, setSearch] = useState(''), [data, setData] = useState(null), [error, setError] = useState('');
  const query = useDebounced(search.trim(), 300);
  useEffect(() => { setData(null); dashboard('contacts', query ? { search: query } : { limit: 50 }).then(setData).catch(e => setError(s.reason(e.reason))); }, [query]);
  const eligible = c => c.channel !== 'instagram' && !c.optout && !c.notOnWhatsApp && c.consent.status === 'granted';
  const picked = new Set(rows.map(r => r.waId));
  const toggle = c => setRows(list => picked.has(c.number) ? list.filter(r => r.waId !== c.number) : mergeRows(list, [rowFromContact(c)]).rows);
  return (
    <div>
      <p className="ld-help">{s.t('eligibleOnly')}</p>
      <label className="ld-search"><span className="ld-visually-hidden">{s.t('searchContacts')}</span><input type="search" value={search} placeholder={s.t('searchContacts')} onChange={e => setSearch(e.target.value)} /></label>
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {!data ? <p role="status">{s.t('loading')}</p> : (
        <ul className="ld-recipients">
          {data.items.map(c => (
            <li key={c.id}>
              <label className={`ld-choice ${eligible(c) ? '' : 'is-disabled'}`}>
                <input type="checkbox" disabled={!eligible(c) || (!picked.has(c.number) && rows.length >= MAX_BROADCAST)} checked={picked.has(c.number)} onChange={() => toggle(c)} />
                <span><bdi>{c.name}</bdi> <bdi dir="ltr" className="ld-num">{formatPhone(c.number)}</bdi><small>{c.optout ? s.t('optedOut') : c.notOnWhatsApp ? s.t('reason_not_on_whatsapp') : s.t(`consent_${c.consent.status}`)}</small></span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
