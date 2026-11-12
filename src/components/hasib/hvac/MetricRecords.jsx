import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { duration } from '../workspace/kpi.jsx';
import { RecordsTable } from '../workspace/RecordsTable.jsx';
import { label } from './labels.js';
import { HVAC_METRICS } from './metrics.js';

/** The exact records behind one Insights measure, in Jobs. Back to Insights restores the measure, period and breakdown. */
export function MetricRecords({ ar, h, s, timezone, data, onOpen, onOpenContract, onBack }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return (
    <RecordsTable
      ar={ar}
      data={data}
      prefix="hv"
      meta={HVAC_METRICS[data.metric] || { en: data.metric, ar: data.metric }}
      onBack={onBack}
      rowKey={(row, i) => `${row.id}:${i}`}
      empty={['Change the period in Insights, or record more jobs.', 'غيّر الفترة في المؤشرات، أو سجّل أعمالاً أكثر.']}
      columns={[
        { label: ['Customer', 'العميل'], cell: row => (row.contactName ? <bdi>{row.contactName}</bdi> : '—') },
        {
          label: ['Record', 'السجل'],
          cell: row => (
            <>
              {row.jobNumber != null ? (
                <>
                  <span className="ld-num">#{row.jobNumber}</span> · {label('jobType', row.jobType, ar)} ·{' '}
                  {label('status', row.status, ar)}
                </>
              ) : null}
              {row.reference ? (
                <>
                  <bdi>{row.reference}</bdi> · {tr('ends', 'ينتهي')} {formatDate(row.endsAt, s.lang, timezone)}
                </>
              ) : null}
              {row.unitLabel ? (
                <>
                  <bdi>{row.unitLabel}</bdi> · {tr('due', 'مستحقة')} {formatDate(row.nextServiceAt, s.lang, timezone)}
                </>
              ) : null}
              {row.startsAt ? (
                <>
                  {' '}
                  · {formatDateTime(row.startsAt, s.lang, timezone)}
                  {row.arrivedAt ? (
                    <>
                      {' '}
                      · {tr('arrived', 'وصل')} {formatDateTime(row.arrivedAt, s.lang, timezone)}
                    </>
                  ) : null}
                </>
              ) : null}
              {row.amountMinor !== undefined && (
                <>
                  {' '}
                  · <Money h={h} minor={row.amountMinor} />
                </>
              )}
              {row.durationMs !== undefined && <> · {duration(row.durationMs, ar)}</>}
              {row.note && (
                <>
                  {' '}
                  · <span className="ld-help">{label('note', row.note, ar)}</span>
                </>
              )}
            </>
          ),
        },
      ]}
      open={row =>
        row.jobId ? (
          <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.jobId)}>
            {tr('Open job', 'فتح العمل')}
          </button>
        ) : row.contractId ? (
          <button type="button" className="ld-button ld-quiet" onClick={() => onOpenContract(row.contractId)}>
            {tr('Open contract', 'فتح العقد')}
          </button>
        ) : null
      }
    />
  );
}
