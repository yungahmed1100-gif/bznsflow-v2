import React from 'react';
import { label, BUCKET_TONE } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

// Tasks the records close by themselves once the fact is recorded; marking them done would only hide the cause.
const SELF_CLOSING = new Set(['appointment_request', 'approval_waiting', 'past_promise', 'ready_uncollected', 'parts_blocking']);
export const AUTOMOTIVE_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];

const title = (row, ar) => row.source === 'draft' ? `${label('draftKind', row.kind, ar)}${row.ruleId ? ` · ${label('rule', row.ruleId, ar)}` : ''}` : label('task', row.kind, ar);

/** Workshop → Follow-ups. Chats and customer profiles show the same rows for one customer. */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpen, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Tasks the workshop’s records call for, estimates waiting on customers and rule messages, in one queue. Messages that state a recorded fact send by themselves when their rule is Auto.',
      'المهام التي تتطلبها سجلات الورشة وعروض الأسعار بانتظار العملاء ورسائل القواعد في قائمة واحدة. الرسائل التي تذكر حقيقة مسجلة تُرسل تلقائياً عندما تكون قاعدتها «تلقائي».']}
    filters={AUTOMOTIVE_FILTERS} tones={BUCKET_TONE} radioName="au-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'automotive_draft_approve', resolve: 'automotive_task_resolve', snooze: 'automotive_task_snooze' }}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once the workshop records it.', 'تُغلق تلقائياً عندما تُسجّلها الورشة.']}
    meta={row => <>{row.ref ? <bdi>{row.ref}{row.title ? ` · ${row.title}` : ''}</bdi> : null}{row.contactName ? <> · <bdi>{row.contactName}</bdi></> : null}{row.status ? ` · ${label('status', row.status, ar)}` : ''}</>}
    trailActions={row => <>
      {row.workOrderId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.workOrderId)}>{tr('Open work order', 'فتح أمر العمل')}</button>}
      {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </>}
    empty={f => f === 'decision' ? ['Requests to book and messages waiting for the manager appear here.', 'تظهر هنا طلبات الحجز والرسائل بانتظار المدير.']
      : ['Follow-ups appear when a vehicle calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما تتطلبها مركبة، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
