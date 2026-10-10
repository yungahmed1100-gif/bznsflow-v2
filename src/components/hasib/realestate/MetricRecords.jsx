import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { EmptyState } from '../DashboardVisuals';
import { label } from './labels.js';
import { METRICS, duration } from './metrics.js';

/** When a record happened, by what kind of record it is. */
const at = row => row.scheduledAt || row.dueAt || row.decisionDueAt || row.verificationAt || row.createdAt;

/**
 * The exact records behind one Insights measure, in Deals. Rows the numerator counts are marked;
 * rows outside the denominator say why. Back to Insights restores the measure, period and breakdown.
 */
export function MetricRecords({ ar, h, s, timezone, data, onOpenDeal, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const meta = METRICS[data.metric] || { en: data.metric, ar: data.metric };
  const rows = data.items || [];
  const counted = rows.filter(r => r.counts), hits = counted.filter(r => r.inNumerator);
  return <section aria-labelledby="re-records-title">
    <div className="hb-status-line">
      <h2 id="re-records-title">{tr('Source records', 'السجلات المصدرية')}: {ar ? meta.ar : meta.en}</h2>
      <button type="button" className="ld-button" onClick={onBack}>{tr('Back to Insights', 'العودة إلى المؤشرات')}</button>
    </div>
    <p className="ld-help">{tr(`${hits.length} counted in the result, out of ${counted.length} in its population${rows.length > counted.length ? `; ${rows.length - counted.length} listed but outside it` : ''}.`,
      `${hits.length} محتسبة في النتيجة من أصل ${counted.length} في المجتمع${rows.length > counted.length ? `؛ و${rows.length - counted.length} معروضة خارجه` : ''}.`)}
      {data.complete === false && <b className="hb-warn"> {tr('Older records were not read.', 'لم تُقرأ السجلات الأقدم.')}</b>}</p>
    {rows.length ? <div className="ld-table-wrap"><table className="ld-table hb-records">
      <thead><tr><th>{tr('Customer or listing', 'العميل أو الإعلان')}</th><th>{tr('Record', 'السجل')}</th><th>{tr('When', 'متى')}</th><th>{tr('In the result', 'في النتيجة')}</th><th><span className="ld-visually-hidden">{tr('Open', 'فتح')}</span></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} data-counted={row.inNumerator ? 'yes' : row.counts ? 'no' : 'out'}>
        <td data-label={tr('Customer or listing', 'العميل أو الإعلان')}><bdi>{row.contactName || row.label || row.propertyLabel || tr('Customer', 'عميل')}</bdi></td>
        <td data-label={tr('Record', 'السجل')}>
          {row.entityType === 'viewing' ? <>{label('viewing', row.status, ar)} · <bdi>{row.propertyLabel}</bdi></>
            : row.entityType === 'offer' ? <>{label('offer', row.status, ar)} · <Money h={h} minor={row.amountMinor} /></>
            : row.entityType === 'commission' ? <>{tr('Still owed', 'المتبقي')} <Money h={h} minor={row.amountMinor} /></>
            : row.entityType === 'property' ? label('availability', row.availability, ar)
            : label('stage', row.stage, ar)}
          {row.durationMs != null && <> · {duration(row.durationMs, ar)}</>}
          {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
        </td>
        <td data-label={tr('When', 'متى')}>{at(row) ? formatDateTime(at(row), s.lang, timezone) : '—'}</td>
        <td data-label={tr('In the result', 'في النتيجة')}><span className={`ld-chip ${row.inNumerator ? 'is-green' : row.counts ? 'is-muted' : 'is-yellow'}`}>
          {row.inNumerator ? tr('Counted', 'محتسب') : row.counts ? tr('In population only', 'في المجتمع فقط') : tr('Outside the population', 'خارج المجتمع')}</span></td>
        <td data-label={tr('Open', 'فتح')}>{row.opportunityId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenDeal(row.opportunityId)}>{tr('Open deal', 'فتح الصفقة')}</button>}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="bar-chart" title={tr('No records in this population', 'لا سجلات في هذا المجتمع')} description={tr('Change the period in Insights, or record more activity.', 'غيّر الفترة في المؤشرات، أو سجّل نشاطاً أكثر.')} />}
  </section>;
}
