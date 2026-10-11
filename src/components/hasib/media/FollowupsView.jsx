import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { QueueFilters, SnoozeControl } from '../workspace/queue.jsx';
import { label, BUCKET_TONE } from './labels.js';

// Tasks the records close by themselves once the fact is recorded; marking them done would only hide the cause.
const SELF_CLOSING = new Set(['brief_incomplete', 'deposit_missing', 'shoot_at_risk', 'cut_overdue', 'extra_scope_decision', 'hold_expiring', 'hold_conflict', 'shoot_completion_missing', 'costs_not_final', 'delivery_overdue']);
export const MEDIA_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];

/** What a row is: a rule's task, an automatic task, a cut with the client, a message waiting for approval, or a dated follow-up. */
const title = (row, ar) => row.source === 'draft' ? `${label('draftKind', row.kind, ar)}${row.ruleId ? ` · ${label('rule', row.ruleId, ar)}` : ''}` : label('task', row.kind, ar);

/**
 * Productions → Follow-ups. Chats and customer profiles show the same rows for one production.
 * Send status stays apart from the outcome: "delivered" is not an approval or a payment.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpen, onGo, productionFilter, onClearProduction }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const queue = data.followups || { items: [], counts: {} };
  const rows = queue.items || [];
  return <>
    <SectionHeader title={tr('Follow-ups', 'المتابعات')} description={tr('Tasks the records call for, cuts waiting on the client, messages waiting for approval and dated follow-ups, in one queue. Nothing is sent without the manager’s approval.', 'المهام التي تتطلبها السجلات والنسخ بانتظار العميل والرسائل بانتظار الموافقة والمتابعات المؤرخة في قائمة واحدة. لا يُرسل شيء دون موافقة المدير.')} />
    {productionFilter && <p className="hb-filter-note" role="status">{tr('Showing one production’s follow-ups.', 'تُعرض متابعات إنتاج واحد.')} <button type="button" className="ld-link" onClick={onClearProduction}>{tr('Show all', 'عرض الكل')}</button></p>}
    <QueueFilters ar={ar} filters={MEDIA_FILTERS} counts={queue.counts} filter={filter} tones={BUCKET_TONE} name="md-followup-filter" labelOf={f => label('bucket', f, ar)} onFilter={onFilter} />
    {rows.length ? <ul className="hb-re-tasks hb-followups">{rows.map(row => <li className="hb-panel" key={`${row.source}:${row.id}`} data-bucket={row.bucket}>
      <div>
        <b>{title(row, ar)}</b> <span className="ld-chip" data-tone={BUCKET_TONE[row.bucket]}>{label('bucket', row.bucket, ar)}</span>
        <p><bdi>{row.ref} · {row.title}</bdi>{row.contactName ? <> · <bdi>{row.contactName}</bdi></> : null}{row.status ? ` · ${label('status', row.status, ar)}` : ''}
          {' · '}{row.bucket === 'completed' ? tr('done', 'تم') : tr('due', 'الموعد')} {formatDateTime(row.resolvedAt || row.dueAt, s.lang, timezone)}</p>
        {row.source === 'draft' && <p className="ld-help">{tr('Message status', 'حالة الرسالة')}: {label('draft', row.sendStatus, ar)}</p>}
        {row.text && <blockquote className="hb-draft-text" dir="auto">{row.text}</blockquote>}
        {row.source === 'followup' && row.reason && <p className="ld-help">{row.reason}</p>}
        {row.source === 'task' && SELF_CLOSING.has(row.kind) && row.bucket !== 'completed' && <p className="ld-help">{tr('Closes by itself once the production records it.', 'تُغلق تلقائياً عندما يُسجَّل ذلك في الإنتاج.')}</p>}
      </div>
      <div className="ld-actions">
        {manager && row.source === 'draft' && row.sendStatus === 'draft' && <button type="button" className="ld-button ld-primary" disabled={busy}
          onClick={() => act('media_draft_approve', { draftId: row.id, version: row.version }, null, tr('Send this message to the customer? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى العميل؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.'))}>{tr('Approve and send', 'اعتماد وإرسال')}</button>}
        {row.source === 'task' && row.bucket !== 'completed' && <>
          {!SELF_CLOSING.has(row.kind) && <button type="button" className="ld-button" disabled={busy} onClick={() => act('media_task_resolve', { taskId: row.id, reason: 'done' })}>{tr('Mark done', 'تم')}</button>}
          <SnoozeControl ar={ar} busy={busy} onSnooze={dueAt => act('media_task_snooze', { taskId: row.id, version: row.version, dueAt })} />
        </>}
        {row.source === 'followup' && row.bucket !== 'completed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('followup_complete', { requestId: crypto.randomUUID(), followupId: row.id, version: row.version })}>{tr('Mark done', 'تم')}</button>}
        {row.productionId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.productionId)}>{tr('Open production', 'فتح الإنتاج')}</button>}
        {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
      </div>
    </li>)}</ul> : <EmptyState icon="check" title={tr('Nothing here', 'لا شيء هنا')} description={filter === 'decision' ? tr('Extra scope, clashing holds and messages waiting for the manager appear here.', 'يظهر هنا النطاق الإضافي والحجوزات المتعارضة والرسائل بانتظار المدير.')
      : tr('Follow-ups appear when a production calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها إنتاج، أو عند تفعيل قاعدة في الإعدادات.')} />}
  </>;
}
