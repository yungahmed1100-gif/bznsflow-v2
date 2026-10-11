import React from 'react';
import { Money } from '../Badges';
import { duration } from '../workspace/kpi.jsx';
import { RecordsTable } from '../workspace/RecordsTable.jsx';
import { label } from './labels.js';
import { MEDIA_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Productions. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <RecordsTable ar={ar} data={data} prefix="md" meta={MEDIA_METRICS[data.metric] || { en: data.metric, ar: data.metric }} onBack={onBack} rowKey={(row, i) => `${row.id}:${row.item || i}`} columns={[
    { label: ['Production', 'الإنتاج'], cell: row => <><bdi>{row.ref} · {row.title}</bdi>{row.contactName ? <small> · <bdi>{row.contactName}</bdi></small> : null}</> },
    { label: ['Record', 'السجل'], cell: row => <>
      {row.entityType === 'cut' ? <>{tr('Cut', 'نسخة')} {row.label}</> : row.entityType === 'cost' ? <>{label('cost', row.category, ar)} · <bdi>{row.label}</bdi></>
        : row.entityType === 'reservation' ? <><bdi>{row.resourceName}</bdi>{row.hours != null ? ` · ${row.hours} h` : ''}</> : row.item ? label('prep', row.item, ar) : label('status', row.status, ar)}
      {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
      {row.durationMs != null && <> · {duration(row.durationMs, ar)}</>}
      {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
    </> },
  ]} open={row => row.productionId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.productionId)}>{tr('Open production', 'فتح الإنتاج')}</button>} />;
}
