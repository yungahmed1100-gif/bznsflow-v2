import React from 'react';
import { Icon } from '../ui/Icon';
import { Reveal } from '../motion/Reveal';
import { StaggerGroup, StaggerItem } from '../motion/Stagger';
import { MagneticButton } from '../motion/MagneticButton';
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
        <Reveal className="section-label">{t.how_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.how_title }} />
        <Reveal as="p" className="section-subtitle">{t.how_sub}</Reveal>

        <StaggerGroup className="steps-container" stagger={0.12}>
          {steps.map((s) => (
            <StaggerItem key={s.n} className="step">
              <div className="step-number">{s.n}</div>
              <div className="step-content">
                {s.connector && <div className="step-connector"></div>}
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="steps-cta">
          <MagneticButton
            href={waLink(t.wa_msg_how)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'how-it-works' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.how_cta}</span>
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
