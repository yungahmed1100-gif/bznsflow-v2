import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { CountedChip, RecordsSummary } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { DENTAL_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Visits. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const meta = DENTAL_METRICS[data.metric] || { en: data.metric, ar: data.metric };
  const rows = data.items || [];
  return <section aria-labelledby="dn-records-title">
    <div className="hb-status-line">
      <h2 id="dn-records-title">{tr('Source records', 'السجلات المصدرية')}: {ar ? meta.ar : meta.en}</h2>
      <button type="button" className="ld-button" onClick={onBack}>{tr('Back to Insights', 'العودة إلى المؤشرات')}</button>
    </div>
    <RecordsSummary rows={rows} ar={ar} complete={data.complete} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-records">
      <thead><tr><th>{tr('Patient', 'المريض')}</th><th>{tr('Record', 'السجل')}</th><th>{tr('In the result', 'في النتيجة')}</th><th><span className="ld-visually-hidden">{tr('Open', 'فتح')}</span></th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={`${row.id}:${i}`} data-counted={row.inNumerator ? 'yes' : row.counts ? 'no' : 'out'}>
        <td data-label={tr('Patient', 'المريض')}>{row.contactName ? <bdi>{row.contactName}</bdi> : '—'}</td>
        <td data-label={tr('Record', 'السجل')}>
          {row.startsAt ? formatDateTime(row.startsAt, s.lang, timezone) : null}{row.providerName ? <> · <bdi>{row.providerName}</bdi></> : null}
          {row.status ? <> · {label('status', row.status, ar)}</> : null}{row.taskKind ? <> · {label('task', row.taskKind, ar)}</> : null}
          {row.minutes !== undefined && <> · <span className="ld-num">{row.minutes}</span> {tr('min', 'د')}</>}
          {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
          {row.paidMinor !== undefined && <> · {tr('paid', 'مدفوع')} <Money h={h} minor={row.paidMinor} /></>}
          {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
        </td>
        <td data-label={tr('In the result', 'في النتيجة')}><CountedChip row={row} ar={ar} /></td>
        <td data-label={tr('Open', 'فتح')}>{row.visitId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.visitId)}>{tr('Open visit', 'فتح الزيارة')}</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="bar-chart" title={tr('No records in this population', 'لا سجلات في هذا المجتمع')} description={tr('Change the period in Insights, or record more visits.', 'غيّر الفترة في المؤشرات، أو سجّل زيارات أكثر.')} />}
  </section>;
}
