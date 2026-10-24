import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AUDIT_CLOSE, AUDIT_OPEN, AUDIT_SLOT_MIN } from '../../../../config/audit.js';
import { INDUSTRIES } from '../../../lib/industries';
import { loadAudits, updateAudit } from '../../../lib/dashboard/api';

const HOUR = 3600000, DAY = 24 * HOUR, MUSCAT = 4 * HOUR, WORK_DAYS = 5;
// Sunday 00:00 Muscat of the week holding `at`, as UTC ms.
const weekStart = at => { const local = at + MUSCAT, day = local - (local % DAY); return day - new Date(day).getUTCDay() * DAY - MUSCAT; };
const ROWS = Array.from({ length: (AUDIT_CLOSE - AUDIT_OPEN) * 60 / AUDIT_SLOT_MIN }, (_, i) => AUDIT_OPEN * HOUR + i * AUDIT_SLOT_MIN * 60000);
const STATUS = { booked: ['Booked', 'محجوز', 'is-yellow'], done: ['Done', 'تم', 'is-green'], cancelled: ['Cancelled', 'ملغى', 'is-muted'] };

/**
 * The founder's free-audit calendar (Ahmed, 2026-10-24): Sunday to Thursday, 10:00–17:00 Muscat, a week at a
 * time. A booking opens its details, where the call is marked done or cancelled. Visitors book at /audit.
 */
export function AuditsView({ s }) {
  const tr = (en, ar) => (s.ar ? ar : en);
  const locale = s.ar ? 'ar-OM-u-nu-latn' : 'en-GB';
  const fmt = useMemo(() => ({
    day: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Muscat' }),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
    full: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
  }), [locale]);
  const [week, setWeek] = useState(() => weekStart(Date.now()));
  const [data, setData] = useState(null), [error, setError] = useState(''), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setData(await loadAudits(week, week + 7 * DAY)); }
    catch (e) { setError(e.reason === 'admin_required' ? tr('Only the BznsFlow admin sees audit bookings.', 'حجوزات التدقيق تظهر لمدير BznsFlow فقط.') : tr('Could not load the bookings.', 'تعذّر تحميل الحجوزات.')); }
  }, [week]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const bookings = data?.bookings || [];
  const byStart = useMemo(() => new Map(bookings.filter(b => b.status !== 'cancelled').map(b => [b.startAt, b])), [bookings]);
  const current = bookings.find(b => b.id === selected);
  useEffect(() => { setNote(current?.adminNote || ''); setSaved(''); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = Array.from({ length: WORK_DAYS }, (_, i) => week + i * DAY);
  const today = weekStart(Date.now()) === week ? Math.floor((Date.now() + MUSCAT) / DAY) : null;
  const industry = id => INDUSTRIES.find(i => i.id === id)?.[s.ar ? 'ar' : 'en'] || id;

  const change = async (patch, message) => {
    setBusy(true); setSaved(''); setError('');
    try { await updateAudit({ bookingId: current.id, ...patch }); await load(); setSaved(message); }
    catch (e) { setError(e.reason === 'slot_taken' ? tr('Someone else has this time now.', 'هذا الوقت محجوز لشخص آخر الآن.') : tr('Could not save. Try again.', 'تعذّر الحفظ. حاول مجددًا.')); }
    finally { setBusy(false); }
  };

  const chip = b => { const [en, ar, tone] = STATUS[b.status]; return <span className={`ld-chip ${tone}`}>{tr(en, ar)}</span>; };
  const cell = (day, offset) => {
    const b = byStart.get(day + offset);
    if (!b) return <td key={day} className="ld-audit-free" />;
    return <td key={day}><button type="button" className={`ld-audit-slot is-${b.status}`} aria-pressed={b.id === selected} onClick={() => setSelected(b.id)}>
      <strong>{b.business || b.name}</strong><span>{b.business ? b.name : b.email}</span>
    </button></td>;
  };

  return (
    <section className="ld-audits" aria-labelledby="ld-audits-title">
      <header className="ld-audits-head">
        <div>
          <h1 id="ld-audits-title">{tr('Free audits', 'التدقيقات المجانية')}</h1>
          <p>{data ? tr(`${data.upcoming} upcoming · booked at`, `${data.upcoming} قادمة · تُحجز من`) : tr('Booked at', 'تُحجز من')} <a href={s.ar ? '/audit' : '/en/audit'} target="_blank" rel="noopener noreferrer" dir="ltr">bznsflowai.com/audit</a></p>
        </div>
        <div className="ld-audits-week" role="group" aria-label={tr('Week', 'الأسبوع')}>
          <button type="button" className="ld-button" onClick={() => setWeek(w => w - 7 * DAY)}>{tr('Previous', 'السابق')}</button>
          <button type="button" className="ld-button" onClick={() => setWeek(weekStart(Date.now()))}>{tr('This week', 'هذا الأسبوع')}</button>
          <button type="button" className="ld-button" onClick={() => setWeek(w => w + 7 * DAY)}>{tr('Next', 'التالي')}</button>
        </div>
      </header>
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {!data && !error ? <p className="ld-state" role="status">{s.t('loading')}</p> : data && <div className="ld-audits-body">
        <div className="ld-audit-grid-wrap">
          <table className="ld-audit-grid">
            <caption className="ld-visually-hidden">{tr('Audit bookings this week, Muscat time', 'حجوزات التدقيق لهذا الأسبوع بتوقيت مسقط')}</caption>
            <thead><tr><th scope="col"><span className="ld-visually-hidden">{tr('Time', 'الوقت')}</span></th>
              {days.map(day => <th key={day} scope="col" className={Math.floor((day + MUSCAT) / DAY) === today ? 'is-today' : undefined}>{fmt.day.format(new Date(day + 12 * HOUR))}</th>)}</tr></thead>
            <tbody>{ROWS.map(offset => <tr key={offset}><th scope="row" dir="ltr">{fmt.time.format(new Date(week + offset))}</th>{days.map(day => cell(day, offset))}</tr>)}</tbody>
          </table>
        </div>
        <ol className="ld-audit-list">
          {days.map(day => {
            const list = bookings.filter(b => b.startAt >= day && b.startAt < day + DAY);
            return <li key={day} className={Math.floor((day + MUSCAT) / DAY) === today ? 'is-today' : undefined}>
              <h2>{fmt.day.format(new Date(day + 12 * HOUR))}</h2>
              {list.length ? <ul>{list.map(b => <li key={b.id}><button type="button" className={`ld-audit-slot is-${b.status}`} aria-pressed={b.id === selected} onClick={() => setSelected(b.id)}>
                <span dir="ltr">{fmt.time.format(new Date(b.startAt))}</span><strong>{b.business || b.name}</strong>{chip(b)}
              </button></li>)}</ul> : <p>{tr('No bookings', 'لا حجوزات')}</p>}
            </li>;
          })}
        </ol>
        {current ? <aside className="ld-audit-detail" aria-labelledby="ld-audit-detail-title">
          <h2 id="ld-audit-detail-title">{current.business || current.name}</h2>
          <p className="ld-num">{fmt.full.format(new Date(current.startAt))} {chip(current)}</p>
          <dl>
            <div><dt>{tr('Name', 'الاسم')}</dt><dd>{current.name}</dd></div>
            <div><dt>{tr('Email', 'البريد')}</dt><dd><a href={`mailto:${current.email}`} dir="ltr">{current.email}</a></dd></div>
            {current.phone && <div><dt>{tr('Phone', 'الهاتف')}</dt><dd><a href={`https://wa.me/${current.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" dir="ltr">{current.phone}</a></dd></div>}
            {current.industry && <div><dt>{tr('Industry', 'المجال')}</dt><dd>{industry(current.industry)}</dd></div>}
            {current.note && <div><dt>{tr('Their note', 'ملاحظتهم')}</dt><dd>{current.note}</dd></div>}
            <div><dt>{tr('Language', 'اللغة')}</dt><dd>{current.lang === 'ar' ? 'العربية' : 'English'}</dd></div>
          </dl>
          <label className="ld-field">{tr('Your note', 'ملاحظتك')}<textarea rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
          <div className="ld-actions">
            {current.status === 'booked' && <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => change({ status: 'done', adminNote: note }, tr('Marked done.', 'تم التعليم كمكتمل.'))}>{tr('Mark done', 'تم التدقيق')}</button>}
            {current.status === 'booked' && <button type="button" className="ld-button" disabled={busy} onClick={() => change({ status: 'cancelled', adminNote: note }, tr('Cancelled. The time is open again.', 'أُلغي الحجز وأصبح الوقت متاحًا.'))}>{tr('Cancel booking', 'ألغِ الحجز')}</button>}
            {current.status !== 'booked' && <button type="button" className="ld-button" disabled={busy} onClick={() => change({ status: 'booked' }, tr('Booked again.', 'أُعيد الحجز.'))}>{tr('Reopen', 'أعد فتحه')}</button>}
            <button type="button" className="ld-button" disabled={busy || note === (current.adminNote || '')} onClick={() => change({ adminNote: note }, tr('Note saved.', 'حُفظت الملاحظة.'))}>{tr('Save note', 'احفظ الملاحظة')}</button>
          </div>
          {saved && <p role="status" className="ld-audit-saved">{saved}</p>}
        </aside> : <p className="ld-audit-hint">{bookings.length ? tr('Open a booking to see its details.', 'افتح حجزًا لعرض تفاصيله.') : tr('No bookings this week yet. Share bznsflowai.com/audit to fill it.', 'لا حجوزات هذا الأسبوع بعد. شارك bznsflowai.com/audit لملئه.')}</p>}
      </div>}
    </section>
  );
}
