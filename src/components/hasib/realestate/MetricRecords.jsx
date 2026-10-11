import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { label } from './labels.js';
import { METRICS, duration } from './metrics.js';
import { RecordsTable } from '../workspace/RecordsTable.jsx';

/** When a record happened, by what kind of record it is. */
const at = row => row.scheduledAt || row.dueAt || row.decisionDueAt || row.verificationAt || row.createdAt;

/**
 * The exact records behind one Insights measure, in Deals. Rows the numerator counts are marked;
 * rows outside the denominator say why. Back to Insights restores the measure, period and breakdown.
 */
export function MetricRecords({ ar, h, s, timezone, data, onOpenDeal, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <RecordsTable ar={ar} data={data} prefix="re" meta={METRICS[data.metric] || { en: data.metric, ar: data.metric }} onBack={onBack} columns={[
    { label: ['Customer or listing', 'العميل أو الإعلان'], cell: row => <bdi>{row.contactName || row.label || row.propertyLabel || tr('Customer', 'عميل')}</bdi> },
    { label: ['Record', 'السجل'], cell: row => <>
      {row.entityType === 'viewing' ? <>{label('viewing', row.status, ar)} · <bdi>{row.propertyLabel}</bdi></>
        : row.entityType === 'offer' ? <>{label('offer', row.status, ar)} · <Money h={h} minor={row.amountMinor} /></>
        : row.entityType === 'commission' ? <>{tr('Still owed', 'المتبقي')} <Money h={h} minor={row.amountMinor} /></>
        : row.entityType === 'property' ? label('availability', row.availability, ar)
        : label('stage', row.stage, ar)}
      {row.durationMs != null && <> · {duration(row.durationMs, ar)}</>}
      {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
    </> },
    { label: ['When', 'متى'], cell: row => at(row) ? formatDateTime(at(row), s.lang, timezone) : '—' },
  ]} open={row => row.opportunityId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenDeal(row.opportunityId)}>{tr('Open deal', 'فتح الصفقة')}</button>} />;
}
