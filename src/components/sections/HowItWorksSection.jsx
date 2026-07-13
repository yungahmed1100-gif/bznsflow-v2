import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

export function HowItWorksSection({ t, CALENDAR_URL, trackEvent }) {
  const steps = [
    { n: '01', title: t.step1_title, desc: t.step1_desc, connector: true },
    { n: '02', title: t.step2_title, desc: t.step2_desc, connector: true },
    { n: '03', title: t.step3_title, desc: t.step3_desc, connector: false },
  ];
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="section-label" data-reveal>{t.how_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.how_title }} />
        <p className="section-subtitle" data-reveal>{t.how_sub}</p>

        <div className="steps-container">
          {steps.map((s) => (
            <div key={s.n} className="step" data-reveal>
              <div className="step-number">{s.n}</div>
              <div className="step-content">
                {s.connector && <div className="step-connector"></div>}
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="steps-cta" data-reveal>
          <a
            href={waLink(t.wa_msg_how)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'how-it-works' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.how_cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
