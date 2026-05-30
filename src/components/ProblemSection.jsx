import React from 'react';

export function ProblemSection({ t }) {
  return (
    <section className="section" id="problem">
      <div className="container">
        <div className="section-label fade-in">{t.problem_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.problem_title }}></h2>

        <div className="problem-grid">
          <div className="problem-card fade-in">
            <div className="problem-icon problem-icon--red">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3>{t.pain_title}</h3>
            <ul className="problem-list">
              <li><span className="list-icon">✕</span><span dangerouslySetInnerHTML={{ __html: t.pain_1 }}></span></li>
              <li><span className="list-icon">✕</span><span dangerouslySetInnerHTML={{ __html: t.pain_2 }}></span></li>
              <li><span className="list-icon">✕</span><span dangerouslySetInnerHTML={{ __html: t.pain_3 }}></span></li>
              <li><span className="list-icon">✕</span><span dangerouslySetInnerHTML={{ __html: t.pain_4 }}></span></li>
            </ul>
          </div>

          <div className="problem-divider">
            <div className="divider-line"></div>
            <div className="divider-vs">VS</div>
            <div className="divider-line"></div>
          </div>

          <div className="solution-card fade-in">
            <div className="problem-icon problem-icon--green">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3>{t.fix_title}</h3>
            <ul className="problem-list">
              <li><span className="list-icon list-icon--green">✓</span><span>{t.fix_1}</span></li>
              <li><span className="list-icon list-icon--green">✓</span><span>{t.fix_2}</span></li>
              <li><span className="list-icon list-icon--green">✓</span><span>{t.fix_3}</span></li>
              <li><span className="list-icon list-icon--green">✓</span><span>{t.fix_4}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
