import React from 'react';
import { formatDateTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label, VIEWING_NEXT } from './labels.js';

const LIVE = new Set(['requested', 'confirmed']);
const GROUPS = [
  ['missing', 'Outcome to record', 'نتائج يجب تسجيلها', v => LIVE.has(v.status) && v.scheduledAt < Date.now()],
  ['upcoming', 'Upcoming', 'القادمة', v => LIVE.has(v.status) && v.scheduledAt >= Date.now()],
  ['done', 'Attended, missed or cancelled', 'حضر أو فاتت أو أُلغيت', v => !LIVE.has(v.status)],
];

/** Every viewing in one schedule, grouped by what it needs; each opens its deal or chat. */
export function ViewingsView({ ar, s, timezone, data, busy, act, openForm, onOpenDeal, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.viewings?.items || [];
  return <>
    <SectionHeader title={tr('Viewings', 'المعاينات')} description={tr('Confirm upcoming viewings and record each outcome; a viewing that passed without one is listed first.', 'أكّد المعاينات القادمة وسجّل نتيجة كل معاينة؛ تظهر أولاً المعاينات التي مرّ وقتها بلا نتيجة.')}
      primary={{ label: tr('Schedule a viewing', 'جدولة معاينة'), onClick: () => openForm('viewing', {}) }} />
    {rows.length ? GROUPS.map(([id, en, arabic, test]) => {
      const list = rows.filter(test).sort((x, y) => id === 'done' ? y.scheduledAt - x.scheduledAt : x.scheduledAt - y.scheduledAt);
      return list.length ? <section key={id} aria-labelledby={`re-viewings-${id}`} className="hb-viewings">
        <h2 id={`re-viewings-${id}`}>{ar ? arabic : en} <span className="ld-num">{list.length}</span></h2>
        <ul className="hb-re-list">{list.map(v => <li key={v.id} className="hb-panel hb-viewing-row" data-status={id === 'missing' ? 'missing' : v.status}>
          <div>
            <b>{formatDateTime(v.scheduledAt, s.lang, timezone)}</b> · <bdi>{v.propertyLabel}</bdi>{v.location ? ` · ${v.location}` : ''}
            <p><bdi>{v.contactName || tr('Customer', 'عميل')}</bdi> <span className="ld-chip" data-status={v.status}>{label('viewing', v.status, ar)}</span></p>
            {v.outcome && <p className="ld-help">{v.outcome}</p>}
          </div>
          <div className="ld-actions">
            {v.status === 'requested' && v.scheduledAt >= Date.now() && <button type="button" className="ld-button" disabled={busy} onClick={() => act('viewing_save', { viewingId: v.id, version: v.version, workflow: { status: 'confirmed' } })}>{tr('Confirm', 'تأكيد')}</button>}
            {VIEWING_NEXT[v.status] && <button type="button" className={`ld-button ${id === 'missing' ? 'ld-primary' : ''}`} onClick={() => openForm('outcome', { viewingId: v.id, version: v.version, status: 'completed' })}>{tr('Record outcome', 'تسجيل النتيجة')}</button>}
            <button type="button" className="ld-button ld-quiet" onClick={() => onOpenDeal(v.opportunityId)}>{tr('Open deal', 'فتح الصفقة')}</button>
            {v.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: v.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
          </div>
        </li>)}</ul>
      </section> : null;
    }) : <EmptyState icon="calendar" title={tr('No viewings yet', 'لا توجد معاينات بعد')} description={tr('Schedule a viewing from a deal or here; reminders follow the rules in Settings.', 'جدول معاينة من الصفقة أو من هنا؛ تتبع التذكيرات القواعد في الإعدادات.')} />}
  </>;
}
