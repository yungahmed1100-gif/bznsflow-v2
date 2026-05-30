import React from 'react';

export function UseCasesSection({ t, lang }) {
  return (
    <section className="section section--dark" id="use-cases">
      <div className="container">
        <div className="section-label fade-in">{t.cases_label}</div>
        <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.cases_title }}></h2>
        <p className="section-subtitle fade-in">{t.cases_sub}</p>

        <div className="use-cases-grid">
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc1_title}</h3>
            <p className="use-case-desc">{t.uc1_desc}</p>
            <div className="use-case-tag">{t.uc1_tag}</div>
          </div>
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc2_title}</h3>
            <p className="use-case-desc">{t.uc2_desc}</p>
            <div className="use-case-tag">{t.uc2_tag}</div>
          </div>
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc3_title}</h3>
            <p className="use-case-desc">{t.uc3_desc}</p>
            <div className="use-case-tag">{t.uc3_tag}</div>
          </div>
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc4_title}</h3>
            <p className="use-case-desc">{t.uc4_desc}</p>
            <div className="use-case-tag">{t.uc4_tag}</div>
          </div>
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc5_title}</h3>
            <p className="use-case-desc">{t.uc5_desc}</p>
            <div className="use-case-tag">{t.uc5_tag}</div>
          </div>
          <div className="use-case-card fade-in">
            <div className="use-case-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <h3 className="use-case-title">{t.uc6_title}</h3>
            <p className="use-case-desc">{t.uc6_desc}</p>
            <div className="use-case-tag">{t.uc6_tag}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
