import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

// The menu of tech solutions — BznsFlow as a "business in a box" tech company.
// The AI front office is one solution among websites, CRM, automation, apps, etc.
const SOLUTIONS = [
  { key: 'sol_1', icon: 'bot' },
  { key: 'sol_2', icon: 'globe' },
  { key: 'sol_3', icon: 'bar-chart' },
  { key: 'sol_4', icon: 'link' },
  { key: 'sol_5', icon: 'brain' },
  { key: 'sol_6', icon: 'smartphone' },
  { key: 'sol_7', icon: 'trending-up' },
  { key: 'sol_8', icon: 'star' },
];

export function SolutionsSection({ t, trackEvent }) {
  return (
    <section className="section" id="solutions">
      <div className="container">
        <div className="section-label" data-reveal>{t.sol_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.sol_title }} />
        <p className="section-subtitle" data-reveal>{t.sol_sub}</p>

        <div className="solutions-grid">
          {SOLUTIONS.map(({ key, icon }) => (
            <div key={key} className="solution-tile" data-reveal>
              <span className="solution-emoji" aria-hidden="true"><Icon name={icon} size={26} strokeWidth={1.8} /></span>
              <h3 className="solution-tile-title">{t[`${key}_title`]}</h3>
              <p className="solution-tile-desc">{t[`${key}_desc`]}</p>
            </div>
          ))}
        </div>

        <div className="solutions-cta" data-reveal>
          <a
            href={waLink(t.sol_cta)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'solutions' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.sol_cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
