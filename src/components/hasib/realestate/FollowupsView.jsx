import React, { useState } from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label } from './labels.js';

export const FOLLOWUP_FILTERS = ['today', 'overdue', 'scheduled', 'approval', 'blocked', 'completed'];
const SNOOZE = [['1h', 3600000, 'One hour', 'ساعة'], ['tomorrow', 86400000, 'Tomorrow', 'غداً'], ['week', 7 * 86400000, 'Next week', 'الأسبوع القادم']];
const TONE = { overdue: 'coral', today: 'orange', approval: 'yellow', blocked: 'coral', scheduled: 'blue', completed: 'green' };

/** What a row is: a rule's task, an automatic task, a message waiting for approval, or a dated follow-up. */
function title(row, ar) {
  if (row.source === 'draft') return `${label('draftKind', row.kind, ar)}${row.ruleId ? ` · ${label('rule', row.ruleId, ar)}` : ''}`;
  return label('task', row.kind, ar);
}

/**
 * The one Follow-ups queue for Deals. Chats and customer profiles show the same rows for one deal.
 * Send status is shown apart from the outcome: "delivered" is not a reply, a viewing or a sale.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenDeal, onGo, dealFilter, onClearDeal }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const [snoozing, setSnoozing] = useState(null);
  const queue = data.followups || { items: [], counts: {} };
  const rows = queue.items || [];
  return <>
    <SectionHeader title={tr('Follow-ups', 'المتابعات')} description={tr('Tasks the records call for, messages waiting for approval, and dated follow-ups, in one queue. Nothing is sent without the manager’s approval.', 'المهام التي تتطلبها السجلات والرسائل بانتظار الموافقة والمتابعات المؤرخة في قائمة واحدة. لا يُرسل شيء دون موافقة المدير.')} />
    {dealFilter && <p className="hb-filter-note" role="status">{tr('Showing one deal’s follow-ups.', 'تُعرض متابعات صفقة واحدة.')} <button type="button" className="ld-link" onClick={onClearDeal}>{tr('Show all', 'عرض الكل')}</button></p>}
    <div className="ld-segmented hb-followup-filters" role="radiogroup" aria-label={tr('Show follow-ups', 'عرض المتابعات')}>
      {FOLLOWUP_FILTERS.map(f => <label key={f} data-tone={TONE[f]}><input type="radio" name="re-followup-filter" checked={filter === f} onChange={() => onFilter(f)} />
        <span>{label('bucket', f, ar)} <b className="ld-num">{queue.counts?.[f] ?? 0}</b></span></label>)}
    </div>
    {rows.length ? <ul className="hb-re-tasks hb-followups">{rows.map(row => <li className="hb-panel" key={`${row.source}:${row.id}`} data-bucket={row.bucket}>
      <div>
        <b>{title(row, ar)}</b> <span className="ld-chip" data-tone={TONE[row.bucket]}>{label('bucket', row.bucket, ar)}</span>
        <p><bdi>{row.contactName || row.propertyLabel || tr('Customer', 'عميل')}</bdi>{row.stage ? ` · ${label('stage', row.stage, ar)}` : ''}{row.channel ? ` · ${label('segmentKey', row.channel, ar)}` : ''}
          {' · '}{row.bucket === 'completed' ? tr('done', 'تم') : tr('due', 'الموعد')} {formatDateTime(row.resolvedAt || row.dueAt, s.lang, timezone)}</p>
        {row.source === 'draft' && <p className="ld-help">{tr('Message status', 'حالة الرسالة')}: {label('draft', row.sendStatus, ar)}</p>}
        {row.text && <blockquote className="hb-draft-text" dir="auto">{row.text}</blockquote>}
        {row.source === 'task' && row.reason && row.kind !== 'followup' && <p className="ld-help">{row.reason}</p>}
        {row.source === 'followup' && <p className="ld-help">{row.reason}</p>}
      </div>
      <div className="ld-actions">
        {manager && row.source === 'draft' && row.sendStatus === 'draft' && <button type="button" className="ld-button ld-primary" disabled={busy}
          onClick={() => act('draft_approve', { draftId: row.id, version: row.version }, null, tr('Send this message to the customer? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى العميل؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.'))}>{tr('Approve and send', 'اعتماد وإرسال')}</button>}
        {row.source === 'task' && row.bucket !== 'completed' && <>
          <button type="button" className="ld-button" disabled={busy} onClick={() => act('real_estate_task_resolve', { taskId: row.id, reason: 'done' })}>{tr('Mark done', 'تم')}</button>
          {snoozing === row.id ? <span className="hb-snooze" role="group" aria-label={tr('Snooze until', 'تأجيل حتى')}>{SNOOZE.map(([id, ms, en, arabic]) => <button key={id} type="button" className="ld-button ld-quiet" disabled={busy}
            onClick={() => { setSnoozing(null); act('real_estate_task_snooze', { taskId: row.id, version: row.version, dueAt: Date.now() + ms }); }}>{ar ? arabic : en}</button>)}</span>
            : <button type="button" className="ld-button ld-quiet" onClick={() => setSnoozing(row.id)}>{tr('Snooze', 'تأجيل')}</button>}
        </>}
        {row.source === 'followup' && row.bucket !== 'completed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('followup_complete', { requestId: crypto.randomUUID(), followupId: row.id, version: row.version })}>{tr('Mark done', 'تم')}</button>}
        {row.opportunityId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenDeal(row.opportunityId)}>{tr('Open deal', 'فتح الصفقة')}</button>}
        {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
        {!row.opportunityId && row.entityType === 'property' && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('work', { view: 'properties' })}>{tr('Open listings', 'فتح العقارات')}</button>}
      </div>
    </li>)}</ul> : <EmptyState icon="check" title={tr('Nothing here', 'لا شيء هنا')} description={filter === 'approval' ? tr('Messages written by a rule or an agent wait here for the manager.', 'تنتظر هنا الرسائل التي كتبتها قاعدة أو وكيل حتى يعتمدها المدير.')
      : tr('Follow-ups appear when a record calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها سجل، أو عند تفعيل قاعدة في الإعدادات.')} />}
  </>;
}
