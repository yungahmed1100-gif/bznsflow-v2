import React, { useEffect, useMemo, useState } from 'react';
import { rasil } from '../../../lib/dashboard/api';
import { browserTimezone, localInputValue } from '../../../lib/dashboard/format';
import { renderEmail, SUBJECT_MAX, BODY_MAX } from '../../../../config/rasil.js';
import { emailReason } from './reason';
import { LangSwitch } from './LangSwitch';

/**
 * One campaign: an optional draft from Adiba, the owner's own subject and message, a preview exactly as
 * sent (rendered by the same code the server sends with), then send now or later.
 */
export function EmailCompose({ s, overview, subscribers, business, onDone }) {
  const [lang, setLang] = useState(s.ar ? 'ar' : 'en');
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  const [brief, setBrief] = useState(''), [drafting, setDrafting] = useState(false), [priceWarning, setPriceWarning] = useState('');
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const timezone = overview.timezone || browserTimezone();
  const [schedule, setSchedule] = useState({ mode: 'now', local: '' });
  const [requestId] = useState(() => crypto.randomUUID());
  const set = patch => setForm(f => ({ ...f, ...patch }));

  useEffect(() => {
    if (!form.subject.trim() || !form.body.trim()) { setPreview(null); return undefined; }
    const timer = setTimeout(() => rasil('campaign_preview', { subject: form.subject, body: form.body, lang }).then(setPreview).catch(e => setError(emailReason(s, e.reason))), 400);
    return () => clearTimeout(timer);
  }, [form.subject, form.body, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const sample = preview?.sample?.name || (lang === 'ar' ? 'هدى' : 'Huda');
  const rendered = useMemo(() => form.subject.trim() && form.body.trim()
    ? renderEmail({ subject: form.subject, body: form.body, name: sample, business: business.name, address: business.address, unsubscribeUrl: `${window.location.origin}/email/unsubscribe`, lang })
    : null, [form.subject, form.body, sample, business, lang]);

  const draft = async () => {
    setDrafting(true); setError(''); setPriceWarning('');
    try {
      const { draft: d } = await rasil('draft', { brief, lang }, { timeout: 40000 });
      set({ subject: d.subject, body: d.body });
      if (d.untracedPrice) setPriceWarning(s.t('rasil_draft_price', { price: d.untracedPrice }));
    } catch (e) { setError(emailReason(s, e.reason)); } finally { setDrafting(false); }
  };
  const create = async () => {
    setBusy(true); setError('');
    try {
      await rasil('campaign_create', { requestId, confirm: true, name: form.name, subject: form.subject, body: form.body, lang,
        schedule: schedule.mode === 'now' ? { mode: 'now', timezone } : { mode: 'later', local: schedule.local, timezone } });
      setDone(true);
      setTimeout(onDone, 800);
    } catch (e) { setError(emailReason(s, e.reason)); } finally { setBusy(false); }
  };
  const count = preview?.eligible ?? subscribers;

  return (
    <div className="ld-email-compose">
      <section className="ld-fieldset ld-email-draft" aria-labelledby="ld-email-draft">
        <h3 id="ld-email-draft">{s.t('rasil_draft_title')}</h3>
        <label className="ld-field">{s.t('rasil_draft_brief')}<input value={brief} dir="auto" maxLength={600} placeholder={s.t('rasil_draft_hint')} onChange={e => setBrief(e.target.value)} /></label>
        <button type="button" className="ld-button" disabled={drafting} onClick={draft}>{drafting ? s.t('rasil_drafting') : s.t('rasil_draft')}</button>
        <p className="ld-help">{s.t('rasil_draft_note')}</p>
      </section>

      <div className="ld-email-compose-grid">
        <div>
          <label className="ld-field">{s.t('rasil_name')}<input value={form.name} dir="auto" maxLength={80} onChange={e => set({ name: e.target.value })} /></label>
          <LangSwitch s={s} lang={lang} onChange={setLang} />
          <label className="ld-field">{s.t('rasil_subject')}<input value={form.subject} dir="auto" maxLength={SUBJECT_MAX} required onChange={e => set({ subject: e.target.value })} /></label>
          <label className="ld-field">{s.t('rasil_body')}<textarea rows={12} dir="auto" value={form.body} maxLength={BODY_MAX} required onChange={e => set({ body: e.target.value })} /></label>
          <p className="ld-help">{s.t('rasil_body_help')}</p>
          {priceWarning && <p className="ld-inline-error" role="alert">{priceWarning}</p>}
        </div>
        <figure className="ld-email-preview">
          <figcaption>{s.t('rasil_preview_for', { name: sample })}</figcaption>
          {rendered ? <>
            <p className="ld-email-preview-subject" dir="auto"><strong>{rendered.subject}</strong></p>
            <iframe title={s.t('rasil_preview')} sandbox="" srcDoc={rendered.html} />
          </> : <p className="ld-state">{s.t('rasil_preview')}</p>}
        </figure>
      </div>

      <fieldset className="ld-fieldset"><legend>{s.t('when')}</legend>
        {[['now', s.t('sendNow')], ['later', s.t('sendLater')]].map(([mode, label]) => (
          <label key={mode} className="ld-choice"><input type="radio" name="email-when" checked={schedule.mode === mode}
            onChange={() => setSchedule(x => ({ mode, local: mode === 'later' && !x.local ? localInputValue(Date.now() + 3600000, timezone) : x.local }))} /><span>{label}</span></label>
        ))}
        {schedule.mode === 'later' && <label className="ld-field">{s.t('scheduleAt')} ({timezone})<input type="datetime-local" dir="ltr" value={schedule.local} min={localInputValue(Date.now(), timezone)} onChange={e => setSchedule(x => ({ ...x, local: e.target.value }))} /></label>}
      </fieldset>

      {preview && <p className="ld-help ld-num" role="status">{s.t('rasil_will_send', { count })} {s.t('rasil_remaining', { remaining: preview.remaining })}</p>}
      {preview && !preview.ready && <p className="ld-inline-error" role="alert">{emailReason(s, preview.reason)}</p>}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {done && <p className="ld-help" role="status">{s.t('rasil_created')}</p>}
      <div className="ld-actions ld-wizard-nav">
        <button type="button" className="ld-button ld-primary" disabled={busy || done || !preview?.ready || !count || count > (preview?.remaining ?? 0) || (schedule.mode === 'later' && !schedule.local)} onClick={create}>
          {s.t(schedule.mode === 'now' ? 'rasil_confirm_send' : 'rasil_confirm_schedule', { count })}
        </button>
      </div>
    </div>
  );
}
