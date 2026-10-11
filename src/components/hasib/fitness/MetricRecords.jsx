import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { CountedChip, RecordsSummary } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { FITNESS_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Memberships. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const meta = FITNESS_METRICS[data.metric] || { en: data.metric, ar: data.metric };
  const rows = data.items || [];
  return <section aria-labelledby="ft-records-title">
    <div className="hb-status-line">
      <h2 id="ft-records-title">{tr('Source records', 'السجلات المصدرية')}: {ar ? meta.ar : meta.en}</h2>
      <button type="button" className="ld-button" onClick={onBack}>{tr('Back to Insights', 'العودة إلى المؤشرات')}</button>
    </div>
    <RecordsSummary rows={rows} ar={ar} complete={data.complete} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-records">
      <thead><tr><th>{tr('Member or class', 'العضو أو الحصة')}</th><th>{tr('Record', 'السجل')}</th><th>{tr('In the result', 'في النتيجة')}</th><th><span className="ld-visually-hidden">{tr('Open', 'فتح')}</span></th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={`${row.id}:${i}`} data-counted={row.inNumerator ? 'yes' : row.counts ? 'no' : 'out'}>
        <td data-label={tr('Member or class', 'العضو أو الحصة')}>{row.contactName ? <bdi>{row.contactName}</bdi> : row.classTitle ? <bdi>{row.classTitle}</bdi> : '—'}</td>
        <td data-label={tr('Record', 'السجل')}>
          {row.plan && <bdi>{row.plan}</bdi>}{row.classTitle && row.contactName ? <> · <bdi>{row.classTitle}</bdi></> : null}
          {row.classStartsAt ? <> · {formatDateTime(row.classStartsAt, s.lang, timezone)}</> : null}
          {row.capacity !== undefined && <> · {tr(`${row.attended} of ${row.capacity} places`, `${row.attended} من ${row.capacity} مقعد`)}</>}
          {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
          {row.delta !== undefined && <> · <b className="ld-num">{row.delta > 0 ? '+1' : '−1'}</b></>}
          {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
        </td>
        <td data-label={tr('In the result', 'في النتيجة')}><CountedChip row={row} ar={ar} /></td>
        <td data-label={tr('Open', 'فتح')}>{row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.contactId)}>{tr('Open member', 'فتح العضو')}</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="bar-chart" title={tr('No records in this population', 'لا سجلات في هذا المجتمع')} description={tr('Change the period in Insights, or record more activity.', 'غيّر الفترة في المؤشرات، أو سجّل نشاطاً أكثر.')} />}
  </section>;
}
