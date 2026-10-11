import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { label, BUCKET_TONE, DENTAL_FILTERS, SELF_CLOSING } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

const title = (row, ar) => row.source === 'draft' ? label('draftKind', row.kind, ar) : label('task', row.kind, ar);

/**
 * Visits → Follow-ups. Hasib opens and closes these by itself; Chats and patient profiles show the
 * same rows. Messages are written automatically and sent only after the manager approves them.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenVisit, onOpenPatient, onBook, patientFilter, onClearPatient }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act} kindAttr
    description={['Visit requests, unrecorded attendance, missed visits, charges and the messages Hasib wrote, in one queue. Each closes by itself once the fact is recorded. Nothing is sent without the manager’s approval.', 'طلبات الزيارة، والحضور غير المسجل، والزيارات الفائتة، والرسوم، والرسائل التي كتبها حاسب، في قائمة واحدة. تُغلق كل منها تلقائياً عند تسجيل الحقيقة. لا يُرسل شيء دون موافقة المدير.']}
    scope={patientFilter ? { text: ['Showing one patient’s follow-ups.', 'تُعرض متابعات مريض واحد.'], onClear: onClearPatient } : null}
    filters={DENTAL_FILTERS} tones={BUCKET_TONE} radioName="dn-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'dental_draft_approve', resolve: 'dental_task_resolve', snooze: 'dental_task_snooze' }}
    approveConfirm={['Send this message to the patient? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى المريض؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.']}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once it is recorded.', 'تُغلق تلقائياً عند تسجيلها.']}
    meta={row => <>{row.contactName ? <bdi>{row.contactName}</bdi> : null}{row.visitStartsAt ? <> · {tr('visit', 'زيارة')} {formatDateTime(row.visitStartsAt, s.lang, timezone)}</> : null}</>}
    leadActions={row => row.source === 'task' && row.kind === 'visit_request' && row.bucket !== 'completed' && <button type="button" className="ld-button ld-primary" onClick={() => onBook(row.contactId)}>{tr('Book a visit', 'حجز زيارة')}</button>}
    taskActions={row => row.kind === 'rebook_missed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('dental_task_resolve', { taskId: row.id, reason: 'declined' }, null, tr('The patient does not want another time? The recovery message is withdrawn.', 'المريض لا يريد موعداً آخر؟ تُسحب رسالة الاسترجاع.'))}>{tr('Patient declined', 'رفض المريض')}</button>}
    trailActions={row => row.visitId ? <button type="button" className="ld-button ld-quiet" onClick={() => onOpenVisit(row.visitId)}>{tr('Open visit', 'فتح الزيارة')}</button>
      : row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenPatient(row.contactId)}>{tr('Patient’s visits', 'زيارات المريض')}</button>}
    empty={['Follow-ups appear when a visit’s records call for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما تتطلبها سجلات زيارة، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
