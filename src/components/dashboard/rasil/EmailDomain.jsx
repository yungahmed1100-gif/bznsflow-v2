import React, { useEffect, useState } from 'react';
import { rasil } from '../../../lib/dashboard/api';
import { emailReason } from './reason';

function CopyButton({ s, value }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="ld-button ld-quiet ld-copy" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* the value stays selectable */ }
  }}>{done ? s.t('rasil_copied') : s.t('rasil_copy')}</button>;
}

/** The owner's sending domain: connect it, add the records, check them, then say who the emails are from. */
export function EmailDomain({ s, domain, onChanged }) {
  const [name, setName] = useState(''), [busy, setBusy] = useState(''), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [sender, setSender] = useState({ fromName: domain?.fromName || '', fromLocal: domain?.fromLocal || 'news', replyTo: domain?.replyTo || '' });
  useEffect(() => { if (domain) setSender({ fromName: domain.fromName || '', fromLocal: domain.fromLocal || 'news', replyTo: domain.replyTo || '' }); }, [domain?.domain]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (label, task) => {
    setBusy(label); setError(''); setSaved(false);
    try { await task(); await onChanged(); } catch (e) { setError(emailReason(s, e.reason)); } finally { setBusy(''); }
  };
  const status = domain?.status;

  return (
    <section className="ld-section ld-email-card" aria-labelledby="ld-email-domain">
      <div className="ld-section-head">
        <h2 id="ld-email-domain">{s.t('rasil_domain_title')}</h2>
        {domain && <span className={`ld-chip ${status === 'verified' ? 'is-green' : status === 'failed' ? 'is-coral' : 'is-yellow'}`}>{s.t(`rasil_domain_status_${status}`)}</span>}
      </div>
      {!domain ? <>
        <p className="ld-help">{s.t('rasil_domain_intro')}</p>
        <form className="ld-inline-form" onSubmit={e => { e.preventDefault(); run('connect', () => rasil('domain_connect', { domain: name }, { timeout: 30000 })); }}>
          <label className="ld-field">{s.t('rasil_domain_label')}<input value={name} dir="ltr" inputMode="url" autoComplete="off" placeholder={s.t('rasil_domain_hint')} required maxLength={253} onChange={e => setName(e.target.value)} /></label>
          <button type="submit" className="ld-button ld-primary" disabled={!!busy}>{s.t('rasil_domain_connect')}</button>
        </form>
        <p className="ld-help">{s.t('rasil_domain_help')}</p>
      </> : <>
        <p className="ld-email-domain-name" dir="ltr">{domain.domain}</p>
        {status !== 'verified' && <p className="ld-help">{s.t('rasil_domain_records')}</p>}
        <div className="ld-table-wrap">
          <table className="ld-table ld-compact ld-records">
            <thead><tr>{['type', 'name', 'value', 'status'].map(k => <th key={k} scope="col">{s.t(`rasil_record_${k}`)}</th>)}</tr></thead>
            <tbody>{domain.records.map(r => (
              <tr key={`${r.type}-${r.name}`}>
                <td dir="ltr">{r.type}{r.priority !== undefined ? ` ${r.priority}` : ''}</td>
                <td dir="ltr"><code>{r.name}</code></td>
                <td dir="ltr" className="ld-record-value"><code>{r.value}</code> <CopyButton s={s} value={r.value} /></td>
                <td>{r.status === 'recommended' ? s.t('rasil_record_recommended') : r.status === 'verified' ? s.t('rasil_domain_status_verified') : s.t('rasil_domain_status_pending')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {status !== 'verified' && <button type="button" className="ld-button" disabled={!!busy} onClick={() => run('check', () => rasil('domain_check', {}, { timeout: 30000 }))}>{busy === 'check' ? s.t('rasil_domain_checking') : s.t('rasil_domain_check')}</button>}

        <form className="ld-fieldset ld-email-sender" onSubmit={e => { e.preventDefault(); run('sender', async () => { await rasil('sender_save', sender); setSaved(true); }); }}>
          <h3>{s.t('rasil_sender_title')}</h3>
          <label className="ld-field">{s.t('rasil_sender_name')}<input value={sender.fromName} dir="auto" maxLength={80} required onChange={e => setSender(x => ({ ...x, fromName: e.target.value }))} /></label>
          <label className="ld-field">{s.t('rasil_sender_address')}
            <span className="ld-address-input" dir="ltr"><input value={sender.fromLocal} maxLength={64} required pattern="[a-z0-9][a-z0-9._\-]*" onChange={e => setSender(x => ({ ...x, fromLocal: e.target.value.toLowerCase() }))} /><span>@{domain.domain}</span></span>
          </label>
          <label className="ld-field">{s.t('rasil_reply_to')}<input type="email" dir="ltr" value={sender.replyTo} maxLength={254} onChange={e => setSender(x => ({ ...x, replyTo: e.target.value }))} /></label>
          <button type="submit" className="ld-button" disabled={!!busy}>{s.t('rasil_sender_save')}</button>
          {saved && <span className="ld-help" role="status">{s.t('rasil_saved')}</span>}
        </form>
      </>}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
    </section>
  );
}
