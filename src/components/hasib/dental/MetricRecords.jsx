import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { RecordsTable } from '../workspace/RecordsTable.jsx';
import { label } from './labels.js';
import { DENTAL_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Visits. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <RecordsTable ar={ar} data={data} prefix="dn" meta={DENTAL_METRICS[data.metric] || { en: data.metric, ar: data.metric }} onBack={onBack} rowKey={(row, i) => `${row.id}:${i}`}
    empty={['Change the period in Insights, or record more visits.', 'غيّر الفترة في المؤشرات، أو سجّل زيارات أكثر.']} columns={[
    { label: ['Patient', 'المريض'], cell: row => row.contactName ? <bdi>{row.contactName}</bdi> : '—' },
    { label: ['Record', 'السجل'], cell: row => <>
      {row.startsAt ? formatDateTime(row.startsAt, s.lang, timezone) : null}{row.providerName ? <> · <bdi>{row.providerName}</bdi></> : null}
      {row.status ? <> · {label('status', row.status, ar)}</> : null}{row.taskKind ? <> · {label('task', row.taskKind, ar)}</> : null}
      {row.minutes !== undefined && <> · <span className="ld-num">{row.minutes}</span> {tr('min', 'د')}</>}
      {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
      {row.paidMinor !== undefined && <> · {tr('paid', 'مدفوع')} <Money h={h} minor={row.paidMinor} /></>}
      {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
    </> },
  ]} open={row => row.visitId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.visitId)}>{tr('Open visit', 'فتح الزيارة')}</button>} />;
}
