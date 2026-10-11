import React from 'react';
import { label, BUCKET_TONE } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

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
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Tasks the records call for, cuts waiting on the client, messages waiting for approval and dated follow-ups, in one queue. Nothing is sent without the manager’s approval.', 'المهام التي تتطلبها السجلات والنسخ بانتظار العميل والرسائل بانتظار الموافقة والمتابعات المؤرخة في قائمة واحدة. لا يُرسل شيء دون موافقة المدير.']}
    scope={productionFilter ? { text: ['Showing one production’s follow-ups.', 'تُعرض متابعات إنتاج واحد.'], onClear: onClearProduction } : null}
    filters={MEDIA_FILTERS} tones={BUCKET_TONE} radioName="md-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'media_draft_approve', resolve: 'media_task_resolve', snooze: 'media_task_snooze' }}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once the production records it.', 'تُغلق تلقائياً عندما يُسجَّل ذلك في الإنتاج.']}
    meta={row => <><bdi>{row.ref} · {row.title}</bdi>{row.contactName ? <> · <bdi>{row.contactName}</bdi></> : null}{row.status ? ` · ${label('status', row.status, ar)}` : ''}</>}
    trailActions={row => <>
      {row.productionId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.productionId)}>{tr('Open production', 'فتح الإنتاج')}</button>}
      {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </>}
    empty={f => f === 'decision' ? ['Extra scope, clashing holds and messages waiting for the manager appear here.', 'يظهر هنا النطاق الإضافي والحجوزات المتعارضة والرسائل بانتظار المدير.']
      : ['Follow-ups appear when a production calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها إنتاج، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
