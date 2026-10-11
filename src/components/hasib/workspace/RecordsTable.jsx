import React from 'react';
import { EmptyState } from '../DashboardVisuals';
import { CountedChip, RecordsSummary } from './kpi.jsx';

/**
 * The exact records behind one Insights measure, inside the sector's Work tab. Rows the numerator
 * counts are marked; rows outside the denominator say why. Back to Insights restores the measure.
 * @param {object} p
 * @param {string} p.prefix the sector's id prefix (the heading is `${prefix}-records-title`)
 * @param {{en:string, ar:string}} p.meta the measure's name
 * @param {Array<{ label: [string,string], cell: (row:object) => React.ReactNode }>} p.columns the sector's columns before "In the result"
 * @param {(row:object) => React.ReactNode} p.open the Open button for a row
 * @param {(row:object, i:number) => string} [p.rowKey]
 * @param {[string,string]} [p.empty] EN/AR hint when the population is empty
 */
export function RecordsTable({ ar, data, prefix, meta, columns, open, onBack, rowKey = row => row.id, empty = ['Change the period in Insights, or record more activity.', 'غيّر الفترة في المؤشرات، أو سجّل نشاطاً أكثر.'] }) {
  const tr = (en, arabic) => (ar ? arabic : en), pick = pair => pair[ar ? 1 : 0];
  const rows = data.items || [];
  return <section aria-labelledby={`${prefix}-records-title`}>
    <div className="hb-status-line">
      <h2 id={`${prefix}-records-title`}>{tr('Source records', 'السجلات المصدرية')}: {ar ? meta.ar : meta.en}</h2>
      <button type="button" className="ld-button" onClick={onBack}>{tr('Back to Insights', 'العودة إلى المؤشرات')}</button>
    </div>
    <RecordsSummary rows={rows} ar={ar} complete={data.complete} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-records">
      <thead><tr>{columns.map(c => <th key={c.label[0]}>{pick(c.label)}</th>)}<th>{tr('In the result', 'في النتيجة')}</th><th><span className="ld-visually-hidden">{tr('Open', 'فتح')}</span></th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={rowKey(row, i)} data-counted={row.inNumerator ? 'yes' : row.counts ? 'no' : 'out'}>
        {columns.map(c => <td key={c.label[0]} data-label={pick(c.label)}>{c.cell(row)}</td>)}
        <td data-label={tr('In the result', 'في النتيجة')}><CountedChip row={row} ar={ar} /></td>
        <td data-label={tr('Open', 'فتح')}>{open(row)}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="bar-chart" title={tr('No records in this population', 'لا سجلات في هذا المجتمع')} description={pick(empty)} />}
  </section>;
}
