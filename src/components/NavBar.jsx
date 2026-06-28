import React, { useState, useRef } from 'react';
import logoImg from '../public/logo_bznsflow.png';

export function NavBar({
  t, lang, isScrolled, isMenuOpen, activeLink, scrollProgress,
  LANGUAGES, CALENDAR_URL,
  onOpenMenu, onCloseMenu, onSmoothScroll, onSetLanguage,
}) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langToggleRef = useRef(null);

  const closeLang = () => setIsLangOpen(false);
  const handleLangSelect = (code) => { onSetLanguage(code); closeLang(); langToggleRef.current?.focus(); };
  // Close the menu (and restore focus) on Escape, or when focus leaves the group.
  const handleLangKeyDown = (e) => { if (e.key === 'Escape') { closeLang(); langToggleRef.current?.focus(); } };
  const handleLangBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) closeLang(); };

  return (
    <>
      <a href="#main-content" className="skip-to-content">{t.skip_to_content || 'Skip to main content'}</a>
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
            <li><a href="#two-track"  className={`nav-link ${activeLink === 'two-track'  ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#two-track')}>{t.nav_solution}</a></li>
            <li><a href="#ai-team"    className={`nav-link ${activeLink === 'ai-team'    ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#ai-team')}>{t.team_label}</a></li>
            <li><a href="#how-it-works" className={`nav-link ${activeLink === 'how-it-works' ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#how-it-works')}>{t.nav_how}</a></li>
            <li><a href="#tiers"      className={`nav-link ${activeLink === 'tiers'      ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#tiers')}>{t.tiers_label}</a></li>
            <li><a href="#about"      className={`nav-link ${activeLink === 'about'      ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#about')}>{t.nav_about}</a></li>

            <li
              className={`lang-selector ${isLangOpen ? 'open' : ''}`}
              onKeyDown={handleLangKeyDown}
              onBlur={handleLangBlur}
            >
              <button
                ref={langToggleRef}
                type="button"
                className="lang-toggle"
                aria-haspopup="true"
                aria-expanded={isLangOpen}
                aria-label={t.lang_label || 'Choose language'}
                onClick={() => setIsLangOpen(o => !o)}
              >
                {LANGUAGES.find(l => l.code === lang)?.flag || '🌐'} <span className="dropdown-arrow" aria-hidden="true">▼</span>
              </button>
              <div className="lang-menu" role="menu">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={lang === l.code}
                    className={`lang-item ${lang === l.code ? 'active' : ''}`}
                    onClick={() => handleLangSelect(l.code)}
                    title={l.label}
                    aria-label={l.label}
                  >
                    <span className="flag" aria-hidden="true">{l.flag}</span>
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
