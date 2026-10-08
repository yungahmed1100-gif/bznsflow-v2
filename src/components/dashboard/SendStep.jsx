import React, { useEffect, useMemo, useState } from 'react';
import { dashboard } from '../../lib/dashboard/api';
import { mayBeUsNumber } from '../../lib/dashboard/phone';
import { browserTimezone, localInputValue, timezoneOptions } from '../../lib/dashboard/format';
import { recipientValues, serverMapping } from '../../lib/dashboard/broadcast';
import { renderTemplate } from '../../../config/layla-templates.js';
import { ConsentForm, consentComplete } from './ConsentForm';

/** Step 3: each customer's own message, who is left out and why, then send now or later. */
export function SendStep({ s, overview, template, rules, rows, single, onTimezone, onCreated, onBack }) {
  const mapping = useMemo(() => serverMapping(rules), [rules]);
  const values = useMemo(() => recipientValues(rows, rules), [rows, rules]);
  const contactIds = useMemo(() => rows.map(r => r.contactId).filter(Boolean), [rows]);
  const [preview, setPreview] = useState(null), [index, setIndex] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState({ mode: 'now', local: '', timezone: overview.timezone || browserTimezone() });
  const [requestId] = useState(() => crypto.randomUUID());
  const load = () => { setError(''); return dashboard('campaign_preview', { templateId: template.id, mapping, contactIds, values }).then(p => { setPreview(p); setIndex(0); }).catch(e => setError(s.reason(e.reason))); };
  useEffect(() => { load(); }, []);

  const sending = overview.broadcastEnabled && preview?.sendingAvailable !== false;
  const eligible = preview?.eligible || [];
  const current = eligible[Math.min(index, eligible.length - 1)];
  const create = async () => {
    setBusy(true); setError('');
    try {
      const r = await dashboard('campaign_create', { requestId, templateId: template.id, mapping, values, contactIds: eligible.map(e => e.contactId), confirm: true,
        origin: single ? 'chat' : 'broadcast', name: single ? `${template.name} · ${single.name}` : template.name,
        schedule: schedule.mode === 'now' ? { mode: 'now', timezone: schedule.timezone } : { mode: 'later', local: schedule.local, timezone: schedule.timezone } });
      onCreated(r.campaign);
    } catch (e) { setError(s.reason(e.reason)); }
    finally { setBusy(false); }
  };

  if (!preview) return <>{error ? <p className="ld-inline-error" role="alert">{error}</p> : <p role="status">{s.t('loading')}</p>}<div className="ld-actions ld-wizard-nav"><button type="button" className="ld-button ld-quiet" onClick={onBack}>{s.t('previous')}</button></div></>;
  return (
    <section className="ld-send-step">
      <p className="ld-num"><strong>{s.t('reviewEligible', { count: eligible.length })}</strong> · {s.t('reviewExcluded', { count: preview.excluded.length })}</p>
      {current && (
        <figure className="ld-template-preview ld-per-contact">
          <figcaption>
            <span>{s.t('messageFor', { name: current.name || current.number })}</span>
            {eligible.length > 1 && (
              <span className="ld-pager">
                <button type="button" className="ld-icon-button" aria-label={s.t('prevContact')} disabled={index === 0} onClick={() => setIndex(index - 1)}><span className="icon-flip-rtl" aria-hidden="true">‹</span></button>
                <span className="ld-num" aria-live="polite">{s.t('previewOf', { n: index + 1, total: eligible.length })}</span>
                <button type="button" className="ld-icon-button" aria-label={s.t('nextContact')} disabled={index >= eligible.length - 1} onClick={() => setIndex(index + 1)}><span className="icon-flip-rtl" aria-hidden="true">›</span></button>
              </span>
            )}
          </figcaption>
          <p dir="auto">{renderTemplate(template, current.parameters || [])}</p>
          <small dir="ltr" className="ld-num">{current.number}</small>
        </figure>
      )}
      {!!preview.excluded.length && <ul className="ld-issues">{preview.excluded.map(e => <li key={e.contactId}><bdi>{e.name || '—'}</bdi> <bdi dir="ltr">{e.number}</bdi> · {s.t(`reason_${e.reason}`)}</li>)}</ul>}
      {single && preview.excluded.length > 0 && <SingleConsent s={s} contact={single} onRefresh={load} />}
      <p className="ld-help ld-num">{s.t('cap', { cap: preview.cap, allowance: preview.allowance >= 1e9 ? '∞' : preview.allowance })}</p>
      {eligible.some(e => mayBeUsNumber(String(e.number).replace(/\D/g, ''))) && <p className="ld-help">{s.t('usWarning')}</p>}

      <fieldset className="ld-fieldset"><legend>{s.t('when')}</legend>
        {[['now', s.t('sendNow')], ['later', s.t('sendLater')]].map(([mode, label]) => (
          <label key={mode} className="ld-choice"><input type="radio" name="when" checked={schedule.mode === mode} onChange={() => setSchedule(x => ({ ...x, mode, local: mode === 'later' && !x.local ? localInputValue(Date.now() + 3600000, x.timezone) : x.local }))} /><span>{label}</span></label>
        ))}
        {schedule.mode === 'later' && <label className="ld-field">{s.t('scheduleAt')}<input type="datetime-local" dir="ltr" value={schedule.local} min={localInputValue(Date.now(), schedule.timezone)} onChange={e => setSchedule(x => ({ ...x, local: e.target.value }))} /></label>}
        <label className="ld-field">{s.t('timezone')}
          <select value={schedule.timezone} onChange={e => { const timezone = e.target.value; setSchedule(x => ({ ...x, timezone })); dashboard('set_timezone', { timezone }).then(() => onTimezone?.()).catch(() => {}); }}>
            {timezoneOptions(schedule.timezone).map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
      </fieldset>

      {!sending && <p className="ld-help" role="status">{s.t('sendingOffShort')}</p>}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      <div className="ld-actions ld-wizard-nav">
        <button type="button" className="ld-button ld-quiet" onClick={onBack}>{s.t('previous')}</button>
        <button type="button" className="ld-button ld-primary" disabled={busy || !sending || !eligible.length || (schedule.mode === 'later' && !schedule.local)} onClick={create}>
          {busy ? s.t('sending') : s.t(schedule.mode === 'now' ? 'confirmSend' : 'confirmSchedule', { count: eligible.length })}
        </button>
      </div>
    </section>
  );
}

function SingleConsent({ s, contact, onRefresh }) {
  const [consent, setConsent] = useState({ source: '', date: new Date().toISOString().slice(0, 10), purpose: '', attested: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const requestId = useMemo(() => crypto.randomUUID(), []);
  if (contact.optout) return null;
  return (
    <div className="ld-single-consent">
      <ConsentForm s={s} value={consent} onChange={setConsent} />
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      <button type="button" className="ld-button" disabled={busy || !consentComplete(consent)} onClick={async () => {
        setBusy(true); setError('');
        try { await dashboard('import_contacts', { requestId, origin: 'manual', requireConsent: true, consent, rows: [{ waId: contact.number }] }); await onRefresh(); }
        catch (e) { setError(s.reason(e.reason)); } finally { setBusy(false); }
      }}>{s.t('save')}</button>
    </div>
  );
}
