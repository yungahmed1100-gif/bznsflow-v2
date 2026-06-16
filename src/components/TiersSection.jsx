import React from 'react';
import { Icon } from './Icon';

// Premium pricing — Catch → Convert → Dominate ladder.
// Tier content comes from the `tiers` array (TIERS / TIERS_AR in pages/Home.jsx);
// section chrome (labels, terms, guarantee) comes from translations `t`.
export function TiersSection({ t, tiers = [], CALENDAR_URL }) {
  const Check = () => <Icon name="check" size={15} strokeWidth={2.5} />;
  const ladder = [
    { stage: t.ladder_1 || 'Catch',     sub: t.ladder_1_sub || 'Stop losing the leads you already pay for' },
    { stage: t.ladder_2 || 'Convert',   sub: t.ladder_2_sub || 'Turn the “not-yet” buyers into closings' },
    { stage: t.ladder_3 || 'Dominate',  sub: t.ladder_3_sub || 'Go take the market instead of waiting' },
  ];

  return (
    <section className="section section--dark" id="tiers">
      <div className="container">
        <div className="section-label fade-in">{t.tiers_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.tiers_title }}></h2>
        <p className="section-subtitle fade-in">{t.tiers_sub}</p>

        {/* Ladder strip: Catch → Convert → Dominate */}
        <div className="pricing-ladder fade-in" role="list">
          {ladder.map((step, i) => (
            <React.Fragment key={i}>
              <div className="ladder-step" role="listitem">
                <span className="ladder-index" aria-hidden="true">{i + 1}</span>
                <span className="ladder-stage">{step.stage}</span>
                <span className="ladder-sub">{step.sub}</span>
              </div>
              {i < ladder.length - 1 && <span className="ladder-arrow" aria-hidden="true">→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Tier cards */}
        <div className="pricing-grid">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`pricing-card pricing-card--ladder${tier.popular ? ' pricing-card--popular' : ''}`}
            >
              {tier.flag && <div className="popular-badge">{tier.flag}</div>}

              <div className="pricing-header">
                <div className="tier-stage-row">
                  <h3 className="pricing-tier">{tier.name}</h3>
                  <span className="tier-stage-tag">{tier.stage}</span>
                </div>
                <div className="pricing-cost">
                  <span className="price-amount">
                    {tier.price}<span className="price-cadence">{tier.cadence}</span>
                  </span>
                </div>
                <div className="tier-bottleneck">
                  <span className="tier-bottleneck-label">{t.tier_kills || 'Kills'}</span>
                  <span className="tier-bottleneck-text">{tier.bottleneck}</span>
                </div>
                <p className="pricing-desc">{tier.intro}</p>
              </div>

              <div className="tier-inside-label">{tier.insideLabel}</div>
              <ul className="pricing-features">
                {tier.inside.map((f, i) => (
                  <li key={i}><Check /> <span>{f}</span></li>
                ))}
              </ul>

              <div className="tier-roi">
                <div className="tier-roi-row">
                  <span className="tier-roi-key">{t.tier_replaces || 'Replaces'}</span>
                  <span className="tier-roi-val">{tier.roiReplaces}</span>
                </div>
                <p className="tier-roi-line">{tier.roiLine}</p>
                <div className="tier-roi-row">
                  <span className="tier-roi-key">{t.tier_payback || 'Payback'}</span>
                  <span className="tier-roi-val tier-roi-val--accent">{tier.payback}</span>
                </div>
              </div>

              <p className="tier-pull">{tier.pull}</p>

              <a
                href={CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn ${tier.popular ? 'btn-primary' : 'btn-ghost'} pricing-btn`}
              >
                {tier.cta}
              </a>

              {tier.nextStep && (
                <div className="tier-nextstep">
                  <span className="tier-nextstep-arrow" aria-hidden="true">↑</span>
                  <span>{tier.nextStep}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* At-a-glance comparison */}
        <div className="pricing-compare fade-in">
          <div className="pricing-compare-scroll">
            <table className="pricing-compare-table">
              <thead>
                <tr>
                  <th className="pc-rowhead">{t.compare_label || 'At a glance'}</th>
                  {tiers.map((tier) => (
                    <th key={tier.key} className={tier.popular ? 'pc-col--popular' : ''}>{tier.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pc-rowhead">{t.compare_bottleneck || 'Bottleneck killed'}</td>
                  {tiers.map((tier) => <td key={tier.key} className={tier.popular ? 'pc-col--popular' : ''}>{tier.bottleneck}</td>)}
                </tr>
                <tr>
                  <td className="pc-rowhead">{t.compare_price || 'Price'}</td>
                  {tiers.map((tier) => <td key={tier.key} className={tier.popular ? 'pc-col--popular' : ''}><strong>{tier.price}{tier.cadence}</strong></td>)}
                </tr>
                <tr>
                  <td className="pc-rowhead">{t.compare_replaces || 'Replaces'}</td>
                  {tiers.map((tier) => <td key={tier.key} className={tier.popular ? 'pc-col--popular' : ''}>{tier.roiReplaces}</td>)}
                </tr>
                <tr>
                  <td className="pc-rowhead">{t.compare_payback || 'Payback'}</td>
                  {tiers.map((tier) => <td key={tier.key} className={tier.popular ? 'pc-col--popular' : ''}>{tier.payback}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms */}
        <div className="pricing-terms fade-in">
          <div className="term-item"><Icon name="check" size={16} strokeWidth={2.5} /><span>{t.terms_1 || 'No setup fees — everything is in the monthly.'}</span></div>
          <div className="term-item"><Icon name="check" size={16} strokeWidth={2.5} /><span>{t.terms_2 || 'Annual billing = two months free.'}</span></div>
          <div className="term-item"><Icon name="check" size={16} strokeWidth={2.5} /><span>{t.terms_3 || 'Prices published and fixed — what you see is what everyone pays.'}</span></div>
        </div>

        {/* Guarantee */}
        <div className="pricing-guarantee fade-in">
          <span className="guarantee-badge" aria-hidden="true"><Icon name="shield" size={22} /></span>
          <div className="guarantee-body">
            <h4 className="guarantee-title">{t.guarantee_title || 'The 30-Day Leak Guarantee'}</h4>
            <p className="guarantee-desc">{t.guarantee_desc || 'If, in your first month on Catalyst, Layla doesn’t book the agreed number of qualified viewings, you don’t pay for month two. We put the target on a spreadsheet before we start — and measure it in arithmetic, not adjectives.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
