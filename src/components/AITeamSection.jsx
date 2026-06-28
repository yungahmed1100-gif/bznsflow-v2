import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './motion/Reveal';
import { StaggerGroup, StaggerItem } from './motion/Stagger';
import { TiltCard } from './motion/TiltCard';
import { MagneticButton } from './motion/MagneticButton';
import { waLink } from '../lib/whatsapp';

// "Meet the AI team" — makes the business-in-a-box product concrete: five named
// AI systems that run the front office. Reuses the motion primitives for a
// staggered, tilt-on-hover reveal consistent with the rest of the site.
const MEMBERS = [
  { key: 'team_m1', emoji: '💬', accent: 'lead' },   // Layla — receptionist
  { key: 'team_m2', emoji: '📞', accent: 'order' },  // Khaled — voice
  { key: 'team_m3', emoji: '🔁', accent: 'lead' },   // ARIA — outreach
  { key: 'team_m4', emoji: '📊', accent: 'order' },  // Ali — operations
  { key: 'team_m5', emoji: '🛡️', accent: 'lead' },   // Mahmood — security
];

export function AITeamSection({ t }) {
  return (
    <section className="section" id="ai-team">
      <div className="container">
        <Reveal className="section-label">{t.team_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.team_title }} />
        <Reveal as="p" className="section-subtitle">{t.team_sub}</Reveal>

        <StaggerGroup className="team-grid" stagger={0.1}>
          {MEMBERS.map(({ key, emoji, accent }) => (
            <StaggerItem key={key}>
              <TiltCard className={`team-card team-card--${accent} tilt-3d`} max={6}>
                <span className="team-avatar" aria-hidden="true">{emoji}</span>
                <div className="team-meta">
                  <h3 className="team-name">{t[`${key}_name`]}</h3>
                  <span className="team-role">{t[`${key}_role`]}</span>
                </div>
                <p className="team-desc">{t[`${key}_desc`]}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="team-cta">
          <MagneticButton
            href={waLink(t.wa_msg_team)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.team_cta}</span>
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
