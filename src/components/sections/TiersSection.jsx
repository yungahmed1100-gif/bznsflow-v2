import React from 'react';
import { useAccount } from '../../hooks/useAccount';
import { usePaymentReturn } from '../../hooks/usePaymentReturn';
import { PlanPay } from './PlanPay';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';
import laylaPortrait from '../../assets/agents/layla.png';
import hasibPortrait from '../../assets/agents/hasib.png';
import adibaPortrait from '../../assets/agents/adiba.png';
import rasilPortrait from '../../assets/agents/rasil.png';

const agentPortraits = { layla: laylaPortrait, hasib: hasibPortrait, adiba: adibaPortrait, rasil: rasilPortrait };

// The three plans, paid online through Paymob (Ahmed, 2026-10-18): Catalyst at OMR 9 a month or 89 a year, and
// Ascend at OMR 29 or 289 for one live industry, also as an upgrade from Catalyst. Once held, Catalyst
// opens its setup and Ascend its Settings › Business, plus the website brief for Ascend's free website.
// Visitors see the same prices (Ahmed, 2026-10-23) and sign in when they pick one. Apex is by request (2026-10-27):
// no price, a request page, and the WhatsApp button under it.
export function TiersSection({ t, tiers = [], lang = 'ar', trackEvent }) {
  const signedIn = useAccount();
  const payment = usePaymentReturn();
  // Back from Paymob, the re-read session is the fresher one.
  const account = payment.account || signedIn;
  const owner = String(account?.email || '').trim().toLowerCase() === 'ahmed@bznsflowai.com';
  const canSetup = key => key === 'catalyst' && (owner || ['catalyst', 'ascend', 'apex'].includes(account?.accessPlan));
  const setupHref = `${lang === 'ar' ? '' : '/en'}/catalyst/setup`;
  const planMsg = name => (t.wa_msg_plan || 'Hi BznsFlow, I am interested in {plan}.').replace('{plan}', name);
  // Paying online: a signed-in account without the plan (Ascend also over Catalyst), or a paid holder
  // that can extend. Operator grants have no end date and are never billed online.
  const plan = account?.accessPlan;
  // Only while the server says payments are open for this account (test keys: listed testers only).
  const payable = key => !account ? ['catalyst', 'ascend'].includes(key) : !owner && !!account.paymentsOpen && (
    key === 'catalyst' ? !plan || (plan === 'catalyst' && !!account.accessUntil)
      : key === 'ascend' ? !plan || plan === 'catalyst' || (plan === 'ascend' && !!account.accessUntil) : false);
  const prices = {
    catalyst: { monthly: t.tier_pay_monthly, yearly: t.tier_pay_yearly },
    ascend: { monthly: t.tier_pay_ascend_monthly, yearly: t.tier_pay_ascend_yearly },
  };
  const websiteHref = `${lang === 'ar' ? '' : '/en'}/layla/dashboard?tab=website`;
  const link = tier => {
    // An Apex holder opens their workspace; everyone else sends a request.
    if (tier.byRequest && plan === 'apex') return { href: `${lang === 'ar' ? '' : '/en'}/layla/dashboard`, icon: 'arrow-right', label: t.tier_open_apex, event: 'SetupClick' };
    if (tier.byRequest) return { href: `${lang === 'ar' ? '' : '/en'}/apex`, icon: 'arrow-right', label: tier.cta, event: 'ApexRequestClick' };
    if (canSetup(tier.key)) return { href: setupHref, icon: 'arrow-right', label: t.tier_setup, event: 'SetupClick' };
    if (tier.key === 'ascend' && (owner || account?.accessPlan === 'ascend')) return { href: `${lang === 'ar' ? '' : '/en'}/layla/dashboard?tab=settings&view=business`, icon: 'arrow-right', label: t.tier_setup_ascend, event: 'SetupClick' };
    if (tier.key === 'ascend') return { href: waLink(planMsg(tier.name)), icon: 'whatsapp', label: tier.cta, event: 'WhatsAppClick', external: true };
    return { href: waLink(tier.available ? t.wa_msg_hero : planMsg(tier.name)), icon: 'whatsapp', label: tier.cta, event: 'WhatsAppClick', external: true };
  };

  return (
    <section className="section section--dark" id="tiers">
      <div className="container">
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.tiers_title }}></h2>
        <p className="section-subtitle" data-reveal>{t.tiers_sub}</p>

        <div className="pricing-grid">
          {tiers.map(tier => {
            const cta = link(tier);
            return (
              <article key={tier.key} data-tier={tier.key} className={`pricing-card pricing-card--ladder${tier.available ? ' pricing-card--popular' : ' pricing-card--soon'}`}>
                <div className="pricing-header">
                  <div className="tier-stage-row">
                    <h3 className="pricing-tier">{tier.name}</h3>
                    <span className={`tier-status ${tier.byRequest ? 'is-request' : tier.available ? 'is-available' : 'is-soon'}`}>{tier.byRequest ? t.tier_by_request : tier.available ? t.tier_available : t.tier_soon}</span>
                  </div>
                  <span className="tier-stage-tag">{tier.stage}</span>
                  <div className="tier-bottleneck">
                    <span className="tier-bottleneck-label">{t.tier_problem}</span>
                    <span className="tier-bottleneck-text">{tier.problem}</span>
                  </div>
                  <p className="pricing-desc">{tier.intro}</p>
                </div>

                {tier.inside?.length > 0 && <>
                  <div className="tier-inside-label">{tier.insideLabel}</div>
                  <ul className="pricing-features">
                    {tier.inside.map((feature, i) => {
                      if (typeof feature === 'string') return <li key={i}><Icon name="check" size={15} strokeWidth={2.5} /> <span>{feature}</span></li>;
                      if (feature.gift) return <li key="gift" className="tier-gift">
                        <Icon name="gift" size={28} />
                        <div className="tier-gift-copy">
                          <span className="tier-gift-badge">{feature.label}</span>
                          <strong className="tier-gift-title">{feature.title}</strong>
                          <span>{feature.description}</span>
                        </div>
                      </li>;
                      if (feature.capability) return <li key={feature.capability} className="tier-capability">
                        <Icon name={feature.icon} size={22} className="tier-capability-icon" />
                        <div className="tier-agent-copy">
                          <strong className="tier-capability-title">{feature.title}</strong>
                          <span>{feature.description}</span>
                        </div>
                      </li>;
                      return <li key={feature.agent} className="tier-agent">
                        <img className="tier-agent-portrait" src={agentPortraits[feature.agent]} alt="" width="64" height="64" loading="lazy" decoding="async" />
                        <div className="tier-agent-copy">
                          <div className="tier-agent-heading">
                            <strong>{feature.name}</strong>
                            {feature.status && <span className="tier-agent-status">{feature.status}</span>}
                          </div>
                          <span>{feature.description}</span>
                        </div>
                      </li>;
                    })}
                  </ul>
                </>}

                {tier.available && !tier.byRequest && <p className="tier-pay-note tier-meta-fees">{t.tier_meta_fees}</p>}
                {tier.byRequest && <p className="tier-pay-note">{t.tier_custom_quote}</p>}
                {payable(tier.key) && <PlanPay plan={tier.key} labels={{ name: tier.name, ...prices[tier.key] }} t={t} lang={lang} account={account} payment={payment} trackEvent={trackEvent} whatsapp={waLink(planMsg(tier.name))} />}
                {!(payable(tier.key) && plan !== tier.key) && <a
                  href={cta.href}
                  target={cta.external ? '_blank' : undefined}
                  rel={cta.external ? 'noopener noreferrer' : undefined}
                  className={`btn ${tier.available ? 'btn-primary' : 'btn-ghost'} pricing-btn`}
                  onClick={() => trackEvent?.(cta.event, { source: 'plan', plan: tier.name })}
                >
                  <Icon name={cta.icon} size={18} className={cta.icon === 'arrow-right' ? 'icon-flip-rtl' : undefined} />
                  <span>{cta.label}</span>
                </a>}
                {tier.byRequest && <a href={waLink(planMsg(tier.name))} target="_blank" rel="noopener noreferrer" className="btn btn-ghost pricing-btn tier-whatsapp"
                  onClick={() => trackEvent?.('WhatsAppClick', { source: 'plan', plan: tier.name })}>
                  <Icon name="whatsapp" size={18} />
                  <span>{tier.whatsappCta}</span>
                </a>}
                {tier.key === 'ascend' && (owner || plan === 'ascend') && <a href={websiteHref} className="tier-website-link">{t.tier_website}</a>}
              </article>
            );
          })}
        </div>

        <p className="tiers-note" data-reveal>{t.tiers_note}</p>
      </div>
    </section>
  );
}
