import React from 'react';

export function BenefitsSection({ t }) {
  return (
    <section className="section section--dark" id="benefits">
      <div className="container">
        <div className="section-label fade-in">{t.benefits_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.benefits_title }}></h2>
        <p className="section-subtitle fade-in" dangerouslySetInnerHTML={{ __html: t.benefits_sub }}></p>

        <div className="benefits-grid">
          <div className="benefit-card fade-in">
            <div className="benefit-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 className="benefit-title">{t.b1_title}</h3>
            <p className="benefit-desc">{t.b1_desc}</p>
          </div>
          <div className="benefit-card fade-in">
            <div className="benefit-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 className="benefit-title">{t.b2_title}</h3>
            <p className="benefit-desc">{t.b2_desc}</p>
          </div>
          <div className="benefit-card fade-in">
            <div className="benefit-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
            </div>
            <h3 className="benefit-title">{t.b3_title}</h3>
            <p className="benefit-desc">{t.b3_desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
