import React from 'react';
import { Icon } from '../ui/Icon';
import { Reveal } from '../motion/Reveal';
import { MagneticButton } from '../motion/MagneticButton';
import { waLink } from '../../lib/whatsapp';

export function AboutSection({ t, lang, CALENDAR_URL, WHATSAPP_URL, trackEvent }) {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="about-wrapper">
          <Reveal className="about-visual">
            <div className="about-avatar">
              <div className="avatar-ring"></div>
              <div className="avatar-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>
            <div className="about-card-detail">
              <div className="detail-item">
                <span className="detail-icon"><Icon name="location" size={16} /></span>
                <span>{t.about_location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon"><Icon name="shield" size={16} /></span>
                <span>{t.about_role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </span>
                <span>{t.about_founder_role}</span>
              </div>
            </div>
          </Reveal>

          <Reveal className="about-content" delay={0.1}>
            <div className="section-label">{t.about_label}</div>
            <h2 className="section-title about-title" dangerouslySetInnerHTML={{ __html: t.about_title }}></h2>

            <div className="about-text">
              <p>{t.about_p1}</p>
              <p>{t.about_p2}</p>
              <p>{t.about_p3}</p>
            </div>

            <div className="about-ctas">
              <MagneticButton
                href={waLink(t.wa_msg_about)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                onClick={() => trackEvent?.('WhatsAppClick', { source: 'about' })}
              >
                <Icon name="whatsapp" size={18} />
                <span>{t.about_cta1}</span>
              </MagneticButton>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" onClick={() => trackEvent?.('AboutCallClick')}>
                <Icon name="calendar" size={16} />
                <span>{t.secondary_cta_call}</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
