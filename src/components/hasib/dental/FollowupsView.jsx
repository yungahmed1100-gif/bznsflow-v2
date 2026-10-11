import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { QueueFilters, SnoozeControl } from '../workspace/queue.jsx';
import { label, BUCKET_TONE, DENTAL_FILTERS, SELF_CLOSING } from './labels.js';

const title = (row, ar) => row.source === 'draft' ? label('draftKind', row.kind, ar) : label('task', row.kind, ar);

/**
 * Visits → Follow-ups. Hasib opens and closes these by itself; Chats and patient profiles show the
 * same rows. Messages are written automatically and sent only after the manager approves them.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenVisit, onOpenPatient, onBook, patientFilter, onClearPatient }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const queue = data.followups || { items: [], counts: {} };
  const rows = queue.items || [];
  return <>
    <SectionHeader title={tr('Follow-ups', 'المتابعات')} description={tr('Visit requests, unrecorded attendance, missed visits, charges and the messages Hasib wrote, in one queue. Each closes by itself once the fact is recorded. Nothing is sent without the manager’s approval.', 'طلبات الزيارة، والحضور غير المسجل، والزيارات الفائتة، والرسوم، والرسائل التي كتبها حاسب، في قائمة واحدة. تُغلق كل منها تلقائياً عند تسجيل الحقيقة. لا يُرسل شيء دون موافقة المدير.')} />
    {patientFilter && <p className="hb-filter-note" role="status">{tr('Showing one patient’s follow-ups.', 'تُعرض متابعات مريض واحد.')} <button type="button" className="ld-link" onClick={onClearPatient}>{tr('Show all', 'عرض الكل')}</button></p>}
    <QueueFilters ar={ar} filters={DENTAL_FILTERS} counts={queue.counts} filter={filter} tones={BUCKET_TONE} name="dn-followup-filter" labelOf={f => label('bucket', f, ar)} onFilter={onFilter} />
    {rows.length ? <ul className="hb-re-tasks hb-followups">{rows.map(row => <li className="hb-panel" key={`${row.source}:${row.id}`} data-bucket={row.bucket} data-kind={row.kind}>
      <div>
        <b>{title(row, ar)}</b> <span className="ld-chip" data-tone={BUCKET_TONE[row.bucket]}>{label('bucket', row.bucket, ar)}</span>
        <p>{row.contactName ? <bdi>{row.contactName}</bdi> : null}{row.visitStartsAt ? <> · {tr('visit', 'زيارة')} {formatDateTime(row.visitStartsAt, s.lang, timezone)}</> : null}
          {' · '}{row.bucket === 'completed' ? tr('done', 'تم') : tr('due', 'الموعد')} {formatDateTime(row.resolvedAt || row.dueAt, s.lang, timezone)}</p>
        {row.source === 'draft' && <p className="ld-help">{tr('Message status', 'حالة الرسالة')}: {label('draft', row.sendStatus, ar)}</p>}
        {row.text && <blockquote className="hb-draft-text" dir="auto">{row.text}</blockquote>}
        {row.source === 'task' && SELF_CLOSING.has(row.kind) && row.bucket !== 'completed' && <p className="ld-help">{tr('Closes by itself once it is recorded.', 'تُغلق تلقائياً عند تسجيلها.')}</p>}
      </div>
      <div className="ld-actions">
        {manager && row.source === 'draft' && row.sendStatus === 'draft' && <button type="button" className="ld-button ld-primary" disabled={busy}
          onClick={() => act('dental_draft_approve', { draftId: row.id, version: row.version }, null, tr('Send this message to the patient? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى المريض؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.'))}>{tr('Approve and send', 'اعتماد وإرسال')}</button>}
        {row.source === 'task' && row.kind === 'visit_request' && row.bucket !== 'completed' && <button type="button" className="ld-button ld-primary" onClick={() => onBook(row.contactId)}>{tr('Book a visit', 'حجز زيارة')}</button>}
        {row.source === 'task' && row.bucket !== 'completed' && <>
          {row.kind === 'rebook_missed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('dental_task_resolve', { taskId: row.id, reason: 'declined' }, null, tr('The patient does not want another time? The recovery message is withdrawn.', 'المريض لا يريد موعداً آخر؟ تُسحب رسالة الاسترجاع.'))}>{tr('Patient declined', 'رفض المريض')}</button>}
          {!SELF_CLOSING.has(row.kind) && <button type="button" className="ld-button" disabled={busy} onClick={() => act('dental_task_resolve', { taskId: row.id, reason: 'done' })}>{tr('Mark done', 'تم')}</button>}
          <SnoozeControl ar={ar} busy={busy} onSnooze={dueAt => act('dental_task_snooze', { taskId: row.id, version: row.version, dueAt })} />
        </>}
        {row.visitId ? <button type="button" className="ld-button ld-quiet" onClick={() => onOpenVisit(row.visitId)}>{tr('Open visit', 'فتح الزيارة')}</button>
          : row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenPatient(row.contactId)}>{tr('Patient’s visits', 'زيارات المريض')}</button>}
      </div>
    </li>)}</ul> : <EmptyState icon="check" title={tr('Nothing here', 'لا شيء هنا')} description={tr('Follow-ups appear when a visit’s records call for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما تتطلبها سجلات زيارة، أو عند تفعيل قاعدة في الإعدادات.')} />}
  </>;
}
