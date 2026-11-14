import React, { useEffect, useRef, useState } from 'react';
import { inView } from 'motion';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { Icon } from '../ui/Icon';
import { MetaVerified } from '../ui/MetaVerified';
import { CuboidSculpture } from './CuboidSculpture';
import { waLink } from '../../lib/whatsapp';

const TRUST_ICONS = ['building-2', 'tooth', 'stethoscope', 'snowflake', 'hard-hat', 'cake', 'coffee', 'utensils'];
const STEP_TONES = ['blue', 'green', 'yellow', 'orange', 'ink'];
const CHIP_TONES = ['blue', 'green', 'yellow', 'orange'];
const recordPairs = text => String(text || '').split(' · ').map(part => part.split(/:\s*/)).filter(p => p.length === 2);

function PipelineExample({ t, step }) {
  if (step === 0) return <p className="pipeline-bubble is-in"><small>{t.hero_demo_customer}</small>{t.hero_demo_1}</p>;
  if (step === 1 || step === 2) return <p className="pipeline-bubble is-out"><small>{t.hero_demo_layla}</small>{t[`hero_demo_${step + 1}`]}</p>;
  if (step === 3) return <ul className="pipeline-record">
    {recordPairs(t.hero_demo_4).map(([key, value], n) => <li key={key} style={{ '--chip-tint': `var(--${CHIP_TONES[n % 4]}-tint)`, '--chip-ink': `var(--${CHIP_TONES[n % 4]}-ink)` }}><b>{key}</b>{value}</li>)}
  </ul>;
  return <div className="pipeline-actions">{t.hero_demo_5.split(' · ').map(action => <span key={action}>{action}</span>)}</div>;
}

function InquiryStory({ t }) {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const reduced = useMotionPreference();
  useEffect(() => {
    let stop = () => {};
    const observe = () => {
      stop();
      stop = inView(root.current.querySelectorAll('.pipeline-step'), element => {
        setActive(Number(element.dataset.step));
        return () => {};
      }, { margin: `-${Math.round(window.innerHeight * .28)}px 0px -${Math.round(window.innerHeight * .48)}px 0px` });
    };
    observe();
    window.addEventListener('resize', observe);
    return () => { stop(); window.removeEventListener('resize', observe); };
  }, []);

  const select = index => {
    setActive(index);
    root.current.querySelector(`[data-step="${index}"]`).scrollIntoView({ block: 'center', behavior: reduced === false ? 'smooth' : 'instant' });
  };
  return <div ref={root} className="pipeline inquiry-story" data-active-step={active}>
    <div className="story-heading">
      <h2>{t.hero_pipeline_label}</h2>
      <span className="story-scroll-cue" aria-hidden="true"><Icon name="arrow-down" size={20} /></span>
    </div>
    <div className="story-layout">
      <div className="story-stage">
        <div className={`story-art tone-${STEP_TONES[active]}`}>
          <CuboidSculpture stage={active} />
          <div className="story-art-caption"><span>{t.hero_story_from}</span><span>{t.hero_story_to}</span></div>
        </div>
        <figure className={`pipeline-example tone-${STEP_TONES[active]}`}>
          <figcaption><span className="pipeline-example-tag">{t.hero_demo_label}</span><span>{t[`hero_pipeline_step${active + 1}`]}</span></figcaption>
          <div className="pipeline-example-body" key={active}><PipelineExample t={t} step={active} /></div>
        </figure>
        <div className="story-controls" aria-label={t.hero_pipeline_label}>
          {STEP_TONES.map((tone, i) => <button key={tone} type="button" className={`story-control tone-${tone}`} aria-label={t[`hero_pipeline_step${i + 1}`]} aria-pressed={i === active} onClick={() => select(i)}><span /></button>)}
        </div>
      </div>
      <ol className="pipeline-diagram">
        {STEP_TONES.map((tone, i) => <li key={tone} className={`pipeline-step tone-${tone}`} data-step={i} data-state={i < active ? 'done' : i === active ? 'active' : 'next'}>
          <button type="button" className="pipeline-node" aria-pressed={i === active} onClick={() => select(i)}>
            <span className="pipeline-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="pipeline-node-text"><span className="pipeline-node-label">{t[`hero_pipeline_step${i + 1}`]}</span><span className="pipeline-node-sub">{t[`hero_pipeline_step${i + 1}_sub`]}</span></span>
          </button>
        </li>)}
      </ol>
    </div>
  </div>;
}

export function HeroSection({ t, trackEvent, CALENDAR_URL }) {
  const trustVerticals = [t.trackA_v1, t.trackA_v2, t.trackA_v3, t.trackA_v4, t.trackA_v5, t.trackB_v1, t.trackB_v2, t.trackB_v3];
  return <section className="hero hero-cinematic" id="hero">
    <div className="hero-content">
      <div className="hero-intro">
        <h1 className="hero-headline" dangerouslySetInnerHTML={{ __html: t.hero_headline }} />
        <div className="hero-intro-details">
          <p className="hero-subheadline">{t.hero_sub}</p>
          <div className="hero-ctas">
            <a href={waLink(t.wa_msg_hero)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large hero-wa-cta" onClick={() => trackEvent('WhatsAppClick', { source: 'hero' })}>
              <Icon name="whatsapp" size={20} /><span>{t.hero_cta_primary}</span>
            </a>
            <a href={CALENDAR_URL} className="hero-audit-link" onClick={() => trackEvent('HeroCallClick')}><span>{t.secondary_cta_call}</span><Icon name="arrow-right" size={20} /></a>
          </div>
          <MetaVerified t={t} variant="hero" />
        </div>
      </div>
      <p className="hero-caption">{t.hero_badge}</p>
      <InquiryStory t={t} />
      <dl className="hero-spec">{[1,2,3].map(n => <div key={n} className="hero-spec-row"><dt>{t[`stat_${n}`]}</dt><dd>{t[`stat_${n}_value`]}</dd></div>)}</dl>
      <div className="trust-strip"><span className="trust-label">{t.trust_label}</span>{trustVerticals.map((label, i) => <span key={label} className="trust-flag"><Icon name={TRUST_ICONS[i]} size={15} strokeWidth={1.8} aria-hidden="true" />{label}</span>)}</div>
    </div>
  </section>;
}
