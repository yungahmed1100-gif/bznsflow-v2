import React from 'react';
import { label } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

export const FOLLOWUP_FILTERS = ['today', 'overdue', 'scheduled', 'approval', 'blocked', 'completed'];
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
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Tasks the records call for, messages waiting for approval, and dated follow-ups, in one queue. Nothing is sent without the manager’s approval.', 'المهام التي تتطلبها السجلات والرسائل بانتظار الموافقة والمتابعات المؤرخة في قائمة واحدة. لا يُرسل شيء دون موافقة المدير.']}
    scope={dealFilter ? { text: ['Showing one deal’s follow-ups.', 'تُعرض متابعات صفقة واحدة.'], onClear: onClearDeal } : null}
    filters={FOLLOWUP_FILTERS} tones={TONE} radioName="re-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'draft_approve', resolve: 'real_estate_task_resolve', snooze: 'real_estate_task_snooze' }}
    meta={row => <><bdi>{row.contactName || row.propertyLabel || tr('Customer', 'عميل')}</bdi>{row.stage ? ` · ${label('stage', row.stage, ar)}` : ''}{row.channel ? ` · ${label('segmentKey', row.channel, ar)}` : ''}</>}
    notes={row => <>{row.source === 'task' && row.reason && row.kind !== 'followup' && <p className="ld-help">{row.reason}</p>}{row.source === 'followup' && <p className="ld-help">{row.reason}</p>}</>}
    trailActions={row => <>
      {row.opportunityId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenDeal(row.opportunityId)}>{tr('Open deal', 'فتح الصفقة')}</button>}
      {row.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: row.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
      {!row.opportunityId && row.entityType === 'property' && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('work', { view: 'properties' })}>{tr('Open listings', 'فتح العقارات')}</button>}
    </>}
    empty={f => f === 'approval' ? ['Messages written by a rule or an agent wait here for the manager.', 'تنتظر هنا الرسائل التي كتبتها قاعدة أو وكيل حتى يعتمدها المدير.']
      : ['Follow-ups appear when a record calls for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما يتطلبها سجل، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
