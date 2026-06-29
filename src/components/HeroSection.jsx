import React from 'react';
import { Icon } from './Icon';
import { Parallax } from './motion/Parallax';
import { MagneticButton } from './motion/MagneticButton';
import { waLink } from '../lib/whatsapp';

const PIPELINE_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  <svg key="e" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
];

function PipelineDiagram({ t, lang }) {
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
          <div className={`pipeline-node${step.accent ? ' pipeline-node--accent' : ''}${step.revenue ? ' pipeline-node--revenue' : ''}`}>
            <div className="pipeline-node-icon" aria-hidden="true">{PIPELINE_ICONS[i]}</div>
            <div className="pipeline-node-label">{step.label}</div>
            <div className="pipeline-node-sub">{step.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="pipeline-arrow" aria-hidden="true">
              <div className="pipeline-arrow-track">
                <div className="pipeline-arrow-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const STARS = [
  { color: 'var(--accent-blue)',   top: '12%', left: '18%', delay: '0s'   },
  { color: 'var(--accent-cyan)',   top: '28%', left: '72%', delay: '1.4s' },
  { color: 'var(--accent-purple)', top: '62%', left: '42%', delay: '0.7s' },
  { color: 'var(--orange)',        top: '78%', left: '82%', delay: '2.1s' },
  { color: 'var(--accent-blue)',   top: '44%', left: '8%',  delay: '2.9s' },
  { color: 'var(--accent-cyan)',   top: '16%', left: '52%', delay: '1.1s' },
];

export function HeroSection({ t, lang, onSmoothScroll, trackEvent, CALENDAR_URL, WHATSAPP_URL }) {

  return (
    <section className="hero grain" id="hero">
      <div className="aurora" aria-hidden="true">
        <span className="aurora-blob aurora-blob--a" />
        <span className="aurora-blob aurora-blob--b" />
        <span className="aurora-blob aurora-blob--c" />
      </div>
      <div className="shooting-stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="star"
            style={{ '--star-color': s.color, top: s.top, left: s.left, '--star-delay': s.delay }}
          />
        ))}
      </div>
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content fade-in visible">
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
              <MagneticButton
                href={waLink(t.wa_msg_hero)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-large hero-wa-cta"
                onClick={() => trackEvent('WhatsAppClick', { source: 'hero' })}
              >
                <Icon name="whatsapp" size={20} />
                <span>{t.hero_cta_primary}</span>
              </MagneticButton>
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
              <Parallax speed={0.16}>
                <PipelineDiagram t={t} lang={lang} />
              </Parallax>
            </div>

            <div className="hero-logo-block">
              <Parallax speed={0.1}>
                <img
                  src="/logo.png"
                  alt="BznsFlow"
                  className="hero-logo-feature"
                  width="500"
                  height="500"
                  fetchpriority="high"
                />
              </Parallax>
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
          <span className="trust-flag">🏢 {t.trackA_v1}</span>
          <span className="trust-flag">🦷 {t.trackA_v2}</span>
          <span className="trust-flag">🩺 {t.trackA_v3}</span>
          <span className="trust-flag">❄️ {t.trackA_v4}</span>
          <span className="trust-flag">🏗️ {t.trackA_v5}</span>
          <span className="trust-flag">🎂 {t.trackB_v1}</span>
          <span className="trust-flag">☕ {t.trackB_v2}</span>
          <span className="trust-flag">🍽️ {t.trackB_v3}</span>
        </div>
      </div>

      <div className="scroll-indicator" aria-hidden="true">
        <div className="scroll-line" />
      </div>
    </section>
  );
}
