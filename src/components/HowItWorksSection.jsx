import React from 'react';
import { Icon } from './Icon';

export function HowItWorksSection({ t, CALENDAR_URL }) {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="section-label fade-in">{t.how_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.how_title }}></h2>
        <p className="section-subtitle fade-in">{t.how_sub}</p>

        <div className="steps-container">
          <div className="step fade-in">
            <div className="step-number">01</div>
            <div className="step-content">
              <div className="step-connector"></div>
              <h3 className="step-title">{t.step1_title}</h3>
              <p className="step-desc">{t.step1_desc}</p>
            </div>
          </div>
          <div className="step fade-in">
            <div className="step-number">02</div>
            <div className="step-content">
              <div className="step-connector"></div>
              <h3 className="step-title">{t.step2_title}</h3>
              <p className="step-desc">{t.step2_desc}</p>
            </div>
          </div>
          <div className="step fade-in">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3 className="step-title">{t.step3_title}</h3>
              <p className="step-desc">{t.step3_desc}</p>
            </div>
          </div>
        </div>

        <div className="steps-cta fade-in">
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
            <span>{t.how_cta}</span>
            <Icon name="arrow-right" size={18} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
