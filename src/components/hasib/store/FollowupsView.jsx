import React from 'react';
import { label, BUCKET_TONE } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

// Tasks the records close by themselves once the fact is recorded; marking them done would only hide the cause.
const SELF_CLOSING = new Set(['low_stock', 'ready_uncollected', 'repair_ready_uncollected']);
export const STORE_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];

const title = (row, ar) => row.source === 'draft' ? `${label('draftKind', row.kind, ar)}${row.ruleId ? ` · ${label('rule', row.ruleId, ar)}` : ''}` : label('task', row.kind, ar);

/** Orders (or Store & repairs) → Follow-ups. Chats and customer profiles show the same rows for one customer. */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenOrder, onOpenRepair, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Tasks the store’s records call for, quotes waiting on customers and rule messages, in one queue. Messages that state a recorded fact send by themselves when their rule is Auto.',
      'المهام التي تتطلبها سجلات المتجر والعروض بانتظار العملاء ورسائل القواعد في قائمة واحدة. الرسائل التي تذكر حقيقة مسجلة تُرسل تلقائياً عندما تكون قاعدتها «تلقائي».']}
    filters={STORE_FILTERS} tones={BUCKET_TONE} radioName="st-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'store_draft_approve', resolve: 'store_task_resolve', snooze: 'store_task_snooze' }}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once the store records it.', 'تُغلق تلقائياً عندما يسجّلها المتجر.']}
    meta={row => <>{row.ref ? <bdi>{row.ref}{row.title ? ` · ${row.title}` : ''}</bdi> : null}{row.contactName ? <> · <bdi>{row.contactName}</bdi></> : null}</>}
    trailActions={row => <>
      {row.orderId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenOrder(row.orderId)}>{tr('Open order', 'فتح الطلب')}</button>}
      {row.repairId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenRepair(row.repairId)}>{tr('Open repair', 'فتح الصيانة')}</button>}
      {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </>}
    empty={f => f === 'decision' ? ['Orders Layla could not confirm, repair questions and messages waiting for the manager appear here.', 'تظهر هنا الطلبات التي لم تؤكدها ليلى واستفسارات الصيانة والرسائل بانتظار المدير.']
      : ['Follow-ups appear when an order or repair calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها طلب أو صيانة، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
