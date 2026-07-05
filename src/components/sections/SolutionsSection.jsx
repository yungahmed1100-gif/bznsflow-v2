import React from 'react';
import { Icon } from '../ui/Icon';
import { Reveal } from '../motion/Reveal';
import { StaggerGroup, StaggerItem } from '../motion/Stagger';
import { TiltCard } from '../motion/TiltCard';
import { MagneticButton } from '../motion/MagneticButton';
import { waLink } from '../../lib/whatsapp';

// The menu of tech solutions — BznsFlow as a "business in a box" tech company.
// The AI front office is one solution among websites, CRM, automation, apps, etc.
const SOLUTIONS = [
  { key: 'sol_1', emoji: '🤖' },
  { key: 'sol_2', emoji: '🌐' },
  { key: 'sol_3', emoji: '📊' },
  { key: 'sol_4', emoji: '🔗' },
  { key: 'sol_5', emoji: '🧠' },
  { key: 'sol_6', emoji: '📱' },
  { key: 'sol_7', emoji: '📈' },
  { key: 'sol_8', emoji: '⭐' },
];

export function SolutionsSection({ t, trackEvent }) {
  return (
    <section className="section" id="solutions">
      <div className="container">
        <Reveal className="section-label">{t.sol_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.sol_title }} />
        <Reveal as="p" className="section-subtitle">{t.sol_sub}</Reveal>

        <StaggerGroup className="solutions-grid" stagger={0.07}>
          {SOLUTIONS.map(({ key, emoji }) => (
            <StaggerItem key={key}>
              <TiltCard className="solution-tile tilt-3d" max={5}>
                <span className="solution-emoji" aria-hidden="true">{emoji}</span>
                <h3 className="solution-tile-title">{t[`${key}_title`]}</h3>
                <p className="solution-tile-desc">{t[`${key}_desc`]}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="solutions-cta">
          <MagneticButton
            href={waLink(t.sol_cta)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'solutions' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.sol_cta}</span>
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
