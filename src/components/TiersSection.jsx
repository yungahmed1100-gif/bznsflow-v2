import React from 'react';
import { Icon } from './Icon';

export function TiersSection({ t, CALENDAR_URL }) {
  const Check = () => <Icon name="check" size={16} strokeWidth={2} />;
  return (
    <section className="section section--dark" id="tiers">
      <div className="container">
        <div className="section-label fade-in">{t.tiers_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.tiers_title }}></h2>
        <p className="section-subtitle fade-in">{t.tiers_sub}</p>

        <div className="pricing-grid">
          <div className="pricing-card fade-in">
            <div className="pricing-header">
              <h3 className="pricing-tier">{t.t1_title}</h3>
              <div className="pricing-cost">
                <span className="price-amount">{t.t1_price}</span>
                <span className="price-anchor">{t.t1_price_anchor}</span>
                <span className="price-setup">{t.setup_fee}</span>
              </div>
              <p className="pricing-desc">{t.t1_desc}</p>
            </div>
            <div className="pricing-best-for">{t.t1_best}</div>
            <ul className="pricing-features">
              <li><Check /> <span>{t.t1_f1}</span></li>
              <li><Check /> <span>{t.t1_f2}</span></li>
              <li><Check /> <span>{t.t1_f3}</span></li>
            </ul>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost pricing-btn">{t.nav_cta}</a>
          </div>

          <div className="pricing-card pricing-card--popular fade-in">
            <div className="popular-badge">{t.popular_badge}</div>
            <div className="pricing-header">
              <h3 className="pricing-tier">{t.t2_title}</h3>
              <div className="pricing-cost">
                <span className="price-amount">{t.t2_price}</span>
                <span className="price-anchor price-anchor--contrast">{t.t2_price_anchor}</span>
                <span className="price-setup">{t.setup_fee}</span>
              </div>
              <p className="pricing-desc">{t.t2_desc}</p>
            </div>
            <div className="pricing-best-for">{t.t2_best}</div>
            <ul className="pricing-features">
              <li><Check /> <span>{t.t2_f1}</span></li>
              <li><Check /> <span>{t.t2_f2}</span></li>
              <li><Check /> <span>{t.t2_f3}</span></li>
              <li><Check /> <span>{t.t2_f4}</span></li>
            </ul>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary pricing-btn">{t.nav_cta}</a>
          </div>

          <div className="pricing-card fade-in">
            <div className="pricing-header">
              <h3 className="pricing-tier">{t.t3_title}</h3>
              <div className="pricing-cost">
                <span className="price-amount">{t.t3_price}</span>
                <span className="price-anchor">{t.t3_price_anchor}</span>
                <span className="price-setup">{t.setup_fee}</span>
              </div>
              <p className="pricing-desc">{t.t3_desc}</p>
            </div>
            <div className="pricing-best-for">{t.t3_best}</div>
            <ul className="pricing-features">
              <li><Check /> <span>{t.t3_f1}</span></li>
              <li><Check /> <span>{t.t3_f2}</span></li>
              <li><Check /> <span>{t.t3_f3}</span></li>
              <li><Check /> <span>{t.t3_f4}</span></li>
              <li><Check /> <span>{t.t3_f5}</span></li>
              <li><Check /> <span>{t.t3_f6}</span></li>
            </ul>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost pricing-btn">{t.nav_cta}</a>
          </div>
        </div>

        <div className="pricing-fomo fade-in">
          <h4 className="fomo-title"><span className="fomo-icon">⚠️</span> {t.t3_fomo_title}</h4>
          <p className="fomo-desc" dangerouslySetInnerHTML={{ __html: t.t3_fomo_desc }}></p>
        </div>

        {/* DRAFT — add-on bundles section, hidden for now. Re-enable later.
            Translation keys addons_title / addons_1..3 are retained in all i18n files.
        <div className="addons-block fade-in">
          <h4 className="addons-title">{t.addons_title}</h4>
          <div className="addons-list">
            <span className="addon-tag">{t.addons_1}</span>
            <span className="addon-tag">{t.addons_2}</span>
            <span className="addon-tag">{t.addons_3}</span>
          </div>
        </div>
        */}
      </div>
    </section>
  );
}
