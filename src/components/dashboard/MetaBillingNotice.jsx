import React from 'react';

// BznsFlow is a Meta Tech Provider: each business pays Meta for its own broadcast messages, on its
// WhatsApp Business account. Until a broadcast has been delivered, say how to add the payment method;
// after that one line is enough, unless Meta stopped the latest broadcast for billing (error 131042).
export const META_BILLING_URL = 'https://business.facebook.com/billing_hub/accounts';
export const META_PRICING_URL = 'https://developers.facebook.com/docs/whatsapp/pricing';

export function MetaBillingNotice({ s, campaigns }) {
  const stopped = campaigns[0]?.reason === 'payment_method_required';
  const delivered = campaigns.some(c => c.counts.delivered + c.counts.read > 0);
  const pricing = <a className="ld-link" href={META_PRICING_URL} target="_blank" rel="noopener noreferrer">{s.t('feesPricing')}</a>;
  if (delivered && !stopped) return <p className="ld-help ld-fees-short">{s.t('feesShort')} {pricing}</p>;
  return (
    <section className={`ld-fees ${stopped ? 'is-stopped' : ''}`} role={stopped ? 'alert' : undefined} aria-labelledby="ld-fees-title">
      <h2 id="ld-fees-title">{s.t(stopped ? 'feesStopped' : 'feesTitle')}</h2>
      <ol>{['feesStep1', 'feesStep2', 'feesStep3'].map(k => <li key={k}>{s.t(k)}</li>)}</ol>
      <p>{s.t('feesNote')}</p>
      <div className="ld-fees-links">
        <a className="ld-button ld-primary" href={META_BILLING_URL} target="_blank" rel="noopener noreferrer">{s.t('feesBilling')}</a>
        {pricing}
      </div>
    </section>
  );
}
