import React from 'react';
import { Icon } from './Icon';

export function CTASection({ t, CALENDAR_URL }) {
  return (
    <section className="section cta-section" id="cta">
      <div className="cta-bg-glow"></div>
      <div className="container">
        <div className="cta-wrapper fade-in">
          <div className="section-label">{t.cta_label}</div>
          <h2 className="cta-headline" dangerouslySetInnerHTML={{ __html: t.cta_title }}></h2>
          <p className="cta-subtext">{t.cta_sub}</p>
          <div className="cta-buttons">
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-xlarge">
              <span>{t.cta_btn}</span>
              <Icon name="calendar" size={20} />
            </a>
            <p className="cta-note">{t.cta_note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
