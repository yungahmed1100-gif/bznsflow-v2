import React from 'react';
import { label, BUCKET_TONE } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

// Tasks the records close by themselves once the fact is recorded; marking them done would only hide the cause.
const SELF_CLOSING = new Set(['materials_due', 'receivable_overdue']);
export const CONSTRUCTION_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const title = (row, ar) => row.source === 'draft' ? `${label('draftKind', row.kind, ar)}${row.ruleId ? ` · ${label('rule', row.ruleId, ar)}` : ''}` : label('task', row.kind, ar);

/** Projects → Follow-ups. Chats and customer profiles show the same rows for one client. */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpen, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Tasks the projects call for, variations waiting on clients and rule messages, in one queue. A variation is a contract change: the client’s yes is recorded and the signed copy stays with you.',
      'المهام التي تتطلبها المشاريع وأوامر التغيير بانتظار العملاء ورسائل القواعد في قائمة واحدة. أمر التغيير تعديل على العقد: تُسجَّل موافقة العميل وتبقى النسخة الموقعة لديك.']}
    filters={CONSTRUCTION_FILTERS} tones={BUCKET_TONE} radioName="cn-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'construction_draft_approve', resolve: 'construction_task_resolve', snooze: 'construction_task_snooze' }}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once the project records it.', 'تُغلق تلقائياً عندما يُسجّل ذلك في المشروع.']}
    meta={row => <>{row.ref ? <bdi>{row.ref}{row.title ? ` · ${row.title}` : ''}</bdi> : null}{row.contactName ? <> · <bdi>{row.contactName}</bdi></> : null}{row.status ? ` · ${label('status', row.status, ar)}` : ''}</>}
    trailActions={row => <>
      {row.projectId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpen(row.projectId)}>{tr('Open projects', 'فتح المشاريع')}</button>}
      {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </>}
    empty={f => f === 'decision' ? ['Enquiries, signed variations and messages waiting for the manager appear here.', 'تظهر هنا الاستفسارات وأوامر التغيير الموقعة والرسائل بانتظار المدير.']
      : ['Follow-ups appear when a project calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها مشروع، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
