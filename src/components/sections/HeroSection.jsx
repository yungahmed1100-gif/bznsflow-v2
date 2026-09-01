import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

const PIPELINE_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  <svg key="e" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
];

// One industry chip per vertical the two engines serve.
const TRUST_ICONS = ['building-2', 'tooth', 'stethoscope', 'snowflake', 'hard-hat', 'cake', 'coffee', 'utensils'];

function PipelineDiagram({ t }) {
  const steps = [
    { label: t.hero_pipeline_step1, sub: t.hero_pipeline_step1_sub },
    { label: t.hero_pipeline_step2, sub: t.hero_pipeline_step2_sub },
    { label: t.hero_pipeline_step3, sub: t.hero_pipeline_step3_sub },
    { label: t.hero_pipeline_step4, sub: t.hero_pipeline_step4_sub },
    { label: t.hero_pipeline_step5, sub: t.hero_pipeline_step5_sub },
  ];

  return (
    <div className="pipeline-diagram" aria-label="AI lead pipeline" role="img">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="pipeline-node" style={{ '--i': i }}>
            <div className="pipeline-node-icon" aria-hidden="true">{PIPELINE_ICONS[i]}</div>
            <div className="pipeline-node-label">{step.label}</div>
            <div className="pipeline-node-sub">{step.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="pipeline-arrow" aria-hidden="true" style={{ '--i': i }}>
              <div className="pipeline-arrow-track">
                <div className="pipeline-arrow-fill" />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function HeroSection({ t, lang, onSmoothScroll, trackEvent, CALENDAR_URL, WHATSAPP_URL }) {
  const trustVerticals = [
    t.trackA_v1, t.trackA_v2, t.trackA_v3, t.trackA_v4, t.trackA_v5,
    t.trackB_v1, t.trackB_v2, t.trackB_v3,
  ];

  return (
    <section className="hero grain" id="hero">
      <div className="aurora" aria-hidden="true">
        <span className="aurora-blob aurora-blob--a" />
        <span className="aurora-blob aurora-blob--b" />
        <span className="aurora-blob aurora-blob--c" />
      </div>
      <div className="hero-overlay" aria-hidden="true" />

      {/* Decorative isometric flow rails, cropped from the brand artwork either
          side of the logo so no wordmark or contact strip comes along.

          The two crops carry opposite arrows: flow-right sweeps UP, flow-left
          sweeps DOWN. So the upper block in both rails is flow-right and the
          lower is flow-left — arrows up at the top, down at the bottom, on both
          sides. Each is mirrored on whichever side needs it so every arrow also
          points inward, toward the headline.

          Purely atmospheric: aria-hidden, and dropped on narrow screens where
          there is no room beside the content column. */}
      {[
        {
          side: 'left',
          blocks: [
            { src: '/hero/flow-right.png', mirrored: false },  // up + right (inward)
            { src: '/hero/flow-left.png', mirrored: true },    // down + right (inward)
          ],
        },
        {
          side: 'right',
          blocks: [
            { src: '/hero/flow-right.png', mirrored: true },   // up + left (inward)
            { src: '/hero/flow-left.png', mirrored: false },   // down + left (inward)
          ],
        },
      ].map(({ side, blocks }) => (
        <div key={side} className={`hero-flow hero-flow--${side}`} aria-hidden="true">
          {blocks.map(({ src, mirrored }, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className={mirrored ? 'is-mirrored' : undefined}
              width={307}
              height={340}
              decoding="async"
              loading="eager"
            />
          ))}
        </div>
      ))}

      <div className="hero-content">
        <div className="hero-layout">
          <div className="hero-text-block">
            <div className="hero-badge">
              <span className="badge-dot" aria-hidden="true" />
              <span>{t.hero_badge}</span>
            </div>

            <h1
              className="hero-headline"
              dangerouslySetInnerHTML={{ __html: t.hero_headline }}
            />

            <p className="hero-subheadline">{t.hero_sub}</p>

            <div className="hero-ctas">
              <a
                href={waLink(t.wa_msg_hero)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-large hero-wa-cta"
                onClick={() => trackEvent('WhatsAppClick', { source: 'hero' })}
              >
                <Icon name="whatsapp" size={20} />
                <span>{t.hero_cta_primary}</span>
              </a>
              <a
                href={CALENDAR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-large"
                onClick={() => trackEvent('HeroCallClick')}
              >
                <Icon name="calendar" size={18} />
                <span>{t.secondary_cta_call}</span>
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-block">
              <PipelineDiagram t={t} />
            </div>

            <div className="hero-logo-block">
              <img
                src="/logo.png"
                alt="BznsFlow"
                className="hero-logo-feature"
                width="500"
                height="500"
                fetchpriority="high"
              />
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">{'<'}30s</span>
            <span className="stat-label">{t.stat_1}</span>
          </div>
          <div className="stat-divider" aria-hidden="true" />
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">{t.stat_2}</span>
          </div>
          <div className="stat-divider" aria-hidden="true" />
          <div className="stat-item">
            <span className="stat-number">AR·EN</span>
            <span className="stat-label">{t.stat_3}</span>
          </div>
        </div>

        <div className="trust-strip">
          <span className="trust-label">{t.trust_label}</span>
          {trustVerticals.map((label, i) => (
            <span key={i} className="trust-flag">
              <Icon name={TRUST_ICONS[i]} size={15} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="scroll-indicator" aria-hidden="true">
        <div className="scroll-line" />
      </div>
    </section>
  );
}
