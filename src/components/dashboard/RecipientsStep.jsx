import React, { useState } from 'react';
import { formatPhone, mayBeUsNumber } from '../../lib/dashboard/phone';
import { cellValue, rowMissing, MAX_BROADCAST } from '../../lib/dashboard/broadcast';
import { variableId } from '../../../config/layla-templates.js';
import { ManualAdd, UploadList, SavedPicker } from './AddNumbers';

const HOW = ['whatsapp', 'store', 'website', 'other'];
const varLabel = v => `${v.component === 'header' ? 'header ' : ''}{{${v.key}}}`;
const labelOf = key => { const [component, k] = key.split(':'); return varLabel({ component, key: k }); };

export const consentReady = c => !!(c.attested && c.how && (c.how !== 'other' || c.other.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.date <= new Date().toISOString().slice(0, 10));
/** The stored attestation: how they agreed, when, and for what. */
export const consentRecord = (c, template, s) => ({
  source: (c.how === 'other' ? c.other.trim() : s.t(`consent_${c.how}`)).slice(0, 120), date: c.date,
  purpose: `WhatsApp marketing: ${template.name}`.slice(0, 200), attested: c.attested === true,
});

/** Step 2: add numbers three ways, choose how each variable is filled, and check every row. */
export function RecipientsStep({ s, overview, template, single, initialTab, rows, setRows, rules, setRules, headers, setHeaders, consent, setConsent, needsConsent, incomplete }) {
  const [tab, setTab] = useState(initialTab);
  const fields = overview.qualification?.fields || [];
  const tabs = [['manual', s.t('typeNumbers')], ['file', s.t('uploadList')], ['saved', s.t('savedContacts')]];
  const setRule = (key, patch) => setRules(list => list.map(r => r.key === key ? { ...r, ...patch } : r));
  // A variable filled from the name is edited in the name column, not twice.
  const nameVars = rules.filter(r => r.source === 'name'), typed = rules.filter(r => r.source !== 'name');
  const edit = (waId, key, text) => setRows(list => list.map(r => r.waId === waId ? { ...r, edits: { ...r.edits, [key]: text } } : r));

  return (
    <div className="ld-recipients-step">
      {!single && <>
        <div className="ld-segmented" role="tablist" aria-label={s.t('step_recipients')}>
          {tabs.map(([id, label]) => <button key={id} type="button" role="tab" id={`ld-add-${id}`} aria-selected={tab === id} aria-controls="ld-add-panel" onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <div id="ld-add-panel" role="tabpanel" aria-labelledby={`ld-add-${tab}`} className="ld-add-panel">
          {tab === 'manual' && <ManualAdd s={s} rows={rows} setRows={setRows} />}
          {tab === 'file' && <UploadList s={s} template={template} rows={rows} setRows={setRows} setRules={setRules} setHeaders={setHeaders} />}
          {tab === 'saved' && <SavedPicker s={s} rows={rows} setRows={setRows} />}
        </div>
      </>}

      {rules.length > 0 && (
        <fieldset className="ld-fieldset ld-rules">
          <legend>{s.t('fillWith')}</legend>
          {template.variables.map(v => {
            const rule = rules.find(r => r.key === variableId(v));
            return (
              <div key={rule.key} className="ld-rule">
                <span className="ld-var" dir="ltr">{varLabel(v)}</span>
                <label className="ld-field"><span className="ld-visually-hidden">{s.t('variableSource')} {varLabel(v)}</span>
                  <select value={rule.source} onChange={e => setRule(rule.key, { source: e.target.value })}>
                    <option value="name">{s.t('source_name')}</option>
                    {headers.map((h, i) => <option key={i} value={`column:${i}`}>{s.t('source_column', { column: h || `#${i + 1}` })}</option>)}
                    {fields.map(f => <option key={f.key} value={`field:${f.key}`}>{s.t('source_field', { field: s.ar ? f.ar : f.en })}</option>)}
                    <option value="each">{s.t('source_each')}</option>
                    <option value="static">{s.t('source_static')}</option>
                  </select>
                </label>
                <label className="ld-field">{rule.source === 'static' ? s.t('textForAll') : s.t('fallback')}
                  <input value={rule.value} maxLength={200} dir="auto" onChange={e => setRule(rule.key, { value: e.target.value })} />
                </label>
              </div>
            );
          })}
        </fieldset>
      )}

      <section className="ld-section" aria-labelledby="ld-who">
        <div className="ld-section-head">
          <h3 id="ld-who">{s.t('whoReceives')}</h3>
          <p className="ld-help ld-num" role="status">{s.t('listCount', { count: rows.length, max: MAX_BROADCAST })}</p>
        </div>
        {!rows.length ? <p className="ld-state">{s.t('emptyList')}</p> : (
          <div className="ld-table-wrap ld-recipient-table">
            <table className="ld-table ld-compact">
              <thead><tr><th scope="col">{s.t('number')}</th><th scope="col">{s.t('name')}{nameVars.map(r => <span key={r.key} className="ld-var" dir="ltr">{labelOf(r.key)}</span>)}</th>{typed.map(r => <th key={r.key} scope="col"><span dir="ltr">{labelOf(r.key)}</span></th>)}{!single && <th scope="col"><span className="ld-visually-hidden">{s.t('delete')}</span></th>}</tr></thead>
              <tbody>
                {rows.map(row => {
                  const missing = rowMissing(row, rules);
                  return (
                    <tr key={row.waId} className={missing.length ? 'is-missing' : ''}>
                      <th scope="row"><bdi dir="ltr" className="ld-num">{formatPhone(row.waId)}</bdi></th>
                      <td data-label={[s.t('name'), ...nameVars.map(r => labelOf(r.key))].join(' · ')}><input className="ld-cell" dir="auto" maxLength={80} value={row.name || ''} aria-label={`${s.t('name')} · ${formatPhone(row.waId)}`} onChange={e => setRows(list => list.map(r => r.waId === row.waId ? { ...r, name: e.target.value } : r))} /></td>
                      {typed.map(rule => (
                        <td key={rule.key} data-label={labelOf(rule.key)}>
                          <input className="ld-cell" dir="auto" maxLength={200} value={cellValue(row, rule)} placeholder={rule.value || ''}
                            aria-invalid={missing.includes(rule.key) || undefined} aria-label={`${labelOf(rule.key)} · ${row.name || formatPhone(row.waId)}`}
                            onChange={e => edit(row.waId, rule.key, e.target.value)} />
                        </td>
                      ))}
                      {!single && <td><button type="button" className="ld-icon-button" aria-label={s.t('removeRow', { number: formatPhone(row.waId) })} onClick={() => setRows(list => list.filter(r => r.waId !== row.waId))}>×</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {incomplete > 0 && (
          <p className="ld-inline-error" role="alert">{s.t('missingCells', { count: incomplete })}{' '}
            {!single && <button type="button" className="ld-link" onClick={() => setRows(list => list.filter(r => !rowMissing(r, rules).length))}>{s.t('removeIncomplete')}</button>}
          </p>
        )}
        {rows.some(r => mayBeUsNumber(r.waId)) && <p className="ld-help">{s.t('usWarning')}</p>}
      </section>

      {needsConsent && (
        <fieldset className="ld-fieldset ld-consent">
          <legend>{s.t('consentTitle')}</legend>
          <div className="ld-grid-3">
            <label className="ld-field">{s.t('consentHow')}
              <select value={consent.how} required onChange={e => setConsent({ ...consent, how: e.target.value })}>
                <option value="">—</option>
                {HOW.map(h => <option key={h} value={h}>{s.t(`consent_${h}`)}</option>)}
              </select>
            </label>
            {consent.how === 'other' && <label className="ld-field">{s.t('consentOther')}<input value={consent.other} maxLength={120} dir="auto" required onChange={e => setConsent({ ...consent, other: e.target.value })} /></label>}
            <label className="ld-field">{s.t('consentDate')}<input type="date" value={consent.date} max={new Date().toISOString().slice(0, 10)} required onChange={e => setConsent({ ...consent, date: e.target.value })} /></label>
          </div>
          <label className="ld-check"><input type="checkbox" checked={consent.attested} onChange={e => setConsent({ ...consent, attested: e.target.checked })} required /> <span>{s.t('consentAttest')}</span></label>
        </fieldset>
      )}
    </div>
  );
}
