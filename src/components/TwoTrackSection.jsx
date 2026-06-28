import React from 'react';
import { Icon } from './Icon';
import { Reveal } from './motion/Reveal';
import { StaggerGroup, StaggerItem } from './motion/Stagger';
import { TiltCard } from './motion/TiltCard';
import { scaleIn } from '../lib/motion';

// Two-engine self-select section: visitors pick the track their business runs on.
// Track A = Lead Engine (high-value lead businesses), Track B = Order Engine
// (high-volume order/booking businesses). Verticals render as keyword-rich chips.
function TrackCard({ variant, name, tag, promise, verticals, cta, onSmoothScroll, trackEvent, eventName }) {
  return (
    <StaggerItem variants={scaleIn}>
      <TiltCard as="article" className={`track-card track-card--${variant} tilt-3d`} max={6}>
        <span className="track-card-tag">{tag}</span>
        <h3 className="track-card-name">{name}</h3>
        <p className="track-card-promise">{promise}</p>

        <ul className="track-verticals" aria-label={name}>
          {verticals.map((v) => (
            <li key={v} className="track-vertical-chip">{v}</li>
          ))}
        </ul>

        <a
          href="#how-it-works"
          className="track-card-cta"
          onClick={(e) => { trackEvent?.(eventName); onSmoothScroll?.(e, '#how-it-works'); }}
        >
          <span>{cta}</span>
          <Icon name="arrow-right" size={16} strokeWidth={2.5} />
        </a>
      </TiltCard>
    </StaggerItem>
  );
}

export function TwoTrackSection({ t, onSmoothScroll, trackEvent }) {
  return (
    <section className="section section--dark" id="two-track">
      <div className="container">
        <Reveal className="section-label">{t.track_label}</Reveal>
        <Reveal as="h2" className="section-title" dangerouslySetInnerHTML={{ __html: t.track_title }} />
        <Reveal as="p" className="section-subtitle">{t.track_sub}</Reveal>

        <StaggerGroup className="two-track-grid" stagger={0.14}>
          <TrackCard
            variant="lead"
            name={t.trackA_name}
            tag={t.trackA_tag}
            promise={t.trackA_promise}
            verticals={[t.trackA_v1, t.trackA_v2, t.trackA_v3, t.trackA_v4, t.trackA_v5]}
            cta={t.trackA_cta}
            onSmoothScroll={onSmoothScroll}
            trackEvent={trackEvent}
            eventName="LeadEngineCTAClick"
          />
          <TrackCard
            variant="order"
            name={t.trackB_name}
            tag={t.trackB_tag}
            promise={t.trackB_promise}
            verticals={[t.trackB_v1, t.trackB_v2, t.trackB_v3]}
            cta={t.trackB_cta}
            onSmoothScroll={onSmoothScroll}
            trackEvent={trackEvent}
            eventName="OrderEngineCTAClick"
          />
        </StaggerGroup>
      </div>
    </section>
  );
}
