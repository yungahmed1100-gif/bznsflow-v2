import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { label, STATE_TONE, SEAT_TONE } from './labels.js';

const SECTIONS = [['overview', 'Overview', 'نظرة عامة'], ['attendance', 'Attendance & credits', 'الحضور والرصيد'], ['payments', 'Payments', 'المدفوعات'], ['renewals', 'Renewal history', 'سجل التجديد'], ['followups', 'Follow-ups', 'المتابعات'], ['activity', 'Activity', 'النشاط']];

/**
 * One member's full record: the membership lifecycle, attendance and credits, payments (managers),
 * renewal history, follow-ups and activity. Only actions the current facts allow are offered.
 */
export function MemberRecord({ contactId, ar, h, s, timezone, manager, busy, version, backLabel, act, openForm, onGo, onClose, onFollowups }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(() => hasib('fitness_member', { contactId }), [contactId, version], { interval: 30000 });
  const r = state.data;
  if (!r) return <p className="ld-state" role={state.error ? 'alert' : 'status'}>{state.error ? (h.reason(state.error.reason) || s.reason(state.error.reason)) : s.t('loading')}</p>;
  const m = r.memberships?.find(x => x.id === r.membership?.id) || null;
  const date = ms => ms ? formatDate(ms, s.lang, timezone) : '—', when = ms => ms ? formatDateTime(ms, s.lang, timezone) : '—';
  const name = r.contactName || tr('Customer', 'عميل');
  const subject = `${name}${m ? ` · ${m.planName}` : ''}`;
  const freeze = m?.freezes?.find(f => f.startsAt <= Date.now() && Date.now() < f.endsAt);
  const balance = m ? Math.max(0, (m.totalMinor || 0) - (m.paidMinor || 0)) : 0;
  return <article className="hb-production-record hb-member-record" aria-labelledby="ft-record-title">
    <div className="hb-status-line">
      <button type="button" className="ld-button ld-quiet" onClick={onClose}>{backLabel}</button>
      {r.conversationId && <button type="button" className="ld-button ld-quiet" onClick={() => onGo('chats', { chat: r.conversationId })}>{tr('Open chat', 'فتح المحادثة')}</button>}
    </div>
    <header className="hb-panel" data-tone={STATE_TONE[r.state]}>
      <h2 id="ft-record-title"><bdi>{name}</bdi> <span className="ld-chip" data-tone={STATE_TONE[r.state]}>{label('state', r.state, ar)}</span></h2>
      <p className="ld-help">{m ? <><bdi>{m.planName}</bdi> · {date(m.startsAt)} → {date(m.effectiveEndsAt)}{r.renewalState ? <> · {label('renewal', r.renewalState, ar)}</> : null}</> : r.trial ? label('trial', r.trial.status, ar) : tr('Enquiry, no membership yet', 'استفسار، بلا عضوية بعد')}</p>
      <nav className="hb-record-nav" aria-label={tr('Sections', 'الأقسام')}>{SECTIONS.filter(([id]) => id !== 'payments' || manager).map(([id, en, arabic]) => <a key={id} href={`#ft-${id}`}>{ar ? arabic : en}</a>)}</nav>
      <div className="ld-actions">
        {manager && !m && <button type="button" className="ld-button ld-primary" onClick={() => openForm('membership', { contactId })}>{tr('Add membership', 'إضافة عضوية')}</button>}
        {manager && m && (m.state === 'pending' || balance > 0) && <button type="button" className="ld-button ld-primary" onClick={() => openForm('payment', { membershipId: m.id, amount: balance / 1000, method: 'cash', subject })}>{tr('Record payment', 'تسجيل دفعة')}</button>}
        {m?.state === 'active' && m.kind === 'membership' && <button type="button" className="ld-button" disabled={busy}
          onClick={() => act('fitness_checkin', { contactId, fitness: { source: 'staff' } }, null, tr(`Check ${name} in now?`, `تسجيل حضور ${name} الآن؟`))}>{tr('Check in now', 'تسجيل الحضور الآن')}</button>}
        {manager && m?.state === 'active' && !freeze && m.freezeDaysLeft > 0 && <button type="button" className="ld-button" onClick={() => openForm('freeze', { membershipId: m.id, version: m.version, days: Math.min(7, m.freezeDaysLeft), subject: `${subject} · ${tr(`up to ${m.freezeDaysLeft} days`, `حتى ${m.freezeDaysLeft} يوماً`)}` })}>{tr('Freeze', 'تجميد')}</button>}
        {manager && freeze && <button type="button" className="ld-button" disabled={busy} onClick={() => act('fitness_freeze', { membershipId: m.id, version: m.version, fitness: { end: true } }, null, tr('End the freeze today?', 'إنهاء التجميد اليوم؟'))}>{tr('End freeze', 'إنهاء التجميد')}</button>}
        {manager && m && ['active', 'frozen', 'grace'].includes(m.state) && r.renewalState !== 'renewed' && <button type="button" className="ld-button" onClick={() => openForm('renew', { membershipId: m.id, version: m.version, planId: m.planId, subject })}>{tr('Renew', 'تجديد')}</button>}
        {manager && m && !['cancelled', 'expired'].includes(m.state) && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('cancel', { membershipId: m.id, version: m.version, subject })}>{tr('Cancel membership', 'إلغاء العضوية')}</button>}
        <button type="button" className="ld-button ld-quiet" onClick={() => onGo('work', { view: 'classes' })}>{tr('Book a class', 'حجز حصة')}</button>
      </div>
    </header>

    <section id="ft-overview" aria-labelledby="ft-overview-h"><h3 id="ft-overview-h">{tr('Overview', 'نظرة عامة')}</h3>
      {m ? <dl className="hb-deal-detail">
        <div><dt>{tr('Plan', 'الخطة')}</dt><dd><bdi>{m.planName}</bdi> · {label('planKind', m.kind === 'lessons' ? 'class_pack' : 'membership', ar)}</dd></div>
        <div><dt>{tr('Term', 'المدة')}</dt><dd>{date(m.startsAt)} → {date(m.effectiveEndsAt)}{m.freezes?.length ? <small> · {tr('end moved by freezes', 'نُقل الانتهاء بسبب التجميد')}</small> : null}</dd></div>
        {m.kind === 'lessons' && <div><dt>{tr('Classes left', 'الحصص المتبقية')}</dt><dd className="ld-num">{m.remainingCredits} / {m.initialCredits}</dd></div>}
        <div><dt>{tr('Last attendance', 'آخر حضور')}</dt><dd>{when(m.lastAttendanceAt)}</dd></div>
        {freeze && <div><dt>{tr('Frozen until', 'مجمّد حتى')}</dt><dd>{date(freeze.endsAt)}</dd></div>}
        {manager && <div><dt>{tr('Fee', 'الرسوم')}</dt><dd><Money h={h} minor={m.priceMinor || 0} /> · {label('billing', m.billingMonths || 1, ar)}</dd></div>}
      </dl> : <p className="ld-help">{tr('No membership yet. When they join, add a membership; it starts once it is paid.', 'لا عضوية بعد. عند الانضمام أضف عضوية، وتبدأ عند دفعها.')}</p>}
      {r.trial && <p className="ld-help">{label('trial', r.trial.status, ar)}{r.trial.title ? <> · <bdi>{r.trial.title}</bdi> · {when(r.trial.classStartsAt)}</> : null}</p>}
    </section>

    <section id="ft-attendance" aria-labelledby="ft-attendance-h"><h3 id="ft-attendance-h">{tr('Attendance & credits', 'الحضور والرصيد')}</h3>
      {r.seats?.length ? <ul className="hb-re-list">{r.seats.slice(0, 30).map(x => <li key={x.id} data-tone={SEAT_TONE[x.status]}>
        <bdi>{x.klass?.title || tr('Class', 'حصة')}</bdi> · {when(x.klass?.startsAt)} · <span className="ld-chip" data-tone={SEAT_TONE[x.status]}>{label(x.trial ? 'trial' : 'seat', x.status, ar)}</span>
        {x.attendanceSource ? <small> · {x.attendanceSource}</small> : null}</li>)}</ul> : <p className="ld-help">{tr('No classes booked yet.', 'لا حصص محجوزة بعد.')}</p>}
      {r.visits?.filter(v => !v.seatId).length ? <p className="ld-help">{tr('Open-gym visits', 'زيارات الصالة')}: {r.visits.filter(v => !v.seatId).slice(0, 10).map(v => when(v.attendedAt)).join(' · ')}</p> : null}
    </section>

    {manager && <section id="ft-payments" aria-labelledby="ft-payments-h"><h3 id="ft-payments-h">{tr('Payments', 'المدفوعات')}</h3>
      {r.payments?.length ? <ul className="hb-re-list">{r.payments.map(p => <li key={p.id}><Money h={h} minor={p.amountMinor} /> · {label('method', p.method, ar)} · {when(p.at)}</li>)}</ul>
        : <p className="ld-help">{tr('No payments recorded.', 'لا مدفوعات مسجلة.')}</p>}
      {m && <p className="ld-help">{tr('Paid', 'المدفوع')} <Money h={h} minor={m.paidMinor || 0} /> {tr('of', 'من')} <Money h={h} minor={m.totalMinor || 0} /></p>}
    </section>}

    <section id="ft-renewals" aria-labelledby="ft-renewals-h"><h3 id="ft-renewals-h">{tr('Renewal history', 'سجل التجديد')}</h3>
      {r.memberships?.length ? <ul className="hb-re-list">{r.memberships.map(x => <li key={x.id} data-tone={STATE_TONE[x.state]}><bdi>{x.planName}</bdi> · {date(x.startsAt)} → {date(x.effectiveEndsAt)} ·{' '}
        <span className="ld-chip" data-tone={STATE_TONE[x.state]}>{label('state', x.state, ar)}</span>{x.renewalOfId ? <small> · {tr('renewal', 'تجديد')}</small> : null}{x.cancelReason ? <small> · <bdi>{x.cancelReason}</bdi></small> : null}</li>)}</ul>
        : <p className="ld-help">{tr('Nothing yet.', 'لا شيء بعد.')}</p>}
    </section>

    <section id="ft-followups" aria-labelledby="ft-followups-h"><div className="hb-status-line"><h3 id="ft-followups-h">{tr('Follow-ups', 'المتابعات')}</h3>
      <button type="button" className="ld-button ld-quiet" onClick={onFollowups}>{tr('Open in Follow-ups', 'فتح في المتابعات')}</button></div>
      {r.drafts?.length ? <ul className="hb-re-list">{r.drafts.slice(0, 10).map(d => <li key={d.id}>{label('draftKind', d.kind, ar)} · {label('draft', d.status, ar)} · {when(d.createdAt)}
        <blockquote className="hb-draft-text" dir="auto">{d.text}</blockquote></li>)}</ul> : <p className="ld-help">{tr('No messages drafted for this member.', 'لا رسائل مكتوبة لهذا العضو.')}</p>}
    </section>

    <section id="ft-activity" aria-labelledby="ft-activity-h"><h3 id="ft-activity-h">{tr('Activity', 'النشاط')}</h3>
      {r.activity?.length ? <ol className="hb-re-list">{r.activity.map((x, i) => <li key={i}>{when(x.at)} · {label('activity', x.kind, ar)}{x.detail ? <> · <bdi>{x.detail}</bdi></> : null}</li>)}</ol> : <p className="ld-help">{tr('Nothing yet.', 'لا شيء بعد.')}</p>}
    </section>
  </article>;
}
