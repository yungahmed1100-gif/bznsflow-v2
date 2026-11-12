import React from 'react';
import { label, BUCKET_TONE, HVAC_FILTERS, SELF_CLOSING } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

const title = (row, ar) => (row.source === 'draft' ? label('draftKind', row.kind, ar) : label('task', row.kind, ar));

/**
 * Jobs → Follow-ups. Hasib opens and closes these by itself; Chats and customer profiles show the same
 * rows. Visit reminders and completion notices send themselves; estimates, service dates, renewals and
 * balances wait here for the manager.
 */
export function FollowupsView({
  ar,
  s,
  timezone,
  data,
  manager,
  busy,
  filter,
  onFilter,
  act,
  onOpenJob,
  onOpenCustomer,
  onTriage,
  customerFilter,
  onClearCustomer,
}) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return (
    <QueueList
      ar={ar}
      s={s}
      timezone={timezone}
      data={data}
      manager={manager}
      busy={busy}
      filter={filter}
      onFilter={onFilter}
      act={act}
      kindAttr
      description={[
        'Requests to triage, visits to book, arrivals to record, late parts and the messages Hasib wrote, in one queue. Each closes by itself once the fact is recorded. Reminders and completion notices send themselves; anything that asks the customer to decide waits for you.',
        'طلبات للفرز، وزيارات للحجز، ووصول للتسجيل، وقطع متأخرة، والرسائل التي كتبها حاسب، في قائمة واحدة. تُغلق كل منها تلقائياً عند تسجيل الحقيقة. التذكيرات وإشعارات الإنجاز تُرسل تلقائياً، وما يطلب قرار العميل ينتظرك.',
      ]}
      scope={
        customerFilter
          ? { text: ['Showing one customer’s follow-ups.', 'تُعرض متابعات عميل واحد.'], onClear: onClearCustomer }
          : null
      }
      filters={HVAC_FILTERS}
      tones={BUCKET_TONE}
      radioName="hv-followup-filter"
      bucketLabel={b => label('bucket', b, ar)}
      title={row => title(row, ar)}
      sendLabel={st => label('draft', st, ar)}
      ops={{ approve: 'hvac_draft_approve', resolve: 'hvac_task_resolve', snooze: 'hvac_task_snooze' }}
      approveConfirm={[
        'Send this message to the customer? Outside the 24-hour window it needs an approved template.',
        'إرسال هذه الرسالة إلى العميل؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.',
      ]}
      selfClosing={SELF_CLOSING}
      closesNote={['Closes by itself once it is recorded.', 'تُغلق تلقائياً عند تسجيلها.']}
      meta={row => (
        <>
          {row.contactName ? <bdi>{row.contactName}</bdi> : null}
          {row.jobNumber != null ? (
            <>
              {' '}
              · {tr('job', 'عمل')} <span className="ld-num">#{row.jobNumber}</span>
            </>
          ) : null}
        </>
      )}
      leadActions={row =>
        row.source === 'task' &&
        row.kind === 'triage_request' &&
        row.bucket !== 'completed' &&
        row.jobId &&
        onTriage && (
          <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => onTriage(row.jobId)}>
            {tr('Open and triage', 'فتح وفرز')}
          </button>
        )
      }
      trailActions={row =>
        row.jobId ? (
          <button type="button" className="ld-button ld-quiet" onClick={() => onOpenJob(row.jobId)}>
            {tr('Open job', 'فتح العمل')}
          </button>
        ) : (
          row.contactId && (
            <button type="button" className="ld-button ld-quiet" onClick={() => onOpenCustomer(row.contactId)}>
              {tr('Customer’s jobs', 'أعمال العميل')}
            </button>
          )
        )
      }
      empty={[
        'Follow-ups appear when a job’s records call for one, or when a rule in Settings fires.',
        'تظهر المتابعات عندما تتطلبها سجلات عمل، أو عند تفعيل قاعدة في الإعدادات.',
      ]}
    />
  );
}
