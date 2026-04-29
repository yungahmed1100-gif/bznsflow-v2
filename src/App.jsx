import React, { useState, useEffect, useRef } from 'react';
import { translations } from './translations';
import './index.css';
import logoImg from './public/logo_bznsflow.png';

function App() {
  const [lang, setLang] = useState(localStorage.getItem('bznsflow_lang') || 'en');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  const t = translations[lang];

  // Language Toggle
  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    localStorage.setItem('bznsflow_lang', newLang);
  };

  // Navbar Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const scrollable = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
      
      // Update Active Link
      const sections = document.querySelectorAll('section[id]');
      const navbarHeight = 72;
      let current = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop - navbarHeight - 80;
        const sectionBottom = sectionTop + section.offsetHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionBottom) {
          current = section.getAttribute('id');
        }
      });
      setActiveLink(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for Fade-ins
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const fadeEls = document.querySelectorAll('.fade-in');
    fadeEls.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [lang]); // Re-run when language changes as DOM might re-render

  // Update HTML dir and lang
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    setIsMenuOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;

    const navbarHeight = 72;
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight;

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });
    closeMenu();
  };

  return (
    <>
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* NAVBAR */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <a href="#hero" className="nav-brand" onClick={(e) => handleSmoothScroll(e, '#hero')}>
            <img src={logoImg} alt="BznsFlow Logo" className="nav-logo" />
            <div className="brand-text">
              <span className="brand-name">BznsFlow</span>
              <span className="brand-tagline">{t.nav_tagline}</span>
            </div>
          </a>

          <button 
            className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
            onClick={isMenuOpen ? closeMenu : openMenu}
            aria-label="Toggle navigation" 
            aria-expanded={isMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinks">
            <li><a href="#problem" className={`nav-link ${activeLink === 'problem' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#problem')}>{t.nav_problem}</a></li>
            <li><a href="#benefits" className={`nav-link ${activeLink === 'benefits' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.nav_solution}</a></li>
            <li><a href="#tiers" className={`nav-link ${activeLink === 'tiers' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#tiers')}>{t.nav_tiers}</a></li>
            <li><a href="#how-it-works" className={`nav-link ${activeLink === 'how-it-works' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#how-it-works')}>{t.nav_how}</a></li>
            <li><a href="#use-cases" className={`nav-link ${activeLink === 'use-cases' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#use-cases')}>{t.nav_cases}</a></li>
            <li><a href="#about" className={`nav-link ${activeLink === 'about' ? 'active' : ''}`} onClick={(e) => handleSmoothScroll(e, '#about')}>{t.nav_about}</a></li>
            <li>
              <button className="lang-toggle" onClick={toggleLang} aria-label="Switch language">
                <span className="lang-toggle-icon">🌐</span>
                <span className="lang-toggle-label">{lang === 'ar' ? 'English' : 'عربي'}</span>
              </button>
            </li>
            <li>
              <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary nav-cta">
                {t.nav_cta}
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero" id="hero">
        <div className="shooting-stars">
          <div className="star" style={{ '--star-color': 'var(--accent-blue)', top: '10%', left: '20%', '--star-delay': '0s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-cyan)', top: '30%', left: '70%', '--star-delay': '1.5s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-purple)', top: '60%', left: '40%', '--star-delay': '0.8s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--orange)', top: '80%', left: '80%', '--star-delay': '2.2s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-blue)', top: '40%', left: '10%', '--star-delay': '3s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-cyan)', top: '15%', left: '50%', '--star-delay': '1.2s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-purple)', top: '75%', left: '20%', '--star-delay': '2.8s' }}></div>
          
          <div className="star" style={{ '--star-color': 'var(--orange)', top: '50%', left: '90%', '--star-delay': '0.5s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-blue)', top: '85%', left: '30%', '--star-delay': '1.8s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-cyan)', top: '25%', left: '10%', '--star-delay': '2.5s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-purple)', top: '5%', left: '80%', '--star-delay': '3.2s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--orange)', top: '65%', left: '60%', '--star-delay': '1.1s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-blue)', top: '45%', left: '85%', '--star-delay': '0.3s' }}></div>
          <div className="star" style={{ '--star-color': 'var(--accent-cyan)', top: '90%', left: '50%', '--star-delay': '2.1s' }}></div>
        </div>
        <div className="hero-overlay"></div>

        <div className="hero-content fade-in visible">
          <div className="hero-layout">
            <div className="hero-text-block">
              <div className="hero-badge">
                <span className="badge-dot"></span>
                <span>{t.hero_badge}</span>
              </div>

              <h1 className="hero-headline" dangerouslySetInnerHTML={{ __html: t.hero_headline }}></h1>

              <p className="hero-subheadline">{t.hero_sub}</p>

              <div className="hero-ctas">
                <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
                  <span>{t.hero_cta_primary}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <a href="#how-it-works" className="btn btn-ghost btn-large" onClick={(e) => handleSmoothScroll(e, '#how-it-works')}>
                  {t.hero_cta_secondary}
                </a>
              </div>
            </div>
            
            <div className="hero-image-block fade-in visible">
              <img src={logoImg} alt="BznsFlow Logo Large" className="hero-logo-large" />
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">3x</span>
              <span className="stat-label">{t.stat_1}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">{t.stat_2}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">90%</span>
              <span className="stat-label">{t.stat_3}</span>
            </div>
          </div>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION SECTION */}
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

      {/* BENEFITS SECTION */}
      <section className="section section--dark" id="benefits">
        <div className="container">
          <div className="section-label fade-in">{t.benefits_label}</div>
          <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.benefits_title }}></h2>
          <p className="section-subtitle fade-in" dangerouslySetInnerHTML={{ __html: t.benefits_sub }}></p>

          <div className="benefits-grid">
            <div className="benefit-card fade-in">
              <div className="benefit-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <h3 className="benefit-title">{t.b1_title}</h3>
              <p className="benefit-desc">{t.b1_desc}</p>
            </div>
            <div className="benefit-card fade-in">
              <div className="benefit-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="benefit-title">{t.b2_title}</h3>
              <p className="benefit-desc">{t.b2_desc}</p>
            </div>
            <div className="benefit-card fade-in">
              <div className="benefit-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
              </div>
              <h3 className="benefit-title">{t.b3_title}</h3>
              <p className="benefit-desc">{t.b3_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE TIERS SECTION */}
      <section className="section section--dark" id="tiers">
        <div className="container">
          <div className="section-label fade-in">{t.tiers_label}</div>
          <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.tiers_title }}></h2>
          <p className="section-subtitle fade-in">{t.tiers_sub}</p>

          <div className="pricing-grid">
            {/* Tier 1 */}
            <div className="pricing-card fade-in">
              <div className="pricing-header">
                <h3 className="pricing-tier">{t.t1_title}</h3>
                <div className="pricing-cost">
                  <span className="price-amount">{t.t1_price}</span>
                  <span className="price-setup">{t.setup_fee}</span>
                </div>
                <p className="pricing-desc">{t.t1_desc}</p>
              </div>
              <div className="pricing-best-for">{t.t1_best}</div>
              <ul className="pricing-features">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t1_f1}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t1_f2}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t1_f3}</span></li>
              </ul>
              <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-ghost pricing-btn">{t.nav_cta}</a>
            </div>

            {/* Tier 2 */}
            <div className="pricing-card pricing-card--popular fade-in">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="pricing-tier">{t.t2_title}</h3>
                <div className="pricing-cost">
                  <span className="price-amount">{t.t2_price}</span>
                  <span className="price-setup">{t.setup_fee}</span>
                </div>
                <p className="pricing-desc">{t.t2_desc}</p>
              </div>
              <div className="pricing-best-for">{t.t2_best}</div>
              <ul className="pricing-features">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t2_f1}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t2_f2}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t2_f3}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t2_f4}</span></li>
              </ul>
              <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary pricing-btn">{t.nav_cta}</a>
            </div>

            {/* Tier 3 */}
            <div className="pricing-card fade-in">
              <div className="pricing-header">
                <h3 className="pricing-tier">{t.t3_title}</h3>
                <div className="pricing-cost">
                  <span className="price-amount">{t.t3_price}</span>
                  <span className="price-setup">{t.setup_fee}</span>
                </div>
                <p className="pricing-desc">{t.t3_desc}</p>
              </div>
              <div className="pricing-best-for">{t.t3_best}</div>
              <ul className="pricing-features">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f1}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f2}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f3}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f4}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f5}</span></li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>{t.t3_f6}</span></li>
              </ul>
              <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-ghost pricing-btn">{t.nav_cta}</a>
            </div>
          </div>

          <div className="pricing-fomo fade-in">
            <h4 className="fomo-title"><span className="fomo-icon">⚠️</span> {t.t3_fomo_title}</h4>
            <p className="fomo-desc" dangerouslySetInnerHTML={{ __html: t.t3_fomo_desc }}></p>
          </div>

          <div className="addons-block fade-in">
            <h4 className="addons-title">{t.addons_title}</h4>
            <div className="addons-list">
              <span className="addon-tag">{t.addons_1}</span>
              <span className="addon-tag">{t.addons_2}</span>
              <span className="addon-tag">{t.addons_3}</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-label fade-in">{t.how_label}</div>
          <h2 className="section-title fade-in" dangerouslySetInnerHTML={{ __html: t.how_title }}></h2>
          <p className="section-subtitle fade-in">{t.how_sub}</p>

          <div className="steps-container">
            <div className="step fade-in">
              <div className="step-number">01</div>
              <div className="step-content">
                <div className="step-connector"></div>
                <h3 className="step-title">{t.step1_title}</h3>
                <p className="step-desc">{t.step1_desc}</p>
              </div>
            </div>
            <div className="step fade-in">
              <div className="step-number">02</div>
              <div className="step-content">
                <div className="step-connector"></div>
                <h3 className="step-title">{t.step2_title}</h3>
                <p className="step-desc">{t.step2_desc}</p>
              </div>
            </div>
            <div className="step fade-in">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">{t.step3_title}</h3>
                <p className="step-desc">{t.step3_desc}</p>
              </div>
            </div>
          </div>

          <div className="steps-cta fade-in">
            <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
              <span>{t.how_cta}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* USE CASES SECTION */}
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

      {/* ABOUT SECTION */}
      <section className="section" id="about">
        <div className="container">
          <div className="about-wrapper">
            <div className="about-visual fade-in">
              <div className="about-avatar">
                <div className="avatar-ring"></div>
                <div className="avatar-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              </div>
              <div className="about-card-detail">
                <div className="detail-item">
                  <span className="detail-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <span>{t.about_location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </span>
                  <span>{t.about_role}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </span>
                  <span>{t.about_founder_role}</span>
                </div>
              </div>
            </div>

            <div className="about-content fade-in">
              <div className="section-label">{t.about_label}</div>
              <h2 className="section-title about-title" dangerouslySetInnerHTML={{ __html: t.about_title }}></h2>

              <div className="about-text">
                <p>{t.about_p1}</p>
                <p>{t.about_p2}</p>
                <p>{t.about_p3}</p>
              </div>

              <div className="about-ctas">
                <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <span>{t.about_cta1}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <a href="https://wa.me/201036755930" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  <span>{t.about_cta2}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section cta-section" id="cta">
        <div className="cta-bg-glow"></div>
        <div className="container">
          <div className="cta-wrapper fade-in">
            <div className="section-label">{t.cta_label}</div>
            <h2 className="cta-headline" dangerouslySetInnerHTML={{ __html: t.cta_title }}></h2>
            <p className="cta-subtext">{t.cta_sub}</p>
            <div className="cta-buttons">
              <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-xlarge">
                <span>{t.cta_btn}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </a>
              <p className="cta-note">{t.cta_note}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer" id="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#hero" className="nav-brand footer-nav-brand" onClick={(e) => handleSmoothScroll(e, '#hero')}>
                <span className="brand-name">BznsFlow</span>
                <span className="brand-tagline">{t.nav_tagline}</span>
              </a>
              <p className="footer-desc">{t.footer_desc}</p>
              <div className="footer-social">
                <a href="https://wa.me/201036755930" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_nav_heading}</h4>
              <ul className="footer-links">
                <li><a href="#problem" onClick={(e) => handleSmoothScroll(e, '#problem')}>{t.footer_nav_1}</a></li>
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_nav_2}</a></li>
                <li><a href="#tiers" onClick={(e) => handleSmoothScroll(e, '#tiers')}>{t.footer_nav_3}</a></li>
                <li><a href="#how-it-works" onClick={(e) => handleSmoothScroll(e, '#how-it-works')}>{t.footer_nav_4}</a></li>
                <li><a href="#about" onClick={(e) => handleSmoothScroll(e, '#about')}>{t.footer_nav_5}</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_services_heading}</h4>
              <ul className="footer-links">
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_svc_1}</a></li>
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_svc_2}</a></li>
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_svc_3}</a></li>
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_svc_4}</a></li>
                <li><a href="#benefits" onClick={(e) => handleSmoothScroll(e, '#benefits')}>{t.footer_svc_5}</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t.footer_contact_heading}</h4>
              <ul className="footer-contact">
                <li>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{t.about_location}</span>
                </li>
                <li>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  <a href="https://wa.me/201036755930" target="_blank" rel="noopener noreferrer">+20 103 675 5930</a>
                </li>
                <li>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <a href="mailto:ahmed@bznsflowai.com">ahmed@bznsflowai.com</a>
                </li>
                <li>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <a href="https://calendar.app.google/PjncJidpLfqP6yFX8" target="_blank" rel="noopener noreferrer">{t.footer_book}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copy">{t.footer_copy}</p>
            <p className="footer-founder">{t.footer_founder}</p>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <div className="whatsapp-float" id="whatsappFloat" style={{ opacity: 1, transform: 'translateY(0)' }}>
        <a href="https://wa.me/201036755930" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
          <div className="whatsapp-tooltip">{t.wa_tooltip}</div>
          <div className="whatsapp-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
          </div>
        </a>
      </div>
    </>
  );
}

export default App;
