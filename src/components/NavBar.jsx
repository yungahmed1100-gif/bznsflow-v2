import React from 'react';
import logoImg from '../public/logo_bznsflow.png';

export function NavBar({
  t, lang, isScrolled, isMenuOpen, activeLink, scrollProgress,
  LANGUAGES, CALENDAR_URL,
  onOpenMenu, onCloseMenu, onSmoothScroll, onSetLanguage,
}) {
  return (
    <>
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <a href="#hero" className="nav-brand" onClick={(e) => onSmoothScroll(e, '#hero')}>
            <img src={logoImg} alt="BznsFlow" className="nav-logo" />
            <div className="brand-text">
              <span className="brand-name">BznsFlow</span>
              <span className="brand-tagline">{t.nav_tagline}</span>
            </div>
          </a>

          <button
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={isMenuOpen ? onCloseMenu : onOpenMenu}
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinks">
            <li><a href="#problem"    className={`nav-link ${activeLink === 'problem'    ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#problem')}>{t.nav_problem}</a></li>
            <li><a href="#benefits"   className={`nav-link ${activeLink === 'benefits'   ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#benefits')}>{t.nav_solution}</a></li>
            <li><a href="#services"   className={`nav-link ${activeLink === 'services'   ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#services')}>{t.nav_services}</a></li>
            <li><a href="#tiers"      className={`nav-link ${activeLink === 'tiers'      ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#tiers')}>{t.nav_tiers}</a></li>
            <li><a href="#how-it-works" className={`nav-link ${activeLink === 'how-it-works' ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#how-it-works')}>{t.nav_how}</a></li>
            <li><a href="#use-cases"  className={`nav-link ${activeLink === 'use-cases'  ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#use-cases')}>{t.nav_cases}</a></li>
            <li><a href="#about"      className={`nav-link ${activeLink === 'about'      ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#about')}>{t.nav_about}</a></li>

            <li className="lang-selector">
              <button className="lang-toggle" aria-haspopup="true">
                {LANGUAGES.find(l => l.code === lang)?.flag || '🌐'} <span className="dropdown-arrow">▼</span>
              </button>
              <div className="lang-menu">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    className={`lang-item ${lang === l.code ? 'active' : ''}`}
                    onClick={() => onSetLanguage(l.code)}
                    title={l.label}
                    aria-label={l.label}
                  >
                    <span className="flag">{l.flag}</span>
                    <span className="label">{l.label}</span>
                  </button>
                ))}
              </div>
            </li>

            <li>
              <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary nav-cta">
                {t.nav_cta}
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
