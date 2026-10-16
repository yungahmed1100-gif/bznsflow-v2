import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';
import teamImage480 from '../../assets/team-operations-meeting-480.webp';
import teamImage960 from '../../assets/team-operations-meeting-960.webp';
import teamImage1536 from '../../assets/team-operations-meeting.webp';
import teamImageAvif480 from '../../assets/team-operations-meeting-480.avif';
import teamImageAvif960 from '../../assets/team-operations-meeting-960.avif';
import teamImageAvif1536 from '../../assets/team-operations-meeting-1536.avif';

export function AboutSection({ t, CALENDAR_URL, trackEvent }) {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="about-wrapper">
          <div className="about-visual" data-reveal>
            <figure className="about-art">
              <picture>
                <source
                  type="image/avif"
                  srcSet={`${teamImageAvif480} 480w, ${teamImageAvif960} 960w, ${teamImageAvif1536} 1536w`}
                  sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 80px), 560px"
                />
                <source
                  type="image/webp"
                  srcSet={`${teamImage480} 480w, ${teamImage960} 960w, ${teamImage1536} 1536w`}
                  sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 80px), 560px"
                />
                <img
                  src={teamImage1536}
                  alt={t.about_team_alt}
                  width={1536}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </figure>
            <div className="about-card-detail">
              <div className="detail-item">
                <span className="detail-icon" data-tone="blue"><Icon name="location" size={16} /></span>
                <span>{t.about_location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon" data-tone="green"><Icon name="shield" size={16} /></span>
                <span>{t.about_role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon" data-tone="orange">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </span>
                <span>{t.about_founder_role}</span>
              </div>
            </div>
          </div>

          <div className="about-content" data-reveal>
            <h2 className="section-title about-title" dangerouslySetInnerHTML={{ __html: t.about_title }}></h2>

            <div className="about-text">
              <p>{t.about_p1}</p>
              <p>{t.about_p2}</p>
              <p>{t.about_p3}</p>
            </div>

            <div className="about-ctas">
              <a
                href={waLink(t.wa_msg_about)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                onClick={() => trackEvent?.('WhatsAppClick', { source: 'about' })}
              >
                <Icon name="whatsapp" size={18} />
                <span>{t.about_cta1}</span>
              </a>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" onClick={() => trackEvent?.('AboutCallClick')}>
                <Icon name="calendar" size={16} />
                <span>{t.secondary_cta_call}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
