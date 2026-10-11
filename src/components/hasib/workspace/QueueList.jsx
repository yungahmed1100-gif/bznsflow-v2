import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { QueueFilters, SnoozeControl } from './queue.jsx';

const NONE = new Set();
const defaultNotes = row => row.source === 'followup' && row.reason ? <p className="ld-help">{row.reason}</p> : null;

/**
 * A sector's Follow-ups queue: the filter row, then one panel per task, draft or dated follow-up
 * with the actions its state allows. The sector supplies its words, operations and extra buttons.
 * @param {object} p
 * @param {[string,string]} p.description EN/AR description under the heading
 * @param {{ text: [string,string], onClear: () => void } | null} [p.scope] "showing one record's follow-ups" note
 * @param {string[]} p.filters bucket ids in order; @param {Record<string,string>} p.tones bucket → tone
 * @param {string} p.radioName the filter radio group's name (e.g. 'ft-followup-filter')
 * @param {(bucket:string) => string} p.bucketLabel; @param {(row) => string} p.title; @param {(row) => React.ReactNode} p.meta the line before the due time
 * @param {(status:string) => string} p.sendLabel a draft's send status
 * @param {{ approve: string, resolve: string, snooze: string }} p.ops the sector's operations
 * @param {Set<string>} [p.selfClosing] task kinds that close themselves; @param {[string,string]} [p.closesNote] the note shown on them
 * @param {(row) => React.ReactNode} [p.notes] notes after the draft text (default: a dated follow-up's reason)
 * @param {(row) => React.ReactNode} [p.leadActions] buttons after Approve; [p.taskActions] first in an open task's group; [p.trailActions] last
 * @param {[string,string] | (filter:string) => [string,string]} p.empty EN/AR description when the filter is empty
 * @param {boolean} [p.kindAttr] mark each row with data-kind (Dental's rows carry it)
 */
export function QueueList({ ar, s, timezone, data, manager, busy, filter, onFilter, act, description, scope, filters, tones, radioName, bucketLabel, title, meta, sendLabel,
  ops, selfClosing = NONE, closesNote, kindAttr = false, notes = defaultNotes, leadActions, taskActions, trailActions, empty, approveConfirm }) {
  const tr = (en, arabic) => (ar ? arabic : en), pick = pair => pair[ar ? 1 : 0];
  const queue = data.followups || { items: [], counts: {} };
  const rows = queue.items || [];
  const emptyText = typeof empty === 'function' ? empty(filter) : empty;
  return <>
    <SectionHeader title={tr('Follow-ups', 'المتابعات')} description={pick(description)} />
    {scope && <p className="hb-filter-note" role="status">{pick(scope.text)} <button type="button" className="ld-link" onClick={scope.onClear}>{tr('Show all', 'عرض الكل')}</button></p>}
    <QueueFilters ar={ar} filters={filters} counts={queue.counts} filter={filter} tones={tones} name={radioName} labelOf={bucketLabel} onFilter={onFilter} />
    {rows.length ? <ul className="hb-re-tasks hb-followups">{rows.map(row => <li className="hb-panel" key={`${row.source}:${row.id}`} data-bucket={row.bucket} data-kind={kindAttr ? row.kind : undefined}>
      <div>
        <b>{title(row)}</b> <span className="ld-chip" data-tone={tones[row.bucket]}>{bucketLabel(row.bucket)}</span>
        <p>{meta(row)}{' · '}{row.bucket === 'completed' ? tr('done', 'تم') : tr('due', 'الموعد')} {formatDateTime(row.resolvedAt || row.dueAt, s.lang, timezone)}</p>
        {row.source === 'draft' && <p className="ld-help">{tr('Message status', 'حالة الرسالة')}: {sendLabel(row.sendStatus)}</p>}
        {row.text && <blockquote className="hb-draft-text" dir="auto">{row.text}</blockquote>}
        {notes(row)}
        {closesNote && row.source === 'task' && selfClosing.has(row.kind) && row.bucket !== 'completed' && <p className="ld-help">{pick(closesNote)}</p>}
      </div>
      <div className="ld-actions">
        {manager && row.source === 'draft' && row.sendStatus === 'draft' && <button type="button" className="ld-button ld-primary" disabled={busy}
          onClick={() => act(ops.approve, { draftId: row.id, version: row.version }, null, pick(approveConfirm || ['Send this message to the customer? Outside the 24-hour window it needs an approved template.', 'إرسال هذه الرسالة إلى العميل؟ خارج نافذة ٢٤ ساعة تحتاج قالباً معتمداً.']))}>{tr('Approve and send', 'اعتماد وإرسال')}</button>}
        {leadActions && leadActions(row)}
        {row.source === 'task' && row.bucket !== 'completed' && <>
          {taskActions && taskActions(row)}
          {!selfClosing.has(row.kind) && <button type="button" className="ld-button" disabled={busy} onClick={() => act(ops.resolve, { taskId: row.id, reason: 'done' })}>{tr('Mark done', 'تم')}</button>}
          <SnoozeControl ar={ar} busy={busy} onSnooze={dueAt => act(ops.snooze, { taskId: row.id, version: row.version, dueAt })} />
        </>}
        {row.source === 'followup' && row.bucket !== 'completed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('followup_complete', { requestId: crypto.randomUUID(), followupId: row.id, version: row.version })}>{tr('Mark done', 'تم')}</button>}
        {trailActions && trailActions(row)}
      </div>
    </li>)}</ul> : <EmptyState icon="check" title={tr('Nothing here', 'لا شيء هنا')} description={pick(emptyText)} />}
  </>;
}
