import React, { useEffect } from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { loadRasil } from '../../../lib/dashboard/api';
import { emailReason } from './reason';
import { EmailDomain } from './EmailDomain';
import { EmailSubscribers } from './EmailSubscribers';
import { EmailSignup } from './EmailSignup';
import { EmailCampaigns } from './EmailCampaigns';

/**
 * Ascend's Email tab, the same in every industry: Campaigns, Subscribers, and Domain & form.
 * Until the sending domain is ready, opening the tab without a chosen view lands on Domain & form.
 */
export function EmailView({ s, overview, view = 'campaigns', explicitView = false, onGo }) {
  const state = usePolling(() => loadRasil(), [], { interval: 0 });
  const refresh = () => state.refresh({ quiet: true });
  const data = state.data;
  const ready = !!data?.domain?.ready;
  useEffect(() => { if (data && !ready && !explicitView && view !== 'setup') onGo?.('email', { view: 'setup' }); }, [data, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const head = (
    <div className="ld-page-head">
      <div><h1>{s.t('email')}</h1><p className="ld-lede">{s.t('rasil_intro', { cap: data?.usage.cap ?? 2000 })}</p></div>
    </div>
  );
  if (!data) return <div className="ld-email">{head}{state.error ? <p className="ld-inline-error" role="alert">{emailReason(s, state.error.reason)}</p> : <p className="ld-state" role="status">{s.t('loading')}</p>}</div>;
  const { domain, usage, subscribers, business } = data;
  return (
    <div className="ld-email">
      {head}
      <p className="ld-help ld-num" role="status">{s.t('rasil_usage', { used: usage.month, cap: usage.cap })}
        {ready && domain.dailyLimit < usage.cap ? ` · ${s.t('rasil_warmup', { limit: domain.dailyLimit })}` : ''}</p>
      {view === 'subscribers' ? <EmailSubscribers s={s} counts={subscribers} onChanged={refresh} />
        : view === 'setup' ? <><EmailDomain s={s} domain={domain} onChanged={refresh} /><EmailSignup s={s} domain={domain} business={business} /></>
        : <EmailCampaigns s={s} overview={overview} ready={ready} subscribers={subscribers.subscribed} business={business} onChanged={refresh}
            onSetup={() => onGo?.('email', { view: 'setup' })} />}
    </div>
  );
}
