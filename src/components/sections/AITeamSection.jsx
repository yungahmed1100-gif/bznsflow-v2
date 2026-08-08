import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';
import { AGENTS, AGENTS_AR, PITCH } from '../../data/agents';

// Pixel-art character portraits (chest-up crops of the full sprites kept in
// the "bznsflow posts" workspace). Globbed so a missing portrait degrades to
// the line icon instead of breaking the build.
const AVATAR_FILES = import.meta.glob('../../assets/agents/*.png', { eager: true, import: 'default' });
const AVATARS = Object.fromEntries(
  Object.entries(AVATAR_FILES).map(([path, url]) => [path.split('/').pop().replace('.png', ''), url]),
);

export function AITeamSection({ t, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const agents = isAr ? AGENTS_AR : AGENTS;
  const pitch = isAr ? PITCH.ar : PITCH.en;

  return (
    <section className="section" id="ai-team">
      <div className="container">
        <div className="section-label" data-reveal>{t.team_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.team_title }} />
        <p className="section-subtitle" data-reveal>{t.team_sub}</p>

        <div className="team-grid">
          {agents.map(({ key, name, nameSub, subLang, role, icon, accent, tagline, problem, duties, outcome }) => (
            <details key={key} className={`team-card team-card--${accent}`} data-reveal>
              <summary className="team-summary">
                <span className="team-avatar" aria-hidden="true">
                  {AVATARS[key]
                    ? <img src={AVATARS[key]} alt="" width="56" height="56" loading="lazy" decoding="async" />
                    : <Icon name={icon} size={26} strokeWidth={1.8} />}
                </span>
                <span className="team-meta">
                  <span className="team-name">
                    {name} <span className="team-name-sub" lang={subLang}>{nameSub}</span>
                  </span>
                  <span className="team-role">{role}</span>
                </span>
                <svg className="team-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="team-tagline">{isAr ? `«${tagline}»` : `“${tagline}”`}</span>
              </summary>
              <div className="team-detail">
                <p className="team-problem">{problem}</p>
                <ul className="team-duties">
                  {duties.map((d, i) => (
                    <li key={i}>
                      <span className="list-icon list-icon--green"><Icon name="check" size={13} strokeWidth={2.5} /></span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <p className="team-outcome">{outcome}</p>
              </div>
            </details>
          ))}
        </div>

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
