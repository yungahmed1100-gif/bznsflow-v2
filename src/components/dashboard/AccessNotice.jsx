import React, { useState } from 'react';
import { paidDate, startCheckout } from '../../lib/billing';

// The three days after a paid Catalyst or Ascend period ends: access still works, and every tab says when it
// will be denied, with the way to pay (Ahmed, 2026-10-18). Dates come from the server's session.
export function AccessNotice({ s, account }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const now = Date.now();
  if (!account?.accessUntil || !account?.accessDeniedAt || now < account.accessUntil || now >= account.accessDeniedAt) return null;
  const lang = s.ar ? 'ar' : 'en';
  const plan = account.accessPlan === 'ascend' ? 'ascend' : 'catalyst';
  const prices = plan === 'ascend' ? ['accessPayAscendMonthly', 'accessPayAscendYearly'] : ['accessPayMonthly', 'accessPayYearly'];
  const pay = async interval => {
    setBusy(true); setFailed(false);
    // A renewal sends no industry: the server keeps the one the plan was bought for.
    try { await startCheckout(plan, interval, lang); } catch { setFailed(true); setBusy(false); }
  };
  return (
    <section className="ld-access-notice" role="alert">
      <h2>{s.t('accessGraceTitle', { plan: plan === 'ascend' ? (s.ar ? 'أسيند' : 'Ascend') : (s.ar ? 'كاتاليست' : 'Catalyst') })}</h2>
      <p>{s.t('accessGraceBody', { ended: paidDate(account.accessUntil, lang), denied: paidDate(account.accessDeniedAt, lang) })}</p>
      {account.paymentsOpen && <div className="ld-access-actions">
        <button type="button" className="ld-button ld-primary" disabled={busy} onClick={() => pay('monthly')}>{s.t(prices[0])}</button>
        <button type="button" className="ld-button" disabled={busy} onClick={() => pay('yearly')}>{s.t(prices[1])}</button>
      </div>}
      {failed && <p className="ld-access-error">{s.t('accessPayError')}</p>}
    </section>
  );
}
