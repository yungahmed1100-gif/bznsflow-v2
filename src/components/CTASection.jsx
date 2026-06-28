import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './motion/Reveal';
import { MagneticButton } from './motion/MagneticButton';
import { scaleIn } from '../lib/motion';
import { waLink } from '../lib/whatsapp';

export function CTASection({ t, CALENDAR_URL, trackEvent }) {
  return (
    <section className="section cta-section" id="cta">
      <div className="cta-bg-glow"></div>
      <div className="container">
        <Reveal className="cta-wrapper" variants={scaleIn}>
          <div className="section-label">{t.cta_label}</div>
          <h2 className="cta-headline" dangerouslySetInnerHTML={{ __html: t.cta_title }}></h2>
          <p className="cta-subtext">{t.cta_sub}</p>
          <div className="cta-buttons">
            <MagneticButton
              href={waLink(t.wa_msg_cta)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-xlarge"
              strength={0.45}
              onClick={() => trackEvent?.('WhatsAppClick', { source: 'final-cta' })}
            >
              <Icon name="whatsapp" size={22} />
              <span>{t.cta_btn}</span>
            </MagneticButton>
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-large cta-secondary"
              onClick={() => trackEvent?.('FinalCallClick')}
            >
              <Icon name="calendar" size={18} />
              <span>{t.secondary_cta_call}</span>
            </a>
            <p className="cta-note">{t.cta_note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
