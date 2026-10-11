import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { formatLocal } from '../../../lib/timezone.js';
import { Money } from '../Badges';
import { label, STATUS_TONE, QUICK_STATUS, STATUS_VERB } from './labels.js';

const SECTIONS = [['overview', 'Overview', 'نظرة عامة'], ['attendance', 'Attendance', 'الحضور'], ['charges', 'Charges', 'الرسوم'], ['recall', 'Recall', 'موعد المراجعة'], ['followups', 'Follow-ups', 'المتابعات'], ['activity', 'Activity', 'النشاط']];

/**
 * One visit's record: the appointment and its attendance, charges and payments (managers), the
 * clinician's recall date, follow-ups and activity. Only actions the current facts allow are offered.
 */
export function VisitRecord({ visitId, ar, h, s, timezone, manager, busy, version, backLabel, act, openForm, onGo, onClose, onOpenVisit, onFollowups }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(() => hasib('dental_visit', { visitId }), [visitId, version], { interval: 30000 });
  const v = state.data;
  if (!v) return <p className="ld-state" role={state.error ? 'alert' : 'status'}>{state.error ? (h.reason(state.error.reason) || s.reason(state.error.reason)) : s.t('loading')}</p>;
  const date = ms => ms ? formatDate(ms, s.lang, timezone) : '—', when = ms => ms ? formatDateTime(ms, s.lang, timezone) : '—';
  const name = v.contactName || tr('Patient', 'مريض'), subject = `${name} · ${when(v.startsAt)}`, now = Date.now();
  const open = ['booked', 'confirmed'].includes(v.status), next = (QUICK_STATUS[v.status] || []).filter(to => to === 'confirmed' ? v.startsAt > now : now >= v.startsAt - 3600000);
  const charges = v.charges, chargeable = manager && ['arrived', 'completed'].includes(v.status) && (!charges || ['returned', 'cancelled'].includes(charges.status));
  const local = ms => formatLocal(ms, timezone).slice(0, 16);
  return <article className="hb-production-record hb-visit-record" aria-labelledby="dn-record-title">
    <div className="hb-status-line">
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{backLabel}</button>
      {v.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: v.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </div>
    <header className="hb-panel" data-tone={STATUS_TONE[v.outcome]}>
      <h2 id="dn-record-title"><bdi>{name}</bdi> <span className="ld-chip" data-tone={STATUS_TONE[v.outcome]}>{label('status', v.outcome, ar)}</span>
        {v.newPatient && <span className="ld-chip" data-tone="blue">{tr('New patient', 'مريض جديد')}</span>}</h2>
      <p className="ld-help">{when(v.startsAt)} · <bdi>{v.providerName}</bdi>{v.chairName ? <> · <bdi>{v.chairName}</bdi></> : null}{v.nextAction ? <> · {label('next', v.nextAction, ar)}</> : null}</p>
      <nav className="hb-record-nav" aria-label={tr('Sections', 'الأقسام')}>{SECTIONS.filter(([id]) => id !== 'charges' || manager).map(([id, en, arabic]) => <a key={id} href={`#dn-${id}`}>{ar ? arabic : en}</a>)}</nav>
      <div className="ld-actions">
        {next.map(to => <button key={to} type="button" className="ld-button ld-primary" disabled={busy} data-to={to} onClick={() => act('dental_visit_status', { visitId: v.id, version: v.version, status: to })}>{STATUS_VERB[to][ar ? 1 : 0]}</button>)}
        {open && v.endsAt <= now && <button type="button" className="ld-button" disabled={busy} data-to="missed" onClick={() => act('dental_visit_status', { visitId: v.id, version: v.version, status: 'missed' }, null, tr('Record that the patient did not come?', 'تسجيل أن المريض لم يحضر؟'))}>{STATUS_VERB.missed[ar ? 1 : 0]}</button>}
        {v.status === 'missed' && <button type="button" className="ld-button" disabled={busy} onClick={() => act('dental_visit_status', { visitId: v.id, version: v.version, status: 'arrived' }, null, tr('Correct this visit to arrived?', 'تصحيح الزيارة إلى «حضر»؟'))}>{tr('They did come', 'حضر فعلاً')}</button>}
        {v.status === 'missed' && v.nextAction === 'rebook' && <button type="button" className="ld-button" onClick={() => openForm('visit', { contactId: v.contactId, providerId: v.providerId, replacementForId: v.id, subject })}>{tr('Book another time', 'حجز وقت آخر')}</button>}
        {chargeable && <button type="button" className="ld-button ld-primary" onClick={() => openForm('charge', { visitId: v.id, version: v.version, subject })}>{tr('Record charges', 'تسجيل الرسوم')}</button>}
        {manager && charges?.balanceMinor > 0 && <button type="button" className="ld-button ld-primary" onClick={() => openForm('payment', { visitId: v.id, amount: charges.balanceMinor / 1000, method: 'cash', subject })}>{tr('Record payment', 'تسجيل دفعة')}</button>}
        {v.status === 'completed' && <button type="button" className="ld-button" onClick={() => openForm('recall', { visitId: v.id, version: v.version, hasRecall: !!v.recallDueAt, recallDate: v.recallDueAt ? local(v.recallDueAt).slice(0, 10) : '', subject })}>{v.recallDueAt ? tr('Change recall date', 'تغيير موعد المراجعة') : tr('Set recall date', 'تحديد موعد المراجعة')}</button>}
        {open && v.startsAt > now && <button type="button" className="ld-button" onClick={() => openForm('reschedule', { visitId: v.id, version: v.version, startsAt: local(v.startsAt), subject })}>{tr('Reschedule', 'إعادة الجدولة')}</button>}
        {open && v.endsAt > now && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('cancel', { visitId: v.id, version: v.version, subject })}>{tr('Cancel visit', 'إلغاء الزيارة')}</button>}
      </div>
    </header>

    <section id="dn-overview" aria-labelledby="dn-overview-h"><h3 id="dn-overview-h">{tr('Overview', 'نظرة عامة')}</h3>
      <dl className="hb-deal-detail">
        <div><dt>{tr('Visit time', 'وقت الزيارة')}</dt><dd>{when(v.startsAt)}</dd></div>
        <div><dt>{tr('Provider', 'مقدم الخدمة')}</dt><dd><bdi>{v.providerName || '—'}</bdi></dd></div>
        {v.serviceName && <div><dt>{tr('Service', 'الخدمة')}</dt><dd><bdi>{v.serviceName}</bdi></dd></div>}
        <div><dt>{tr('Booked through', 'طريقة الحجز')}</dt><dd>{label('source', v.source, ar)}</dd></div>
        {v.forMinor && <div><dt>{tr('Guardian', 'ولي الأمر')}</dt><dd><bdi>{v.guardianName || '—'}</bdi></dd></div>}
        {v.rescheduleCount > 0 && <div><dt>{tr('Rescheduled', 'أُعيدت جدولته')}</dt><dd className="ld-num">{v.rescheduleCount}</dd></div>}
        {v.cancelReason && <div><dt>{tr('Cancelled', 'أُلغي')}</dt><dd>{label('cancel', v.cancelReason, ar)}{v.lateCancel ? ` · ${tr('late', 'متأخر')}` : ''}</dd></div>}
      </dl>
    </section>

    <section id="dn-attendance" aria-labelledby="dn-attendance-h"><h3 id="dn-attendance-h">{tr('Attendance', 'الحضور')}</h3>
      <p className="ld-help">{label('status', v.outcome, ar)}{v.outcome === 'unknown' ? ` · ${tr('record whether the patient came; it is never assumed', 'سجّل ما إذا حضر المريض؛ لا يُفترض ذلك أبداً')}` : ''}</p>
      {v.history?.length ? <ul className="hb-re-list">{v.history.slice(0, 10).map(x => <li key={x.id} data-tone={STATUS_TONE[x.outcome]}>
        <button type="button" className="ld-link" onClick={() => onOpenVisit(x.id)}>{when(x.startsAt)}</button> · <bdi>{x.providerName}</bdi> · <span className="ld-chip" data-tone={STATUS_TONE[x.outcome]}>{label('status', x.outcome, ar)}</span></li>)}</ul>
        : <p className="ld-help">{tr('First visit on record.', 'أول زيارة مسجلة.')}</p>}
    </section>

    {manager && <section id="dn-charges" aria-labelledby="dn-charges-h"><h3 id="dn-charges-h">{tr('Charges', 'الرسوم')}</h3>
      {charges ? <>
        <ul className="hb-re-list">{charges.lines.map((l, i) => <li key={i}><bdi>{(ar ? l.nameAr : l.nameEn) || l.name}</bdi> × <span className="ld-num">{l.qty}</span> · <Money h={h} minor={l.totalMinor} /></li>)}</ul>
        <p className="ld-help">{tr('Paid', 'المدفوع')} <Money h={h} minor={charges.paidMinor} /> {tr('of', 'من')} <Money h={h} minor={charges.totalMinor} />
          {v.money?.chargeDueAt ? <> · {tr('due', 'مستحق')} {date(v.money.chargeDueAt)}</> : null}{v.money?.overdue ? <> · <b>{tr('past due', 'متأخر')}</b></> : null}</p>
        {charges.payments.length > 0 && <ul className="hb-re-list">{charges.payments.map(p => <li key={p.id}><Money h={h} minor={p.amountMinor} /> · {label('method', p.method, ar)} · {when(p.at)}</li>)}</ul>}
        {charges.balanceMinor > 0 && <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => act('dental_charge_dispute', { visitId: v.id, version: v.version, dental: { disputed: !v.money?.disputed } })}>
          {v.money?.disputed ? tr('Dispute resolved', 'انتهى النزاع') : tr('Patient disputes the balance', 'المريض يعترض على الرصيد')}</button>}
      </> : <p className="ld-help">{tr('No charges recorded yet.', 'لا رسوم مسجلة بعد.')}</p>}
    </section>}

    <section id="dn-recall" aria-labelledby="dn-recall-h"><h3 id="dn-recall-h">{tr('Recall', 'موعد المراجعة')}</h3>
      <p className="ld-help">{v.recallDueAt ? <>{tr('Recall date set by the clinician', 'موعد المراجعة الذي حدده الطبيب')}: <b>{date(v.recallDueAt)}</b></> : tr('No recall date. Only the clinician sets one; Hasib never suggests it.', 'لا موعد مراجعة. يحدده الطبيب فقط، ولا يقترحه حاسب أبداً.')}</p>
    </section>

    <section id="dn-followups" aria-labelledby="dn-followups-h"><div className="hb-status-line"><h3 id="dn-followups-h">{tr('Follow-ups', 'المتابعات')}</h3>
      <button type="button" className="ld-button ld-quiet" onClick={onFollowups}>{tr('Open in Follow-ups', 'فتح في المتابعات')}</button></div>
      {v.drafts?.length ? <ul className="hb-re-list">{v.drafts.slice(0, 10).map(d => <li key={d.id}>{label('draftKind', d.kind, ar)} · {label('draft', d.status, ar)} · {when(d.createdAt)}
        <blockquote className="hb-draft-text" dir="auto">{d.text}</blockquote></li>)}</ul> : <p className="ld-help">{tr('No messages drafted for this visit.', 'لا رسائل مكتوبة لهذه الزيارة.')}</p>}
    </section>

    <section id="dn-activity" aria-labelledby="dn-activity-h"><h3 id="dn-activity-h">{tr('Activity', 'النشاط')}</h3>
      {v.activity?.length ? <ol className="hb-re-list">{v.activity.map((x, i) => <li key={i}>{when(x.at)} · {label('activity', x.kind, ar)}
        {x.detail && ['rescheduled', 'recall_set'].includes(x.kind) ? <> · {x.kind === 'recall_set' ? date(Number(x.detail)) : when(Number(x.detail))}</> : x.detail && x.kind === 'cancelled' ? <> · {label('cancel', x.detail, ar)}</> : null}</li>)}</ol>
        : <p className="ld-help">{tr('Nothing yet.', 'لا شيء بعد.')}</p>}
    </section>
  </article>;
}
