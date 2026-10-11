import React from 'react';
import { formatDate, formatDateTime, formatTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { Money } from '../Badges';
import { label, STATUS_TONE, QUICK, QUICK_STATUS, STATUS_VERB } from './labels.js';

const DAY = 86400000;

/** One-tap facts for a visit row: the next status its state allows, and Missed once its time has passed. */
function RowActions({ v, ar, busy, act }) {
  const now = Date.now(), started = now >= v.startsAt - 3600000;
  const next = (QUICK_STATUS[v.status] || []).filter(to => to === 'confirmed' ? v.startsAt > now : started);
  const missed = ['booked', 'confirmed'].includes(v.status) && v.endsAt <= now;
  return <>{next.map(to => <button key={to} type="button" className="ld-button" disabled={busy} data-to={to}
    onClick={() => act('dental_visit_status', { visitId: v.id, version: v.version, status: to })}>{STATUS_VERB[to][ar ? 1 : 0]}</button>)}
    {missed && <button type="button" className="ld-button ld-quiet" disabled={busy} data-to="missed"
      onClick={() => act('dental_visit_status', { visitId: v.id, version: v.version, status: 'missed' }, null, ar ? 'تسجيل أن المريض لم يحضر؟' : 'Record that the patient did not come?')}>{STATUS_VERB.missed[ar ? 1 : 0]}</button>}</>;
}

function Patient({ v, ar, onOpen }) {
  return <><button type="button" className="ld-link hb-visit-open" onClick={() => onOpen(v.id)}><bdi>{v.contactName || (ar ? 'مريض' : 'Patient')}</bdi></button>
    {v.newPatient && <span className="ld-chip" data-tone="blue">{ar ? 'جديد' : 'New'}</span>}
    {v.forMinor && <span className="ld-chip">{ar ? 'قاصر' : 'Minor'}</span>}</>;
}

/**
 * The day schedule, one column per provider: visit time, patient, status and next action, with
 * one-tap Confirm / Arrived / Completed / Missed. A past visit with no outcome reads "not recorded".
 */
export function ScheduleView({ ar, s, timezone, data, busy, act, day, onDay, onOpen, onAdd }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const items = (data.visits?.items || []).filter(v => v.status !== 'cancelled');
  const cancelled = (data.visits?.items || []).filter(v => v.status === 'cancelled');
  const providers = new Map();
  for (const v of items) providers.set(v.providerName || '—', [...(providers.get(v.providerName || '—') || []), v]);
  return <>
    <SectionHeader title={tr('Day schedule', 'جدول اليوم')} description={tr('Record each fact as it happens: confirmed, arrived, completed or missed. Hasib opens and closes the follow-ups by itself.', 'سجّل كل حقيقة عند حدوثها: مؤكد أو وصل أو اكتمل أو فات. يفتح حاسب المتابعات ويغلقها تلقائياً.')} />
    <div className="hb-day-nav" role="group" aria-label={tr('Day', 'اليوم')}>
      <button type="button" className="ld-button ld-quiet" onClick={() => onDay(day - DAY)}>{tr('Previous day', 'اليوم السابق')}</button>
      <b className="hb-day-label">{formatDate(day, s.lang, timezone)}</b>
      <button type="button" className="ld-button ld-quiet" onClick={() => onDay(day + DAY)}>{tr('Next day', 'اليوم التالي')}</button>
      <button type="button" className="ld-button ld-quiet" onClick={() => onDay(null)}>{tr('Today', 'اليوم')}</button>
    </div>
    {items.length ? <div className="hb-schedule">{[...providers.entries()].map(([provider, rows]) => <section key={provider} className="hb-schedule-col" aria-label={provider}>
      <h3><bdi>{provider}</bdi> <small className="ld-num">{rows.length}</small></h3>
      <ul>{rows.map(v => <li key={v.id} className="hb-panel hb-visit" data-tone={STATUS_TONE[v.outcome]} data-status={v.outcome}>
        <div className="hb-status-line"><span className="ld-num">{formatTime(v.startsAt, s.lang, timezone)}–{formatTime(v.endsAt, s.lang, timezone)}</span>
          <span className="ld-chip" data-tone={STATUS_TONE[v.outcome]}>{label('status', v.outcome, ar)}</span></div>
        <p><Patient v={v} ar={ar} onOpen={onOpen} />{v.chairName ? <small> · <bdi>{v.chairName}</bdi></small> : null}{v.serviceName ? <small> · <bdi>{v.serviceName}</bdi></small> : null}</p>
        {v.nextAction && <p className="ld-help">{label('next', v.nextAction, ar)}</p>}
        <div className="ld-actions"><RowActions v={v} ar={ar} busy={busy} act={act} /></div>
      </li>)}</ul>
    </section>)}</div> : <EmptyState icon="calendar" title={tr('No visits this day', 'لا زيارات في هذا اليوم')} description={tr('Layla’s visit requests wait in Follow-ups; book them here.', 'تنتظر طلبات الزيارة من ليلى في المتابعات؛ احجزها من هنا.')}
      action={onAdd ? { label: tr('Add visit', 'إضافة زيارة'), onClick: onAdd } : undefined} />}
    {cancelled.length > 0 && <p className="ld-help">{tr(`${cancelled.length} cancelled this day`, `${cancelled.length} ملغاة في هذا اليوم`)}</p>}
  </>;
}

/** The visit list with the four quick filters: visit time, patient, provider, status and next action. */
export function VisitList({ ar, s, h, timezone, data, quick, onQuick, onOpen, selectedId, busy, act, onAdd }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.visits?.items || [];
  const shown = quick === 'all' ? rows : rows.filter(r => r.flags[quick]);
  return <>
    <div className="hb-board-filters">
      <div className="ld-segmented" role="radiogroup" aria-label={tr('Show visits', 'عرض الزيارات')}>
        {QUICK.map(q => <label key={q}><input type="radio" name="dn-quick" checked={quick === q} onChange={() => onQuick(q)} />
          <span>{label('quick', q, ar)} {q !== 'all' && <b className="ld-num">{rows.filter(r => r.flags[q]).length}</b>}</span></label>)}
      </div>
    </div>
    {data.visits?.complete === false && <p className="hb-warn" role="status">{tr('Showing the newest 500 visits.', 'تُعرض أحدث ٥٠٠ زيارة.')}</p>}
    {shown.length ? <div className="ld-table-wrap"><table className="ld-table hb-visits">
      <thead><tr><th>{tr('Visit time', 'وقت الزيارة')}</th><th>{tr('Patient', 'المريض')}</th><th>{tr('Provider', 'مقدم الخدمة')}</th><th>{tr('Status', 'الحالة')}</th><th>{tr('Next action', 'الإجراء التالي')}</th></tr></thead>
      <tbody>{shown.map(v => <tr key={v.id} data-tone={STATUS_TONE[v.outcome]} aria-selected={selectedId === v.id}>
        <td data-label={tr('Visit time', 'وقت الزيارة')} className="ld-num">{formatDateTime(v.startsAt, s.lang, timezone)}</td>
        <td data-label={tr('Patient', 'المريض')}><Patient v={v} ar={ar} onOpen={onOpen} /></td>
        <td data-label={tr('Provider', 'مقدم الخدمة')}><bdi>{v.providerName || '—'}</bdi></td>
        <td data-label={tr('Status', 'الحالة')}><span className="ld-chip" data-tone={STATUS_TONE[v.outcome]}>{label('status', v.outcome, ar)}</span></td>
        <td data-label={tr('Next action', 'الإجراء التالي')}>{v.nextAction ? label('next', v.nextAction, ar) : '—'}
          {v.money?.balanceMinor ? <small> · <Money h={h} minor={v.money.balanceMinor} /></small> : null} <RowActions v={v} ar={ar} busy={busy} act={act} /></td>
      </tr>)}</tbody>
    </table></div> : <EmptyState icon="calendar" title={quick === 'all' ? tr('No visits yet', 'لا زيارات بعد') : tr('No visits in this filter', 'لا زيارات في هذا التصنيف')}
      description={quick === 'all' ? tr('Book a visit, or wait for Layla’s requests.', 'احجز زيارة، أو انتظر طلبات ليلى.') : tr('Try another filter.', 'جرّب تصنيفاً آخر.')}
      action={quick === 'all' && onAdd ? { label: tr('Add visit', 'إضافة زيارة'), onClick: onAdd } : undefined} />}
  </>;
}

/** The quick-look drawer at wide widths; the full record is one click away. */
export function VisitPreview({ row, ar, s, timezone, onOpenFull, onClose }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return <aside className="hb-panel hb-deal-preview" aria-label={tr('Visit preview', 'معاينة الزيارة')}>
    <div className="hb-status-line"><b><bdi>{row.contactName || tr('Patient', 'مريض')}</bdi></b><button type="button" className="ld-button ld-quiet" onClick={onClose}>{tr('Close', 'إغلاق')}</button></div>
    <p><span className="ld-chip" data-tone={STATUS_TONE[row.outcome]}>{label('status', row.outcome, ar)}</span></p>
    <p className="ld-help">{formatDateTime(row.startsAt, s.lang, timezone)} · <bdi>{row.providerName}</bdi></p>
    {row.nextAction && <p className="ld-help">{label('next', row.nextAction, ar)}</p>}
    <button type="button" className="ld-button ld-primary" onClick={() => onOpenFull(row.id)}>{tr('Open full record', 'فتح السجل كاملاً')}</button>
  </aside>;
}
