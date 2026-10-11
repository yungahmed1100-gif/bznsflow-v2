import React from 'react';
import { formatDay, formatTime } from '../../../lib/dashboard/format';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { label, STATUS_TONE } from './labels.js';

const dayKey = (ms, timezone) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);

/**
 * The shoot calendar: shoots and crew/equipment holds day by day for the next two weeks.
 * Confirmed and tentative holds look different; two holds on one resource at once are flagged.
 */
export function CalendarView({ ar, s, timezone, data, onOpen }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const cal = data.calendar || { holds: [], shoots: [] };
  const days = new Map();
  const add = (at, item) => { const k = dayKey(at, timezone); days.set(k, [...(days.get(k) || []), item]); };
  for (const sh of cal.shoots || []) add(sh.startsAt, { kind: 'shoot', at: sh.startsAt, ...sh });
  for (const h of cal.holds || []) add(h.startsAt, { kind: 'hold', at: h.startsAt, ...h });
  const sorted = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
  return <>
    <SectionHeader title={tr('Shoot calendar', 'جدول التصوير')} description={tr('Shoots and crew or equipment holds for the next two weeks. A tentative hold is not a booking until it is confirmed.', 'التصويرات وحجوزات الطاقم والمعدات للأسبوعين القادمين. الحجز المبدئي ليس حجزاً حتى يُؤكد.')} />
    {sorted.length ? <div className="hb-calendar">{sorted.map(([k, items]) => <section key={k} className="hb-calendar-day" aria-labelledby={`md-day-${k}`}>
      <h3 id={`md-day-${k}`}>{formatDay(items[0].at, s.lang, timezone)}</h3>
      <ul>{items.sort((x, y) => x.at - y.at).map(item => item.kind === 'shoot'
        ? <li key={`s:${item.id}`} className="hb-calendar-item" data-kind="shoot" data-tone={STATUS_TONE[item.status]}>
          <span className="ld-num">{formatTime(item.startsAt, s.lang, timezone)}{item.endsAt ? `–${formatTime(item.endsAt, s.lang, timezone)}` : ''}</span>
          <button type="button" className="ld-link" onClick={() => onOpen(item.id)}><bdi>{item.ref} · {item.title}</bdi></button>
          <span>{tr('Shoot', 'تصوير')}{item.location ? ` · ${item.location}` : ''} · {label('status', item.status, ar)}</span></li>
        : <li key={`h:${item.id}`} className="hb-calendar-item" data-kind="hold" data-hold={item.status} data-conflict={item.conflict ? '' : undefined}>
          <span className="ld-num">{formatTime(item.startsAt, s.lang, timezone)}–{formatTime(item.endsAt, s.lang, timezone)}</span>
          <span><b><bdi>{item.resourceName}</bdi></b> · {label('category', item.resourceCategory, ar)}</span>
          <span><span className="ld-chip" data-tone={item.status === 'confirmed' ? 'green' : 'yellow'}>{label('hold', item.status, ar)}</span>{' '}
            <button type="button" className="ld-link" onClick={() => onOpen(item.productionId)}><bdi>{item.productionRef}</bdi></button>
            {item.conflict && <b className="hb-warn"> · {tr('Clashes with another hold', 'يتعارض مع حجز آخر')}</b>}</span></li>)}</ul>
    </section>)}</div>
      : <EmptyState icon="calendar" title={tr('Nothing scheduled', 'لا شيء مجدول')} description={tr('Shoots appear here once a brief has dates, and holds once crew or equipment is reserved.', 'تظهر التصويرات هنا عندما يكون للموجز موعد، والحجوزات عند حجز الطاقم أو المعدات.')} />}
  </>;
}
