import React, { useMemo, useState } from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { rasil } from '../../../lib/dashboard/api';
import { formatDateTime } from '../../../lib/dashboard/format';
import { validEmail, IMPORT_MAX } from '../../../../config/rasil.js';
import { ConsentForm, consentComplete } from '../ConsentForm';
import { emailReason } from './reason';

/** "address, name" per line; anything else on the line after the first comma is the name. */
export function parseSubscriberLines(text) {
  return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [email, ...rest] = line.split(/[,;\t]/);
    return { email: email.trim(), name: rest.join(' ').trim() };
  });
}

/** Who may receive campaigns: counts by status, adding people with a consent record, and the list itself. */
export function EmailSubscribers({ s, counts, onChanged }) {
  const [adding, setAdding] = useState(false), [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState(null);
  const [consent, setConsent] = useState({ source: '', date: new Date().toISOString().slice(0, 10), purpose: '', attested: false });
  const list = usePolling(() => rasil('subscribers'), [], { interval: 0 });
  const rows = useMemo(() => parseSubscriberLines(text), [text]);
  const valid = rows.filter(r => validEmail(r.email));

  const add = async () => {
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await rasil('subscribers_import', { origin: 'manual', consent, rows: valid.map(r => ({ email: r.email, ...(r.name ? { name: r.name } : {}) })) });
      setResult(r); setText(''); setAdding(false);
      await Promise.all([onChanged(), list.refresh({ quiet: true })]);
    } catch (e) { setError(emailReason(s, e.reason)); } finally { setBusy(false); }
  };
  const remove = async id => {
    setError('');
    try { await rasil('subscriber_unsubscribe', { subscriberId: id }); await Promise.all([onChanged(), list.refresh({ quiet: true })]); } catch (e) { setError(emailReason(s, e.reason)); }
  };

  return (
    <section className="ld-section ld-email-card" aria-labelledby="ld-email-subscribers">
      <div className="ld-section-head">
        <h2 id="ld-email-subscribers">{s.t('rasil_subscribers_title')}</h2>
        {!adding && <button type="button" className="ld-button" onClick={() => setAdding(true)}>{s.t('rasil_add_subscribers')}</button>}
      </div>
      <p className="ld-help">{s.t('rasil_subscribers_intro')}</p>
      <dl className="ld-counts ld-num">
        {['subscribed', 'pending', 'unsubscribed', 'suppressed'].map(k => <div key={k}><dt>{s.t(`rasil_count_${k}`)}</dt><dd>{counts[k] > 5000 ? '5000+' : counts[k]}</dd></div>)}
      </dl>
      {result && <p className="ld-help ld-num" role="status">{s.t('rasil_added', result)}</p>}
      {adding && (
        <div className="ld-email-add">
          <label className="ld-field">{s.t('rasil_add_list')}
            <textarea rows={6} dir="ltr" value={text} onChange={e => setText(e.target.value)} placeholder="huda@example.om, Huda" />
          </label>
          <p className="ld-help">{s.t('rasil_add_help')}</p>
          <ConsentForm s={s} value={consent} onChange={setConsent} attest="rasil_consent_attest" />
          <div className="ld-actions">
            <button type="button" className="ld-button ld-quiet" onClick={() => setAdding(false)}>{s.t('cancel')}</button>
            <button type="button" className="ld-button ld-primary" disabled={busy || !valid.length || valid.length > IMPORT_MAX || !consentComplete(consent)} onClick={add}>{s.t('rasil_add_save', { count: valid.length })}</button>
          </div>
        </div>
      )}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {!!list.data?.items.length && (
        <div className="ld-table-wrap">
          <table className="ld-table ld-compact">
            <thead><tr><th scope="col">{s.t('name')}</th><th scope="col">{s.t('rasil_add_list')}</th><th scope="col">{s.t('status')}</th><th scope="col"><span className="ld-visually-hidden">{s.t('rasil_remove')}</span></th></tr></thead>
            <tbody>{list.data.items.map(r => (
              <tr key={r.id}>
                <th scope="row"><bdi>{r.name || '—'}</bdi></th>
                <td><bdi dir="ltr">{r.email}</bdi></td>
                <td>{s.t(`rasil_count_${r.status}`)} · {s.t(`rasil_source_${r.source}`)}<small className="ld-help"> {formatDateTime(r.createdAt, s.lang)}</small></td>
                <td>{['subscribed', 'pending'].includes(r.status) && <button type="button" className="ld-button ld-quiet" onClick={() => remove(r.id)}>{s.t('rasil_remove')}</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
