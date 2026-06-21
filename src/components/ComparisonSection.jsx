import React from 'react';
import { Icon } from './Icon';

const CHECK = <span className="cmp-check"><Icon name="check" size={16} strokeWidth={2.5} /></span>;

export function ComparisonSection({ t, CALENDAR_URL }) {
  return (
    <section className="section" id="comparison">
      <div className="container">
        <div className="section-label fade-in">{t.cmp_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.cmp_title }}></h2>
        <p className="section-subtitle fade-in">{t.cmp_sub}</p>

        <div className="comparison-scroll fade-in" tabIndex={0} role="region" aria-label={t.cmp_title || 'Comparison'}>
          <div className="comparison-table">
            <div className="cmp-header-row">
              <div className="cmp-feature-header"></div>
              <div className="cmp-col-header cmp-col--bzns">
                <div className="cmp-winner-badge">{t.cmp_winner}</div>
                <div className="cmp-brand">BznsFlow</div>
                <div className="cmp-brand-sub">{t.cmp_brand_sub}</div>
              </div>
              <div className="cmp-col-header">
                <div className="cmp-alt-name">{t.cmp_alt1}</div>
                <div className="cmp-alt-eg">{t.cmp_alt1_eg}</div>
              </div>
              <div className="cmp-col-header">
                <div className="cmp-alt-name">{t.cmp_alt2}</div>
                <div className="cmp-alt-eg">{t.cmp_alt2_eg}</div>
              </div>
              <div className="cmp-col-header">
                <div className="cmp-alt-name">{t.cmp_alt3}</div>
                <div className="cmp-alt-eg">{t.cmp_alt3_eg}</div>
              </div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r1}</div>
              <div className="cmp-cell cmp-cell--bzns"><span className="cmp-bzns-text">3–5 days</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Weeks of setup</span></div>
              <div className="cmp-cell"><span className="cmp-dim">2–3 months</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Unknown</span></div>
            </div>


            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r3}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Partial</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r4}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Maybe</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r5}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-dim">Limited</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Maybe</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r6}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Depends</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r7}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r8}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-dim">Extra cost</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
            </div>

            <div className="cmp-row">
              <div className="cmp-feature">{t.cmp_r9}</div>
              <div className="cmp-cell cmp-cell--bzns">{CHECK}</div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
              <div className="cmp-cell"><span className="cmp-cross">✕</span></div>
            </div>
          </div>
        </div>

        <div className="comparison-cta fade-in">
          <p className="cmp-cta-text">{t.cmp_cta_text}</p>
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
            <span>{t.cmp_cta_btn}</span>
            <Icon name="arrow-right" size={18} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
