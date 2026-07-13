import React from 'react';

const CARDS = [
  { t: 'b1', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { t: 'b2', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { t: 'b3', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg> },
  { t: 'b4', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
];

export function BenefitsSection({ t }) {
  return (
    <section className="section section--dark" id="benefits">
      <div className="container">
        <div className="section-label" data-reveal>{t.benefits_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.benefits_title }} />
        <p className="section-subtitle" data-reveal dangerouslySetInnerHTML={{ __html: t.benefits_sub }} />

        <div className="benefits-grid">
          {CARDS.map(({ t: key, icon }) => (
            <div key={key} className="benefit-card" data-reveal>
              <div className="benefit-icon">{icon}</div>
              <h3 className="benefit-title">{t[`${key}_title`]}</h3>
              <p className="benefit-desc">{t[`${key}_desc`]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
