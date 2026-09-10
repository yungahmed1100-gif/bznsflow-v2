import React, { useState, useRef } from 'react';
import logoImg from '../../assets/logo_bznsflow.png';
import { Icon } from '../ui/Icon';

/**
 * What to call someone in a slot two words wide.
 *
 * The first given name, because "Ahmed" is what a person recognises as
 * themselves and a full name would be truncated to the same thing anyway. An
 * account that signed in through a provider can reach the page before its
 * profile is filled in, so the address is the fallback rather than nothing.
 */
function shortName(account) {
  const full = String(account?.name || '').trim();
  if (full) return full.split(/\s+/)[0];
  return String(account?.email || '').split('@')[0];
}

export function NavBar({
  t, lang, isScrolled, isMenuOpen, activeLink, scrollProgress,
  LANGUAGES, account,
  onOpenMenu, onCloseMenu, onSmoothScroll, onSetLanguage,
}) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langToggleRef = useRef(null);

  const closeLang = () => setIsLangOpen(false);
  const handleLangSelect = (code) => { onSetLanguage(code); closeLang(); langToggleRef.current?.focus(); };
  // Close the menu (and restore focus) on Escape, or when focus leaves the group.
  const handleLangKeyDown = (e) => { if (e.key === 'Escape') { closeLang(); langToggleRef.current?.focus(); } };
  const handleLangBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) closeLang(); };

  // Same destination either way: /signin shows the account and the sign-out
  // control once a session exists, so it is the account page already.
  const accountHref = lang === 'en' ? '/en/signin' : '/signin';
  const name = account ? shortName(account) : '';
  const initial = name ? Array.from(name)[0].toLocaleUpperCase(lang) : '';

  return (
    <>
      <a href="#main-content" className="skip-to-content">{t.skip_to_content || 'Skip to main content'}</a>
      <div className="scroll-progress" style={{ '--scroll-progress': scrollProgress / 100 }} aria-hidden="true" />

      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <a href="#hero" className="nav-brand" onClick={(e) => onSmoothScroll(e, '#hero')}>
            <img src={logoImg} alt="BznsFlow" className="nav-logo" width="120" height="120" />
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
            <li><a href="#solutions"  className={`nav-link ${activeLink === 'solutions'  ? 'active' : ''}`} onClick={(e) => onSmoothScroll(e, '#solutions')}>{t.nav_solution}</a></li>
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
                <Icon name="globe" size={15} aria-hidden="true" />
                <span className="lang-toggle-code">{LANGUAGES.find(l => l.code === lang)?.code2 || 'EN'}</span>
                <Icon name="chevron-down" size={13} className="dropdown-arrow" aria-hidden="true" />
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
                    <span className="lang-code" aria-hidden="true">{l.code2}</span>
                    <span className="label">{l.label}</span>
                  </button>
                ))}
              </div>
            </li>

            <li>
              {/* Internal route, so no target/rel — and a plain <a> rather than a
                  <Link>, because every page here is prerendered and the rest of
                  the cross-page navigation on this site works the same way. */}
              {name ? (
                /* Signed in: the person's own name, not an invitation to do
                   again what they have already done. The accessible name says
                   what the link is FOR, because "Ahmed" on its own tells a
                   screen-reader user nothing about where it goes. */
                <a
                  href={accountHref}
                  className="nav-link nav-account"
                  aria-label={`${t.nav_account}: ${name}`}
                >
                  <span className="nav-account-mark" aria-hidden="true">{initial}</span>
                  {/* bdi, so a Latin name keeps its own direction inside the
                      Arabic bar rather than being reordered around it. */}
                  <bdi className="nav-account-name">{name}</bdi>
                </a>
              ) : (
                /* A text link, not a filled button. Sign-in serves people who
                   already bought; making it the loudest control on a marketing
                   page put it above both actions that actually convert. */
                <a href={accountHref} className="nav-link nav-cta">
                  {t.nav_signin}
                </a>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
