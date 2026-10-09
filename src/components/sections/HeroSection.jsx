import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { MetaVerified } from '../ui/MetaVerified';
import { waLink } from '../../lib/whatsapp';

const PIPELINE_ICONS = [
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  <svg key="e" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
];

// One industry chip per vertical the two engines serve.
const TRUST_ICONS = ['building-2', 'tooth', 'stethoscope', 'snowflake', 'hard-hat', 'cake', 'coffee', 'utensils'];

// One meaning colour per step (base.css MEANING): the customer, Layla, qualifying, the record, you.
const STEP_TONES = ['blue', 'green', 'yellow', 'orange', ''];
const CHIP_TONES = ['blue', 'green', 'yellow', 'orange'];
const STEP_MS = 2600;

/** "Need: Buy · Area: Al Mouj" → [['Need', 'Buy'], ['Area', 'Al Mouj']] */
const recordPairs = text => String(text || '').split(' · ').map(part => part.split(/:\s*/)).filter(p => p.length === 2);

function PipelineExample({ t, step }) {
  if (step === 0) return <p className="pipeline-bubble is-in"><small>{t.hero_demo_customer}</small>{t.hero_demo_1}</p>;
  if (step === 1 || step === 2) return <p className="pipeline-bubble is-out"><small>{t.hero_demo_layla}</small>{t[`hero_demo_${step + 1}`]}</p>;
  if (step === 3) return (
    <ul className="pipeline-record">
      {recordPairs(t.hero_demo_4).map(([key, value], n) => (
        <li key={key} style={{ '--n': n, '--chip-tint': `var(--${CHIP_TONES[n % 4]}-tint)`, '--chip-ink': `var(--${CHIP_TONES[n % 4]}-ink)` }}><b>{key}</b>{value}</li>
      ))}
    </ul>
  );
  return <><div className="pipeline-actions">{t.hero_demo_5.split(' · ').map(a => <span key={a}>{a}</span>)}</div><p>{t.hero_pipeline_step5_sub}</p></>;
}

/**
 * The five steps of one inquiry, with a worked example of the active step.
 * It cycles on its own until the visitor hovers, focuses or picks a step;
 * under reduced motion it never cycles and the visitor clicks through.
 */
function PipelineDiagram({ t }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false), [picked, setPicked] = useState(false), [still, setStill] = useState(true);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => setStill(!!query?.matches);
    sync();
    query?.addEventListener?.('change', sync);
    return () => query?.removeEventListener?.('change', sync);
  }, []);
  useEffect(() => {
    if (still || held || picked) return undefined;
    const id = setInterval(() => { if (!document.hidden) setActive(a => (a + 1) % 5); }, STEP_MS);
    return () => clearInterval(id);
  }, [still, held, picked]);

  const steps = [1, 2, 3, 4, 5].map(n => ({ label: t[`hero_pipeline_step${n}`], sub: t[`hero_pipeline_step${n}_sub`] }));
  const tone = STEP_TONES[active];
  return (
    <div className="pipeline" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}>
      <ol className="pipeline-diagram" aria-label={t.hero_pipeline_label}>
        {steps.map((step, i) => (
          <li key={i} className={`pipeline-step${STEP_TONES[i] ? ` tone-${STEP_TONES[i]}` : ''}`} data-state={i < active ? 'done' : i === active ? 'active' : 'next'}
            style={i < 4 ? { '--next-tone': STEP_TONES[i + 1] ? `var(--${STEP_TONES[i + 1] === 'blue' ? 'accent-blue' : STEP_TONES[i + 1]})` : 'var(--text-primary)' } : undefined}>
            <button type="button" className="pipeline-node" aria-pressed={i === active} onClick={() => { setActive(i); setPicked(true); }}>
              <span className="pipeline-node-icon" aria-hidden="true">{PIPELINE_ICONS[i]}</span>
              <span className="pipeline-node-text">
                <span className="pipeline-node-label">{step.label}</span>
                <span className="pipeline-node-sub">{step.sub}</span>
              </span>
            </button>
            {i < steps.length - 1 && <span className="pipeline-arrow" aria-hidden="true"><span className="pipeline-arrow-track"><span className="pipeline-arrow-fill" /></span></span>}
          </li>
        ))}
      </ol>
      <figure className={`pipeline-example pipeline-step${tone ? ` tone-${tone}` : ''}`}>
        <figcaption><span className="pipeline-example-tag">{t.hero_demo_label}</span><span>{steps[active].label}</span></figcaption>
        <div className="pipeline-example-body" key={active}><PipelineExample t={t} step={active} /></div>
      </figure>
    </div>
  );
}

export function HeroSection({ t, trackEvent, CALENDAR_URL }) {
  const trustVerticals = [
    t.trackA_v1, t.trackA_v2, t.trackA_v3, t.trackA_v4, t.trackA_v5,
    t.trackB_v1, t.trackB_v2, t.trackB_v3,
  ];

  return (
    <section className="hero grain" id="hero">
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
            <h1
              className="hero-headline"
              dangerouslySetInnerHTML={{ __html: t.hero_headline }}
            />

            <p className="hero-subheadline">{t.hero_sub}</p>

            {/* Was a pill above the headline. It is a sentence of its own, not
                a label restating the heading, so it keeps its words and moves
                below the lede where it reads as a caption. */}
            <p className="hero-caption">{t.hero_badge}</p>

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

            <MetaVerified t={t} variant="hero" />
          </div>

          {/* The wordmark used to sit here as well as in the navbar, one
              viewport apart, and the pair left a column of dead space
              between them. The pipeline owns this column now. */}
          <div className="hero-visual">
            <div className="hero-image-block">
              <PipelineDiagram t={t} />
            </div>
          </div>
        </div>

        {/* What Catalyst does, as a specification line: three properties of the service, not metrics. */}
        <dl className="hero-spec">
          {[1, 2, 3].map(n => (
            <div key={n} className="hero-spec-row">
              <dt>{t[`stat_${n}`]}</dt>
              <dd>{t[`stat_${n}_value`]}</dd>
            </div>
          ))}
        </dl>

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

    </section>
  );
}
