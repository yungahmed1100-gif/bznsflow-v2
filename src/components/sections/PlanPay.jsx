import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { PaymobBadge } from './PaymobBadge';
import { RENEW_WINDOW_MS, paidDate, startCheckout } from '../../lib/billing';
import { INDUSTRIES } from '../../lib/industries';
import { HASIB_LIVE_PACKS } from '../../../config/hasib-live-packs.js';

const ERRORS = { plan_active: 'tier_pay_plan_active', too_many: 'tier_pay_too_many', invalid_pack: 'tier_pay_pick_industry' };
const LIVE_INDUSTRIES = INDUSTRIES.filter(industry => HASIB_LIVE_PACKS.includes(industry.id));
const NOT_LISTED = 'not-listed';

// A plan paid online through Paymob (Ahmed, 2026-10-18): monthly or yearly for an account that may buy
// it, an "active until" line for a paid one, the same choice again in its last two weeks, and a warning
// with the date access will be denied during the three days of grace after it ends. Ascend is bought for
// one live industry; a business outside them is sent to WhatsApp rather than paying for a poor fit.
export function PlanPay({ plan, labels, t, lang, account, payment, trackEvent, whatsapp }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [industry, setIndustry] = useState(() => (HASIB_LIVE_PACKS.includes(account?.industry) ? account.industry : ''));
  const until = account?.accessPlan === plan ? account.accessUntil : null;
  const grace = !!until && Date.now() >= until && !!account.accessDeniedAt;
  const canPay = account?.accessPlan !== plan || (until && until - Date.now() < RENEW_WINDOW_MS);
  const picksIndustry = plan === 'ascend';
  const date = ms => paidDate(ms, lang);
  const returned = payment.plan === plan ? payment.status : 'none';

  const pay = async interval => {
    if (picksIndustry && !HASIB_LIVE_PACKS.includes(industry)) { setError(t.tier_pay_pick_industry); return; }
    setBusy(interval); setError('');
    trackEvent?.('CheckoutClick', { source: 'plan', plan, interval });
    try { await startCheckout(plan, interval, lang, picksIndustry ? industry : undefined); } catch (e) {
      setError(t[ERRORS[e?.reason]] || t.tier_pay_error);
      setBusy(null);
    }
  };

  return (
    <div className="tier-pay">
      {returned === 'checking' && <p className="tier-pay-status" role="status">{t.tier_pay_checking}</p>}
      {returned === 'active' && until && <p className="tier-pay-status is-done" role="status"><Icon name="check" size={16} />{t.tier_pay_done.replace('{plan}', labels.name).replace('{date}', date(until))}</p>}
      {returned === 'pending' && <p className="tier-pay-status" role="status">{t.tier_pay_pending}</p>}
      {grace && <p className="tier-pay-status is-ending" role="alert"><Icon name="alert-triangle" size={16} />{t.tier_pay_grace.replace('{ended}', date(until)).replace('{denied}', date(account.accessDeniedAt))}</p>}
      {until && !grace && returned !== 'active' && <p className="tier-pay-until">{t.tier_paid_until.replace('{date}', date(until))}</p>}
      {canPay && <>
        {picksIndustry && <label className="tier-pay-industry">
          <span>{t.tier_pay_industry}</span>
          <select value={industry} onChange={e => { setIndustry(e.target.value); setError(''); }}>
            <option value="">{t.tier_pay_industry_choose}</option>
            {LIVE_INDUSTRIES.map(option => <option key={option.id} value={option.id}>{lang === 'ar' ? option.ar : option.en}</option>)}
            <option value={NOT_LISTED}>{t.tier_pay_industry_other}</option>
          </select>
        </label>}
        {industry === NOT_LISTED ? <>
          <p className="tier-pay-note">{t.tier_pay_industry_other_note}</p>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-primary pricing-btn" onClick={() => trackEvent?.('WhatsAppClick', { source: 'plan', plan })}>
            <Icon name="whatsapp" size={18} /><span>{t.tier_pay_whatsapp}</span>
          </a>
        </> : <>
          <div className="tier-pay-choices">
            <button type="button" className="btn btn-primary pricing-btn" disabled={!!busy} aria-busy={busy === 'monthly'} onClick={() => pay('monthly')}>
              <Icon name="arrow-right" size={18} className="icon-flip-rtl" /><span>{busy === 'monthly' ? t.tier_pay_opening : labels.monthly}</span>
            </button>
            <button type="button" className="btn btn-ghost pricing-btn" disabled={!!busy} aria-busy={busy === 'yearly'} onClick={() => pay('yearly')}>
              <span>{busy === 'yearly' ? t.tier_pay_opening : labels.yearly}</span>
            </button>
          </div>
          <PaymobBadge t={t} />
        </>}
      </>}
      {error && <p className="tier-pay-error" role="alert">{error}</p>}
    </div>
  );
}
