import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { RecordsTable } from '../workspace/RecordsTable.jsx';
import { label } from './labels.js';
import { FITNESS_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Memberships. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <RecordsTable ar={ar} data={data} prefix="ft" meta={FITNESS_METRICS[data.metric] || { en: data.metric, ar: data.metric }} onBack={onBack} rowKey={(row, i) => `${row.id}:${i}`}
    empty={['Change the period in Insights, or record more activity.', 'غيّر الفترة في المؤشرات، أو سجّل نشاطاً أكثر.']} columns={[
    { label: ['Member or class', 'العضو أو الحصة'], cell: row => row.contactName ? <bdi>{row.contactName}</bdi> : row.classTitle ? <bdi>{row.classTitle}</bdi> : '—' },
    { label: ['Record', 'السجل'], cell: row => <>
      {row.plan && <bdi>{row.plan}</bdi>}{row.classTitle && row.contactName ? <> · <bdi>{row.classTitle}</bdi></> : null}
      {row.classStartsAt ? <> · {formatDateTime(row.classStartsAt, s.lang, timezone)}</> : null}
      {row.capacity !== undefined && <> · {tr(`${row.attended} of ${row.capacity} places`, `${row.attended} من ${row.capacity} مقعد`)}</>}
      {row.amountMinor !== undefined && <> · <Money h={h} minor={row.amountMinor} /></>}
      {row.delta !== undefined && <> · <b className="ld-num">{row.delta > 0 ? '+1' : '−1'}</b></>}
      {row.note && <> · <span className="ld-help">{label('note', row.note, ar)}</span></>}
    </> },
  ]} open={row => row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.contactId)}>{tr('Open member', 'فتح العضو')}</button>} />;
}
