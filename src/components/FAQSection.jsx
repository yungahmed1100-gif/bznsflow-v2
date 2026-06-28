import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './motion/Reveal';
import { StaggerGroup, StaggerItem } from './motion/Stagger';
import { MagneticButton } from './motion/MagneticButton';
import { waLink } from '../lib/whatsapp';

const FAQ_KEYS = ['faq_q1', 'faq_q2', 'faq_q3', 'faq_q4', 'faq_q5', 'faq_q6'];

export function FAQSection({ t, trackEvent }) {
  return (
    <section className="section" id="faq">
      <div className="container">
        <Reveal className="section-label">{t.faq_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.faq_title }} />

        <StaggerGroup className="faq-list" stagger={0.07}>
          {FAQ_KEYS.map((qKey) => {
            const aKey = qKey.replace('_q', '_a');
            return (
              <StaggerItem as="details" key={qKey} className="faq-item">
                <summary className="faq-question">
                  <span>{t[qKey]}</span>
                  <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="faq-answer">{t[aKey]}</p>
              </StaggerItem>
            );
          })}
        </StaggerGroup>

        <Reveal className="faq-cta">
          <MagneticButton
            href={waLink(t.wa_msg_faq)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'faq' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.wa_cta}</span>
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
