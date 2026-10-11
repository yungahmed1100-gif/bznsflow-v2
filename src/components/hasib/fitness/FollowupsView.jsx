import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { QueueFilters, SnoozeControl } from '../workspace/queue.jsx';
import { label, BUCKET_TONE, FITNESS_FILTERS, SELF_CLOSING } from './labels.js';

const title = (row, ar) => row.source === 'draft' ? label('draftKind', row.kind, ar) : label('task', row.kind, ar);

/**
 * Memberships → Follow-ups. Hasib opens and closes these by itself; Chats and customer profiles show
 * the same rows. Messages are written automatically and sent only after the manager approves them.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenMember, onGo, memberFilter, onClearMember }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const queue = data.followups || { items: [], counts: {} };
  const rows = queue.items || [];
  return <>
    <SectionHeader title={tr('Follow-ups', 'المتابعات')} description={tr('Trials to book or convert, payments, unrecorded attendance and the messages Hasib wrote, in one queue. Each closes by itself once the fact is recorded. Nothing is sent without the manager’s approval.', 'التجارب للحجز أو التحويل، والمدفوعات، والحضور غير المسجل، والرسائل التي كتبها حاسب، في قائمة واحدة. تُغلق كل منها تلقائياً عند تسجيل الحقيقة. لا يُرسل شيء دون موافقة المدير.')} />
    {memberFilter && <p className="hb-filter-note" role="status">{tr('Showing one member’s follow-ups.', 'تُعرض متابعات عضو واحد.')} <button type="button" className="ld-link" onClick={onClearMember}>{tr('Show all', 'عرض الكل')}</button></p>}
    <QueueFilters ar={ar} filters={FITNESS_FILTERS} counts={queue.counts} filter={filter} tones={BUCKET_TONE} name="ft-followup-filter" labelOf={f => label('bucket', f, ar)} onFilter={onFilter} />
    {rows.length ? <ul className="hb-re-tasks hb-followups">{rows.map(row => <li className="hb-panel" key={`${row.source}:${row.id}`} data-bucket={row.bucket}>
      <div>
        <b>{title(row, ar)}</b> <span className="ld-chip" data-tone={BUCKET_TONE[row.bucket]}>{label('bucket', row.bucket, ar)}</span>
        <p>{row.contactName ? <bdi>{row.contactName}</bdi> : row.classTitle ? <bdi>{row.classTitle}</bdi> : null}
          {' · '}{row.bucket === 'completed' ? tr('done', 'تم') : tr('due', 'الموعد')} {formatDateTime(row.resolvedAt || row.dueAt, s.lang, timezone)}</p>
        {row.source === 'draft' && <p className="ld-help">{tr('Message status', 'حالة الرسالة')}: {label('draft', row.sendStatus, ar)}</p>}
        {row.text && <blockquote className="hb-draft-text" dir="auto">{row.text}</blockquote>}
        {row.source === 'followup' && row.reason && <p className="ld-help">{row.reason}</p>}
        {row.source === 'task' && SELF_CLOSING.has(row.kind) && row.bucket !== 'completed' && <p className="ld-help">{tr('Closes by itself once it is recorded.', 'تُغلق تلقائياً عند تسجيلها.')}</p>}
      </div>
      <div className="ld-actions">
        {manager && row.source === 'draft' && row.sendStatus === 'draft' && <button type="button" className="ld-button ld-primary" disabled={busy}
          onClick={() => act('fitness_draft_approve', { draftId: row.id, version: row.version }, null, tr('Send this message to the customer? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى العميل؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.'))}>{tr('Approve and send', 'اعتماد وإرسال')}</button>}
        {row.source === 'task' && row.bucket !== 'completed' && <>
          {!SELF_CLOSING.has(row.kind) && <button type="button" className="ld-button" disabled={busy} onClick={() => act('fitness_task_resolve', { taskId: row.id, reason: 'done' })}>{tr('Mark done', 'تم')}</button>}
          <SnoozeControl ar={ar} busy={busy} onSnooze={dueAt => act('fitness_task_snooze', { taskId: row.id, version: row.version, dueAt })} />
        </>}
        {row.source === 'followup' && row.bucket !== 'completed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('followup_complete', { requestId: crypto.randomUUID(), followupId: row.id, version: row.version })}>{tr('Mark done', 'تم')}</button>}
        {row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenMember(row.contactId)}>{tr('Open member', 'فتح العضو')}</button>}
        {row.classId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('work', { view: 'classes', past: '1' })}>{tr('Open classes', 'فتح الحصص')}</button>}
      </div>
    </li>)}</ul> : <EmptyState icon="check" title={tr('Nothing here', 'لا شيء هنا')} description={tr('Follow-ups appear when a member’s records call for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما تتطلبها سجلات عضو، أو عند تفعيل قاعدة في الإعدادات.')} />}
  </>;
}
