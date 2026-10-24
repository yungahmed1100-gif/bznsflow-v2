import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { INDUSTRIES } from '../lib/industries';
import { AUDIT_SLOT_MIN } from '../../config/audit.js';
import '../styles/legal.css';
import '../styles/audit.css';

const COPY = {
  en: {
    title: 'Book your free business audit',
    lead: `${AUDIT_SLOT_MIN} minutes with Ahmed about your business and what happens to your customer inquiries today. Free, with no commitment.`,
    zone: 'Times are Muscat time (GMT+4).',
    day: '1. Pick a day', time: '2. Pick a time', details: '3. Your details',
    loading: 'Loading open times…', none: 'No open times in the next three weeks. Message us on WhatsApp instead.',
    failed: 'Could not load the open times.', retry: 'Try again',
    name: 'Your name', email: 'Email', phone: 'Phone / WhatsApp (optional)', business: 'Business name (optional)', industry: 'Industry (optional)',
    pickIndustry: 'Choose one', note: 'What would you like to look at? (optional)', book: 'Book the audit', booking: 'Booking…',
    chosen: 'Your time', change: 'Change',
    done: 'Booked', doneLead: 'We’ll email you from ahmed@bznsflowai.com before the call to confirm how we meet.', another: 'Back to the home page',
    errors: { slot_taken: 'That time was just taken. Pick another one.', already_booked: 'You already have an audit booked. Reply to our email to change it.',
      invalid_name: 'Enter your name.', invalid_email: 'Enter a valid email address.', invalid_slot: 'That time is no longer open. Pick another one.',
      rate_ip: 'Too many tries. Wait a minute and try again.', default: 'Could not book. Try again, or message us on WhatsApp.' },
  },
  ar: {
    title: 'احجز التدقيق المجاني لنشاطك',
    lead: `${AUDIT_SLOT_MIN} دقيقة مع أحمد عن نشاطك وما يحدث لاستفسارات عملائك اليوم. مجانًا ودون أي التزام.`,
    zone: 'المواعيد بتوقيت مسقط (GMT+4).',
    day: '1. اختر اليوم', time: '2. اختر الوقت', details: '3. بياناتك',
    loading: 'جارٍ تحميل المواعيد المتاحة…', none: 'لا توجد مواعيد متاحة خلال الأسابيع الثلاثة القادمة. راسلنا على واتساب بدلًا من ذلك.',
    failed: 'تعذّر تحميل المواعيد المتاحة.', retry: 'حاول مجددًا',
    name: 'اسمك', email: 'البريد الإلكتروني', phone: 'الهاتف / واتساب (اختياري)', business: 'اسم النشاط (اختياري)', industry: 'المجال (اختياري)',
    pickIndustry: 'اختر مجالًا', note: 'ما الذي تودّ أن نراجعه؟ (اختياري)', book: 'احجز التدقيق', booking: 'جارٍ الحجز…',
    chosen: 'موعدك', change: 'غيّر',
    done: 'تم الحجز', doneLead: 'سنراسلك من ahmed@bznsflowai.com قبل الموعد لتأكيد طريقة اللقاء.', another: 'العودة إلى الصفحة الرئيسية',
    errors: { slot_taken: 'حُجز هذا الوقت للتو. اختر وقتًا آخر.', already_booked: 'لديك تدقيق محجوز بالفعل. ردّ على رسالتنا لتغييره.',
      invalid_name: 'أدخل اسمك.', invalid_email: 'أدخل بريدًا إلكترونيًا صحيحًا.', invalid_slot: 'لم يعد هذا الوقت متاحًا. اختر وقتًا آخر.',
      rate_ip: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.', default: 'تعذّر الحجز. حاول مجددًا أو راسلنا على واتساب.' },
  },
};

const ENDPOINT = '/api/lead?op=audit';
const muscatDay = at => new Date(at + 4 * 3600000).toISOString().slice(0, 10);

export default function AuditBooking({ lang = 'ar' }) {
  const ar = lang === 'ar', c = COPY[ar ? 'ar' : 'en'];
  const locale = ar ? 'ar-OM-u-nu-latn' : 'en-GB';
  const fmt = useMemo(() => ({
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Asia/Muscat' }),
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'Asia/Muscat' }),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
    full: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
  }), [locale]);
  const [slots, setSlots] = useState(null), [loadError, setLoadError] = useState(false);
  const [day, setDay] = useState(''), [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', industry: '', note: '', website: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [booked, setBooked] = useState(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(ENDPOINT, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.slots)) throw new Error('slots');
      setSlots(body.slots);
      return body.slots;
    } catch { setLoadError(true); return null; }
  }, []);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const grouped = new Map();
    for (const at of slots || []) grouped.set(muscatDay(at), [...(grouped.get(muscatDay(at)) || []), at]);
    return [...grouped].map(([key, times]) => ({ key, times }));
  }, [slots]);
  useEffect(() => { if (days.length && !days.some(d => d.key === day)) setDay(days[0].key); }, [days, day]);
  const times = days.find(d => d.key === day)?.times || [];

  const set = key => event => { setForm(value => ({ ...value, [key]: event.target.value })); setError(''); };
  const submit = async event => {
    event.preventDefault();
    if (!slot || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, startAt: slot, lang }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw Object.assign(new Error('book'), { reason: body.reason });
      setBooked(slot);
    } catch (e) {
      setError(c.errors[e.reason] || c.errors.default);
      if (['slot_taken', 'invalid_slot'].includes(e.reason)) { setSlot(null); await load(); }
    } finally { setBusy(false); }
  };

  return (
    <main className="legal-shell audit-shell" id="main-content" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <header className="legal-nav">
        <a className="legal-brand" href={ar ? '/' : '/en'}><img src="/logo.png" alt="BznsFlow" width="36" height="36" /><span>BznsFlow</span></a>
        <a className="legal-lang" href={ar ? '/en/audit' : '/audit'} lang={ar ? 'en' : 'ar'}><Icon name="globe" size={15} /><span>{ar ? 'English' : 'العربية'}</span></a>
      </header>
      <article className="audit-card">
        {booked ? (
          <section className="audit-done" aria-live="polite">
            <p className="audit-done-mark"><Icon name="check" size={18} /> {c.done}</p>
            <h1>{fmt.full.format(new Date(booked))}</h1>
            <p>{c.zone} {c.doneLead}</p>
            <a className="btn btn-ghost" href={ar ? '/' : '/en'}>{c.another}</a>
          </section>
        ) : <>
          <h1 className="audit-title">{c.title}</h1>
          <p className="audit-lead">{c.lead}</p>
          <p className="audit-zone"><Icon name="calendar" size={16} /> {c.zone}</p>

          {loadError ? <div className="audit-state" role="alert"><p>{c.failed}</p><button type="button" className="btn btn-ghost" onClick={load}>{c.retry}</button></div>
            : !slots ? <p className="audit-state" role="status">{c.loading}</p>
            : !days.length ? <p className="audit-state">{c.none}</p>
            : !slot ? <>
              <h2 className="audit-step">{c.day}</h2>
              <div className="audit-days" role="group" aria-label={c.day}>
                {days.map(d => <button key={d.key} type="button" className="audit-day" aria-pressed={d.key === day} onClick={() => setDay(d.key)}>
                  <span>{fmt.weekday.format(new Date(d.times[0]))}</span><strong>{fmt.date.format(new Date(d.times[0]))}</strong>
                </button>)}
              </div>
              <h2 className="audit-step">{c.time}</h2>
              <div className="audit-times" role="group" aria-label={c.time}>
                {times.map(at => <button key={at} type="button" className="audit-time" onClick={() => { setSlot(at); setError(''); }} dir="ltr">{fmt.time.format(new Date(at))}</button>)}
              </div>
            </> : (
              <form className="audit-form" onSubmit={submit} noValidate>
                <div className="audit-chosen">
                  <span>{c.chosen}</span><strong>{fmt.full.format(new Date(slot))}</strong>
                  <button type="button" className="audit-link" onClick={() => setSlot(null)}>{c.change}</button>
                </div>
                <h2 className="audit-step">{c.details}</h2>
                <label>{c.name}<input required autoComplete="name" maxLength={80} value={form.name} onChange={set('name')} /></label>
                <label>{c.email}<input required type="email" autoComplete="email" dir="ltr" maxLength={254} value={form.email} onChange={set('email')} /></label>
                <label>{c.phone}<input type="tel" autoComplete="tel" dir="ltr" maxLength={20} value={form.phone} onChange={set('phone')} /></label>
                <label>{c.business}<input autoComplete="organization" maxLength={80} value={form.business} onChange={set('business')} /></label>
                <label>{c.industry}<select value={form.industry} onChange={set('industry')}>
                  <option value="">{c.pickIndustry}</option>
                  {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{ar ? i.ar : i.en}</option>)}
                </select></label>
                <label>{c.note}<textarea rows={3} maxLength={500} value={form.note} onChange={set('note')} /></label>
                {/* Left empty by people; bots fill it. */}
                <label className="audit-hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
                {error && <p className="audit-error" role="alert">{error}</p>}
                <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim() || !form.email.trim()}>{busy ? c.booking : c.book}</button>
              </form>
            )}
          {error && !slot && <p className="audit-error" role="alert">{error}</p>}
        </>}
      </article>
    </main>
  );
}
