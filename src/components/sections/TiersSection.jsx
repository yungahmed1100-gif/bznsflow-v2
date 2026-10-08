import React from 'react';
import { useAccount } from '../../hooks/useAccount';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

// The three plans without prices. Catalyst is available and its CTA is the free audit (or setup, for
// granted accounts); Ascend and Apex are in preparation and only invite a question on WhatsApp.
// Prices are shared on the free audit (Ahmed, 2026-10-09).
export function TiersSection({ t, tiers = [], lang = 'ar', trackEvent }) {
  const account = useAccount();
  const owner = String(account?.email || '').trim().toLowerCase() === 'ahmed@bznsflowai.com';
  const canSetup = key => key === 'catalyst' && (owner || ['catalyst', 'ascend'].includes(account?.accessPlan));
  const setupHref = `${lang === 'ar' ? '' : '/en'}/catalyst/setup`;
  const planMsg = name => (t.wa_msg_plan || 'Hi BznsFlow, I am interested in {plan}.').replace('{plan}', name);
  const link = tier => {
    if (canSetup(tier.key)) return { href: setupHref, icon: 'arrow-right', label: t.tier_setup, event: 'SetupClick' };
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
              <article key={tier.key} className={`pricing-card pricing-card--ladder${tier.available ? ' pricing-card--popular' : ' pricing-card--soon'}`}>
                <div className="pricing-header">
                  <div className="tier-stage-row">
                    <h3 className="pricing-tier">{tier.name}</h3>
                    <span className={`tier-status ${tier.available ? 'is-available' : 'is-soon'}`}>{tier.available ? t.tier_available : t.tier_soon}</span>
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
                    {tier.inside.map((f, i) => <li key={i}><Icon name="check" size={15} strokeWidth={2.5} /> <span>{f}</span></li>)}
                  </ul>
                </>}

                <a
                  href={cta.href}
                  target={cta.external ? '_blank' : undefined}
                  rel={cta.external ? 'noopener noreferrer' : undefined}
                  className={`btn ${tier.available ? 'btn-primary' : 'btn-ghost'} pricing-btn`}
                  onClick={() => trackEvent?.(cta.event, { source: 'plan', plan: tier.name })}
                >
                  <Icon name={cta.icon} size={18} className={cta.icon === 'arrow-right' ? 'icon-flip-rtl' : undefined} />
                  <span>{cta.label}</span>
                </a>
              </article>
            );
          })}
        </div>

        <p className="tiers-note" data-reveal>{t.tiers_note}</p>
      </div>
    </section>
  );
}
