import React from 'react';
import { formatDate, formatTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label, SEAT_TONE } from './labels.js';

const HOUR = 3600000;

/**
 * The class schedule by day: capacity, roster and waitlist. Check-in, no-show and cancelling a
 * booking are one tap each; a freed place goes to the waitlist by itself.
 */
export function ClassesView({ ar, s, h, timezone, data, manager, busy, act, openForm, onOpenMember, past, onPast }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const items = data.classes?.items || [], now = Date.now();
  const days = new Map();
  for (const c of items) { const d = formatDate(c.startsAt, s.lang, timezone); days.set(d, [...(days.get(d) || []), c]); }
  return <>
    <SectionHeader title={tr('Classes', 'الحصص')} description={tr('Book members and trials, check people in, and record no-shows after the class. A missing check-in stays unknown, never a no-show.', 'احجز للأعضاء والتجارب، وسجّل الحضور، وسجّل الغياب بعد الحصة. الحضور غير المسجل يبقى غير معروف ولا يُعد غياباً.')}
      primary={manager ? { label: tr('Add class', 'إضافة حصة'), onClick: () => openForm('class', { minutes: 60, capacity: 12, classType: 'class' }) } : undefined} />
    <label className="ld-check"><input type="checkbox" checked={past} onChange={e => onPast(e.target.checked)} /> {tr('Include the past week', 'تضمين الأسبوع الماضي')}</label>
    {items.length ? <div className="hb-calendar">{[...days.entries()].map(([day, rows]) => <section key={day} className="hb-calendar-day" aria-label={day}>
      <h3>{day}</h3>
      <ul>{rows.map(c => {
        const live = c.status !== 'cancelled', future = c.startsAt > now, open = live && now >= c.startsAt - HOUR;
        return <li key={c.id} className="hb-panel hb-class" data-status={c.status} data-full={c.booked >= c.capacity ? '' : undefined}>
          <div className="hb-status-line"><b><bdi>{c.title}</bdi></b>
            <span className="ld-num">{formatTime(c.startsAt, s.lang, timezone)}–{formatTime(c.endsAt, s.lang, timezone)}</span>
            <span className="ld-chip" data-tone={!live ? 'coral' : c.booked >= c.capacity ? 'orange' : 'green'}>{!live ? tr('Cancelled', 'ملغاة') : tr(`${c.booked} of ${c.capacity} booked`, `${c.booked} من ${c.capacity} محجوز`)}</span>
            {c.waitlisted > 0 && <span className="ld-chip" data-tone="orange">{tr(`${c.waitlisted} waiting`, `${c.waitlisted} بالانتظار`)}</span>}
            {c.coachName && <small><bdi>{c.coachName}</bdi></small>}</div>
          {c.cancelReason && <p className="ld-help"><bdi>{c.cancelReason}</bdi></p>}
          {c.roster.length > 0 && <ul className="hb-roster">{c.roster.map(x => <li key={x.id} data-tone={SEAT_TONE[x.status]}>
            <button type="button" className="ld-link" onClick={() => onOpenMember(x.contactId)}><bdi>{x.contactName || tr('Customer', 'عميل')}</bdi></button>
            <span className="ld-chip" data-tone={SEAT_TONE[x.status]}>{x.trial ? label('trial', x.status, ar) : label('seat', x.status, ar)}</span>
            {x.status === 'confirmed' && open && <button type="button" className="ld-button" disabled={busy} onClick={() => act('fitness_checkin', { seatId: x.id, fitness: { source: 'instructor' } })}>{tr('Check in', 'تسجيل الحضور')}</button>}
            {x.status === 'confirmed' && c.finished && <button type="button" className="ld-button ld-quiet" disabled={busy}
              onClick={() => act('fitness_seat_status', { seatId: x.id, version: x.version, status: 'no_show' }, null, tr('Record a no-show?', 'تسجيل عدم الحضور؟'))}>{tr('No-show', 'لم يحضر')}</button>}
            {['confirmed', 'waitlisted'].includes(x.status) && future && <button type="button" className="ld-button ld-quiet" disabled={busy}
              onClick={() => act('fitness_seat_status', { seatId: x.id, version: x.version, status: 'cancelled' }, null, tr('Cancel this booking? The place goes to the waitlist.', 'إلغاء هذا الحجز؟ يذهب المكان لقائمة الانتظار.'))}>{tr('Cancel booking', 'إلغاء الحجز')}</button>}
          </li>)}</ul>}
          <div className="ld-actions">
            {live && future && <button type="button" className="ld-button" onClick={() => openForm('book', { classId: c.id, subject: c.title })}>{c.booked >= c.capacity ? tr('Add to waitlist', 'إضافة لقائمة الانتظار') : tr('Book a place', 'حجز مكان')}</button>}
            {manager && live && future && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('cancel_class', { classId: c.id, version: c.version, subject: c.title })}>{tr('Cancel class', 'إلغاء الحصة')}</button>}
          </div>
        </li>;
      })}</ul>
    </section>)}</div> : <EmptyState icon="calendar" title={tr('No classes in these dates', 'لا حصص في هذه الفترة')} description={tr('Add your class schedule to take bookings and trials.', 'أضف جدول حصصك لاستقبال الحجوزات والتجارب.')}
      action={manager ? { label: tr('Add class', 'إضافة حصة'), onClick: () => openForm('class', { minutes: 60, capacity: 12, classType: 'class' }) } : undefined} />}
  </>;
}

/** The plan catalogue: what each membership or class pack is. Prices stay with the manager. */
export function PlansView({ ar, h, data, manager, openForm }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const items = data.plans?.items || [];
  const add = () => openForm('plan', { kind: 'membership', termDays: 30, billingMonths: '1', freezeMaxDays: 14, graceDays: 7, price: '' });
  return <>
    <SectionHeader title={tr('Plans', 'الخطط')} description={tr('Memberships and class packs with their term, freeze allowance and grace. Layla quotes only these.', 'الاشتراكات وباقات الحصص بمدتها وسماح التجميد وفترة السماح. لا تذكر ليلى غيرها.')}
      primary={manager ? { label: tr('Add plan', 'إضافة خطة'), onClick: add } : undefined} />
    {items.length ? <ul className="hb-re-list hb-plans">{items.map(p => <li key={p.id} className="hb-panel" data-active={p.active ? '' : undefined}>
      <div className="hb-status-line"><b><bdi>{p.name}</bdi></b><span className="ld-chip" data-tone={p.active ? 'green' : undefined}>{p.active ? tr('Offered', 'متاحة') : tr('Not offered', 'غير متاحة')}</span></div>
      <p className="ld-help">{label('planKind', p.kind, ar)} · {tr(`${p.termDays} days`, `${p.termDays} يوماً`)}{p.credits ? ` · ${tr(`${p.credits} classes`, `${p.credits} حصص`)}` : ''}
        {p.priceMinor != null ? <> · {h.money(p.priceMinor)} {label('billing', p.billingMonths, ar)}</> : null} · {tr(`freeze up to ${p.freezeMaxDays} days`, `تجميد حتى ${p.freezeMaxDays} يوماً`)} · {tr(`${p.graceDays} days grace`, `سماح ${p.graceDays} أيام`)}</p>
      {manager && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('plan', { planId: p.id, version: p.version, name: p.name, kind: p.kind, termDays: p.termDays, billingMonths: String(p.billingMonths),
        price: (p.priceMinor || 0) / 1000, credits: p.credits || '', freezeMaxDays: p.freezeMaxDays, graceDays: p.graceDays, active: p.active })}>{tr('Edit', 'تعديل')}</button>}
    </li>)}</ul> : <EmptyState icon="receipt" title={tr('No plans yet', 'لا خطط بعد')} description={tr('Add the memberships and class packs you sell.', 'أضف الاشتراكات وباقات الحصص التي تبيعها.')}
      action={manager ? { label: tr('Add plan', 'إضافة خطة'), onClick: add } : undefined} />}
  </>;
}
