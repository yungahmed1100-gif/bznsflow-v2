import React from 'react';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { CountedChip, RecordsSummary, duration } from '../workspace/kpi.jsx';
import { label } from './labels.js';
import { MEDIA_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Productions. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const meta = MEDIA_METRICS[data.metric] || { en: data.metric, ar: data.metric };
  const rows = data.items || [];
  return <section aria-labelledby="md-records-title">
    <div className="hb-status-line">
      <h2 id="md-records-title">{tr('Source records', 'السجلات المصدرية')}: {ar ? meta.ar : meta.en}</h2>
      <button type="button" className="ld-button" onClick={onBack}>{tr('Back to Insights', 'العودة إلى المؤشرات')}</button>
    </div>
    <RecordsSummary rows={rows} ar={ar} complete={data.complete} />
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-records">
      <thead><tr><th>{tr('Production', 'الإنتاج')}</th><th>{tr('Record', 'السجل')}</th><th>{tr('In the result', 'في النتيجة')}</th><th><span className="ld-visually-hidden">{tr('Open', 'فتح')}</span></th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={`${row.id}:${row.item || i}`} data-counted={row.inNumerator ? 'yes' : row.counts ? 'no' : 'out'}>
        <td data-label={tr('Production', 'الإنتاج')}><bdi>{row.ref} · {row.title}</bdi>{row.contactName ? <small> · <bdi>{row.contactName}</bdi></small> : null}</td>
        <td data-label={tr('Record', 'السجل')}>
          {row.entityType === 'cut' ? <>{tr('Cut', 'نسخة')} {row.label}</> : row.entityType === 'cost' ? <>{label('cost', row.category, ar)} · <bdi>{row.label}</bdi></>
            : row.entityType === 'reservation' ? <><bdi>{row.resourceName}</bdi>{row.hours != null ? ` · ${row.hours} h` : ''}</> : row.item ? label('prep', row.item, ar) : label('status', row.status, ar)}
          {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
          {row.durationMs != null && <> · {duration(row.durationMs, ar)}</>}
          {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
        </td>
        <td data-label={tr('In the result', 'في النتيجة')}><CountedChip row={row} ar={ar} /></td>
        <td data-label={tr('Open', 'فتح')}>{row.productionId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.productionId)}>{tr('Open production', 'فتح الإنتاج')}</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="bar-chart" title={tr('No records in this population', 'لا سجلات في هذا المجتمع')} description={tr('Change the period in Insights, or record more activity.', 'غيّر الفترة في المؤشرات، أو سجّل نشاطاً أكثر.')} />}
  </section>;
}
