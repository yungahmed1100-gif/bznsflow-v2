import React, { useState } from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { rasil } from '../../../lib/dashboard/api';
import { formatDateTime } from '../../../lib/dashboard/format';
import { Dialog } from '../Dialog';
import { EmailCompose } from './EmailCompose';
import { emailReason, stopReason } from './reason';
const sent = c => ['submitted', 'delivered', 'bounced', 'complained'].reduce((n, k) => n + (c.counts[k] || 0), 0);
const problems = c => ['failed', 'bounced', 'complained', 'ambiguous'].reduce((n, k) => n + (c.counts[k] || 0), 0);

/** Email campaigns: the list with what happened to each, a new campaign, and who it did not reach. */
export function EmailCampaigns({ s, overview, ready, subscribers, business, onChanged, onSetup }) {
  const campaigns = usePolling(() => rasil('campaigns'), [], { interval: 15000 });
  const [composing, setComposing] = useState(false), [openId, setOpenId] = useState(null), [error, setError] = useState('');
  const detail = usePolling(() => rasil('campaign_detail', { campaignId: openId }), [openId], { interval: 15000, enabled: !!openId });
  const items = campaigns.data?.items || [];
  const cancel = async id => {
    setError('');
    try { await rasil('campaign_cancel', { campaignId: id }); await Promise.all([campaigns.refresh({ quiet: true }), onChanged()]); } catch (e) { setError(emailReason(s, e.reason)); }
  };

  return (
    <section className="ld-section" aria-labelledby="ld-email-campaigns">
      <div className="ld-section-head">
        <h2 id="ld-email-campaigns">{s.t('rasil_campaigns')}</h2>
        <button type="button" className="ld-button ld-primary" disabled={!ready} onClick={() => setComposing(true)}>{s.t('rasil_new')}</button>
      </div>
      {!ready && <p className="ld-help">{s.t('rasil_not_ready')} {onSetup && <button type="button" className="ld-link" onClick={onSetup}>{s.t('rasil_go_setup')}</button>}</p>}
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
      {!items.length ? <p className="ld-state">{s.t('rasil_none')}</p> : (
        <ul className="ld-campaigns">
          {items.map(c => (
            <li key={c.id} className="ld-campaign">
              <div className="ld-campaign-main">
                <strong dir="auto">{c.name}</strong>
                <span className={`ld-chip ${c.status === 'completed' ? 'is-green' : c.status === 'blocked' ? 'is-coral' : ['processing'].includes(c.status) ? 'is-yellow' : ''}`}>{s.t(`camp_${c.status}`)}</span>
                <small>{s.t('scheduledFor', { time: formatDateTime(c.scheduledAt, s.lang, c.timezone) })} · <bdi dir="ltr">{c.sender.fromLocal}@{c.sender.domain}</bdi></small>
                {c.reason && <small className="ld-issue">{stopReason(s, c.reason)}</small>}
              </div>
              <dl className="ld-counts ld-num">
                {[['rasil_c_sent', sent(c)], ['rasil_c_delivered', c.counts.delivered || 0], ['rasil_c_opened', c.counts.opened || 0], ['rasil_c_clicked', c.counts.clicked || 0], ['rasil_c_problems', problems(c)], ['rasil_c_recipients', c.recipientCount]]
                  .map(([k, v]) => <div key={k}><dt>{s.t(k)}</dt><dd>{v}</dd></div>)}
              </dl>
              <div className="ld-actions">
                <button type="button" className="ld-button ld-quiet" aria-expanded={openId === c.id} onClick={() => setOpenId(openId === c.id ? null : c.id)}>{s.t('details')}</button>
                {c.status === 'scheduled' && <button type="button" className="ld-button ld-danger" onClick={() => cancel(c.id)}>{s.t('cancelBroadcast')}</button>}
              </div>
              {openId === c.id && detail.data && (
                <div className="ld-email-detail">
                  <p className="ld-help">{s.t('rasil_opens_note')}</p>
                  {!!detail.data.problems.length && (
                    <div className="ld-table-wrap">
                      <table className="ld-table ld-compact">
                        <thead><tr><th scope="col">{s.t('name')}</th><th scope="col">{s.t('rasil_add_list')}</th><th scope="col">{s.t('status')}</th></tr></thead>
                        <tbody>{detail.data.problems.map((r, i) => <tr key={i}><th scope="row"><bdi>{r.name || '—'}</bdi></th><td><bdi dir="ltr">{r.email}</bdi></td><td>{s.t(`rasil_problem_${r.status}`)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {composing && <Dialog s={s} title={s.t('rasil_new')} wide onClose={() => setComposing(false)}>
        <EmailCompose s={s} overview={overview} subscribers={subscribers} business={business}
          onDone={async () => { setComposing(false); await Promise.all([campaigns.refresh({ quiet: true }), onChanged()]); }} />
      </Dialog>}
    </section>
  );
}
