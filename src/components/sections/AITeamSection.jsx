import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';
import { AGENTS, AGENTS_AR, PITCH } from '../../data/agents';
import { AGENT_AVATARS as AVATARS } from '../../lib/agentAvatars';
import { useOrbitCarousel, ringOffset } from '../../hooks/useOrbitCarousel';

// Cards further than this from the active one are dropped from the orbit
// entirely — five on screen reads as depth, twelve reads as clutter.
const VISIBLE_DEPTH = 2;

export function AITeamSection({ t, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const agents = isAr ? AGENTS_AR : AGENTS;
  const pitch = isAr ? PITCH.ar : PITCH.en;

  const { active, goTo, next, prev, isPlaying, hasInteracted, markInteraction, sectionRef, dragRef } =
    useOrbitCarousel(agents.length, { isRtl: isAr });

  const agent = agents[active];

  const move = (fn) => () => { fn(); markInteraction(); };
  const select = (i) => () => { goTo(i); markInteraction(); };

  // The orbit is mirrored under RTL, so the arrow keys mirror with it.
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const forward = isAr ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    e.preventDefault();
    (forward ? next : prev)();
    markInteraction();
  };

  return (
    <section className="section" id="ai-team" ref={sectionRef}>
      <div className="container">
        <div className="section-label" data-reveal>{t.team_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.team_title }} />
        <p className="section-subtitle" data-reveal>{t.team_sub}</p>

        <div
          className="orbit"
          ref={dragRef}
          data-reveal
          role="group"
          aria-roledescription="carousel"
          aria-label={t.team_carousel_label}
          onKeyDown={onKeyDown}
        >
          <button
            type="button"
            className="orbit-nav orbit-nav--prev"
            onClick={move(prev)}
            aria-label={t.team_prev}
          >
            <Icon name="arrow-right" size={20} strokeWidth={2.5} className="orbit-nav-icon" />
          </button>

          <ul className="orbit-stage">
            {agents.map(({ key, name, nameSub, subLang, role, icon, accent }, i) => {
              const d = ringOffset(i, active, agents.length);
              const hidden = Math.abs(d) > VISIBLE_DEPTH;
              return (
                <li
                  key={key}
                  className={`orbit-card orbit-card--${accent}`}
                  data-d={hidden ? 'hidden' : d}
                  aria-hidden={d !== 0 || undefined}
                >
                  <button
                    type="button"
                    className="orbit-card-face"
                    onClick={select(i)}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <span className="team-avatar orbit-avatar">
                      {AVATARS[key]
                        ? <img src={AVATARS[key]} alt="" width="104" height="104" loading="lazy" decoding="async" draggable="false" />
                        : <Icon name={icon} size={40} strokeWidth={1.6} />}
                    </span>
                    <span className="team-name orbit-card-name">
                      {name} <span className="team-name-sub" lang={subLang}>{nameSub}</span>
                    </span>
                    <span className="team-role orbit-card-role">{role}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="orbit-nav orbit-nav--next"
            onClick={move(next)}
            aria-label={t.team_next}
          >
            <Icon name="arrow-right" size={20} strokeWidth={2.5} className="orbit-nav-icon" />
          </button>
        </div>

        {/* Description for the active agent. Silent while autoplaying — a card
            announced every 5 seconds is noise; a card the visitor chose is not. */}
        <div className="orbit-panel" aria-live={hasInteracted && !isPlaying ? 'polite' : 'off'}>
          <ul className="orbit-specs">
            {agent.specs.map((s) => <li key={s} className="orbit-spec">{s}</li>)}
          </ul>
          <p className="orbit-problem">{agent.problem}</p>
          <p className="orbit-outcome">{agent.outcome}</p>
        </div>

        <ul className="orbit-rail" aria-label={t.team_rail_label}>
          {agents.map(({ key, name }, i) => (
            <li key={key}>
              <button
                type="button"
                className="orbit-rail-btn"
                onClick={select(i)}
                aria-current={i === active ? 'true' : undefined}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>

        <div className="team-pitch" data-reveal>
          <p className="team-pitch-title">{pitch.title}</p>
          <p className="team-pitch-body">
            {pitch.body}
            <span className="team-pitch-promise" lang="ar">«كل اسم له معنى»</span>.
          </p>
        </div>

        <div className="team-cta" data-reveal>
          <a
            href={waLink(t.wa_msg_team)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.team_cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
