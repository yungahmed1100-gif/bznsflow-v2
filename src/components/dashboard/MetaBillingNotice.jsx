import React, { useState } from 'react';
import { dashboard } from '../../lib/dashboard/api';

// BznsFlow is a Meta Tech Provider: each business pays Meta for its own broadcast messages, on its
// Messaging account (Meta's 2026 name for the WABA). Until a broadcast has been delivered, say how to add the payment method;
// after that one line is enough, unless Meta stopped the latest broadcast for billing (error 131042).
// After fixing billing in Meta, the owner checks again: the alert goes once Meta shows a payment method.
export const META_BILLING_URL = 'https://business.facebook.com/billing_hub/accounts';
export const META_PRICING_URL = 'https://developers.facebook.com/docs/whatsapp/pricing';

/** @param {{ s: object, campaigns: Array<object>, onChecked?: () => void }} props */
export function MetaBillingNotice({ s, campaigns, onChecked }) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  const latest = campaigns[0];
  const stopped = latest?.reason === 'payment_method_required' && !latest.billingCheckedAt;
  // A delivered broadcast, or Meta showing a payment method after a stop, means billing is set up.
  const billed = campaigns.some(c => c.counts.delivered + c.counts.read > 0 || c.billingCheckedAt);
  const check = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await dashboard('campaign_billing_check', { campaignId: latest.id });
      setResult({ ok: r.funded, text: s.t(r.funded ? 'feesFound' : 'feesNotFound') });
      if (r.funded) onChecked?.();
    } catch (e) {
      setResult({ ok: false, text: s.reason(e.reason) });
    } finally {
      setBusy(false);
    }
  };
  const pricing = (
    <a className="ld-link" href={META_PRICING_URL} target="_blank" rel="noopener noreferrer">
      {s.t('feesPricing')}
    </a>
  );
  return (
    <>
      {result?.ok && (
        <p className="ld-help" role="status">
          {result.text}
        </p>
      )}
      {billed && !stopped ? (
        <p className="ld-help ld-fees-short">
          {s.t('feesShort')} {pricing}
        </p>
      ) : (
        <section
          className={`ld-fees ${stopped ? 'is-stopped' : ''}`}
          role={stopped ? 'alert' : undefined}
          aria-labelledby="ld-fees-title"
        >
          <h2 id="ld-fees-title">{s.t(stopped ? 'feesStopped' : 'feesTitle')}</h2>
          <ol>
            {['feesStep1', 'feesStep2', 'feesStep3'].map(k => (
              <li key={k}>{s.t(k)}</li>
            ))}
          </ol>
          <p>{s.t('feesNote')}</p>
          <div className="ld-fees-links">
            <a className="ld-button ld-primary" href={META_BILLING_URL} target="_blank" rel="noopener noreferrer">
              {s.t('feesBilling')}
            </a>
            {stopped && (
              <button type="button" className="ld-button" onClick={check} disabled={busy}>
                {busy ? s.t('loading') : s.t('feesCheck')}
              </button>
            )}
            {pricing}
          </div>
          {stopped && result && !result.ok && <p className="ld-inline-error">{result.text}</p>}
        </section>
      )}
    </>
  );
}
