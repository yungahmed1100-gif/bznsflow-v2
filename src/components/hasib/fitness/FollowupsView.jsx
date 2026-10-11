import React from 'react';
import { label, BUCKET_TONE, FITNESS_FILTERS, SELF_CLOSING } from './labels.js';
import { QueueList } from '../workspace/QueueList.jsx';

const title = (row, ar) => row.source === 'draft' ? label('draftKind', row.kind, ar) : label('task', row.kind, ar);

/**
 * Memberships → Follow-ups. Hasib opens and closes these by itself; Chats and customer profiles show
 * the same rows. Messages are written automatically and sent only after the manager approves them.
 */
export function FollowupsView({ ar, s, timezone, data, manager, busy, filter, onFilter, act, onOpenMember, onGo, memberFilter, onClearMember }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <QueueList ar={ar} s={s} timezone={timezone} data={data} manager={manager} busy={busy} filter={filter} onFilter={onFilter} act={act}
    description={['Trials to book or convert, payments, unrecorded attendance and the messages Hasib wrote, in one queue. Each closes by itself once the fact is recorded. Nothing is sent without the manager’s approval.', 'التجارب للحجز أو التحويل، والمدفوعات، والحضور غير المسجل، والرسائل التي كتبها حاسب، في قائمة واحدة. تُغلق كل منها تلقائياً عند تسجيل الحقيقة. لا يُرسل شيء دون موافقة المدير.']}
    scope={memberFilter ? { text: ['Showing one member’s follow-ups.', 'تُعرض متابعات عضو واحد.'], onClear: onClearMember } : null}
    filters={FITNESS_FILTERS} tones={BUCKET_TONE} radioName="ft-followup-filter" bucketLabel={b => label('bucket', b, ar)} title={row => title(row, ar)} sendLabel={st => label('draft', st, ar)}
    ops={{ approve: 'fitness_draft_approve', resolve: 'fitness_task_resolve', snooze: 'fitness_task_snooze' }}
    selfClosing={SELF_CLOSING} closesNote={['Closes by itself once it is recorded.', 'تُغلق تلقائياً عند تسجيلها.']}
    meta={row => row.contactName ? <bdi>{row.contactName}</bdi> : row.classTitle ? <bdi>{row.classTitle}</bdi> : null}
    trailActions={row => <>
      {row.contactId && <button type="button" className="ld-button ld-quiet" onClick={() => onOpenMember(row.contactId)}>{tr('Open member', 'فتح العضو')}</button>}
      {row.classId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('work', { view: 'classes', past: '1' })}>{tr('Open classes', 'فتح الحصص')}</button>}
    </>}
    empty={['Follow-ups appear when a member’s records call for one, or when a rule in Settings fires.', 'تظهر المتابعات عندما تتطلبها سجلات عضو، أو عند تفعيل قاعدة في الإعدادات.']} />;
}
