import React from 'react';
import { Money } from '../Badges';
import { PageHeader } from '../DashboardVisuals';
import { KpiTrend, PeriodPicker } from './kpi.jsx';

/** Insights' heading and period choice. `prefix` names the period radio group (e.g. 'ft-period'). */
export function InsightsHeader({ ar, prefix, period, onParams, description }) {
  return <>
    <PageHeader icon="trending-up" title={ar ? 'المؤشرات' : 'Insights'} description={description[ar ? 1 : 0]} />
    <PeriodPicker ar={ar} period={period} name={`${prefix}-period`} onChange={id => onParams({ period: id })} />
  </>;
}

/**
 * A population's notes (unknown outcomes, frozen members…), with any extra items the sector adds.
 * `keep(key, count)` picks the notes shown (default: those with a count); `always` renders the list even when empty.
 */
export function NoteList({ m, noteLabel, children, keep = (k, n) => !!n, always = false }) {
  const entries = Object.entries(m.notes || {}).filter(([k, n]) => keep(k, n));
  const extra = React.Children.toArray(children).filter(Boolean);
  return always || entries.length || extra.length ? <ul className="hb-kpi-notes">{entries.map(([k, n]) => <li key={k}>{noteLabel(k)}: <b className="ld-num">{n}</b></li>)}{extra}</ul> : null;
}

/** The selected measure: its name, definition, owner, notes and trend, with View source records. */
export function KpiDetail({ ar, s, timezone, prefix, defs, m, settings, onRecords, notes, format }) {
  const def = defs[m.id];
  return <section className="hb-panel hb-kpi-detail" aria-labelledby={`${prefix}-kpi-title`}>
    <div className="hb-status-line"><h2 id={`${prefix}-kpi-title`}>{ar ? def.ar : def.en}</h2>
      <button type="button" className="ld-button ld-primary" onClick={() => onRecords(m.id)}>{ar ? 'عرض السجلات المصدرية' : 'View source records'}</button></div>
    <p>{def.def(settings, ar)}</p>
    <p className="ld-help">{ar ? 'المسؤول والمراجعة' : 'Owner and review'}: {def.owner[ar ? 1 : 0]}</p>
    {notes}
    <KpiTrend m={m} ar={ar} s={s} timezone={timezone} {...(format ? { format } : {})} />
  </section>;
}

/**
 * Break down by: one row per segment key, each cell opening that segment's exact records.
 * @param {string[]} p.dimensions the segments offered; @param {string[]} p.columns the metric ids shown
 * @param {(id:string) => string} p.dimensionLabel; @param {(key:string) => string} p.keyLabel
 * @param {Map<string,object>} p.metricsBy the period's metrics by id (their kind decides the cell's format)
 * @param {(ms:number) => string} [p.duration] formats a duration metric's value
 * @param {[string,string]} p.hint EN/AR hint before a dimension is chosen
 */
export function SegmentTable({ ar, h, prefix, dimensions, segment, columns, rows, defs, metricsBy, dimensionLabel, keyLabel, onParams, onRecords, duration, hint }) {
  const tr = (en, arabic) => (ar ? arabic : en), name = id => ar ? defs[id].ar : defs[id].en;
  const cell = (v, m) => m?.kind === 'money' ? <Money h={h} minor={v.value || 0} /> : v.value == null ? '—' : m?.kind === 'rate' ? `${v.value}% (${v.numerator}/${v.denominator})`
    : m?.kind === 'duration' && duration ? duration(v.value) : v.value;
  return <section aria-labelledby={`${prefix}-segments`} className="hb-segments">
    <div className="hb-status-line"><h2 id={`${prefix}-segments`}>{tr('Break down by', 'تقسيم حسب')}</h2>
      <select aria-label={tr('Break down by', 'تقسيم حسب')} value={segment} onChange={e => onParams({ segment: e.target.value })}>
        <option value="">{tr('Choose…', 'اختر…')}</option>{dimensions.map(id => <option key={id} value={id}>{dimensionLabel(id)}</option>)}
      </select></div>
    {rows?.length ? <div className="ld-table-wrap"><table className="ld-table">
      <thead><tr><th>{dimensionLabel(segment)}</th>{columns.map(id => <th key={id}>{name(id)}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}>
        <td data-label={dimensionLabel(segment)}><b><bdi>{keyLabel(row.key)}</bdi></b></td>
        {columns.map(id => { const v = row.values[id], m = metricsBy.get(id);
          return <td key={id} data-label={name(id)}>
            {v?.denominator || (v?.value && m?.kind !== 'rate') ? <button type="button" className="ld-link" onClick={() => onRecords(id, `${segment}:${row.key}`)}>{cell(v, m)}</button> : '—'}
          </td>; })}
      </tr>)}</tbody>
    </table></div> : segment ? <p className="ld-help">{tr('No records in this period for this breakdown.', 'لا سجلات في هذه الفترة لهذا التقسيم.')}</p> : <p className="ld-help">{hint[ar ? 1 : 0]}</p>}
  </section>;
}
