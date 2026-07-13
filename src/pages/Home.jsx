import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStrings, isLoaded, loadLang } from '../i18n';
import { initReveals } from '../lib/reveal';
import { trackEvent } from '../lib/analytics';
import { CALENDAR_URL, WHATSAPP_URL, LANGUAGES } from '../lib/constants';
import { HOME_SEO, buildSchemas } from '../lib/schemas';
import { TIERS, TIERS_AR } from '../data/tiers';
import { Seo } from '../components/ui/Seo';

// All sections are STATIC imports — they must be in the prerendered HTML for SEO.
// (Previously React.lazy behind <Suspense>, which rendered nothing during SSG.)
import { NavBar }             from '../components/layout/NavBar';
import { HeroSection }        from '../components/sections/HeroSection';
import { ProblemSection }     from '../components/sections/ProblemSection';
import { SolutionsSection }   from '../components/sections/SolutionsSection';
import { ChatWidget }         from '../components/chat/ChatWidget';
import { TwoTrackSection }    from '../components/sections/TwoTrackSection';
import { AITeamSection }      from '../components/sections/AITeamSection';
import { HowItWorksSection }  from '../components/sections/HowItWorksSection';
import { TiersSection }       from '../components/sections/TiersSection';
import { BenefitsSection }    from '../components/sections/BenefitsSection';
import { TestimonialsSection } from '../components/sections/TestimonialsSection';
import { AboutSection }       from '../components/sections/AboutSection';
import { FAQSection }         from '../components/sections/FAQSection';
import { CTASection }         from '../components/sections/CTASection';
import { Footer }             from '../components/layout/Footer';
import { StickyMobileCTA }    from '../components/ui/StickyMobileCTA';

// ─── Home page ───────────────────────────────────────────────────────────────
// `lang` is the locale of THIS prerendered route ('en' at /, 'ar' at /ar).
export default function Home({ lang: routeLang = 'en' }) {
  const navigate = useNavigate();

  // Base language = the route's locale. nl/de/es are client-only "soft" switches
  // (no route) — they update this state without changing the URL.
  const [lang, setLang] = useState(routeLang);
  useEffect(() => { setLang(routeLang); }, [routeLang]);

  const [isMenuOpen,    setIsMenuOpen]    = useState(false);
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [activeLink,    setActiveLink]    = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Bump to force a re-render when a lazily-loaded language finishes loading.
  const [, setLangTick] = useState(0);

  // Use the requested language only if its strings are loaded; otherwise render
  // English until the chunk resolves (avoids a flash of missing keys).
  const activeLang     = isLoaded(lang) ? lang : 'en';
  const t              = getStrings(activeLang);
  const activeTiers    = activeLang === 'ar' ? TIERS_AR : TIERS;
  const seo            = HOME_SEO[routeLang] || HOME_SEO.en;
  const jsonLd         = buildSchemas(t, routeLang);

  // ── Effects (all browser-only work lives here — never runs during SSG) ──────

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);

      const navbarHeight = 72;
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop - navbarHeight - 80;
        if (window.scrollY >= top && window.scrollY < top + section.offsetHeight) {
          current = section.getAttribute('id');
        }
      });
      setActiveLink(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveals (single site-wide primitive). Re-runs on language switch.
  useEffect(() => initReveals(), [lang]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  // en/ar are real prerendered routes → navigate. nl/es/de are client-only soft
  // switches → swap strings in place (lazy-load the chunk if needed).
  const setLanguage = (code) => {
    if (code === 'en') { navigate('/'); return; }
    if (code === 'ar') { navigate('/ar'); return; }
    setLang(code);
    if (!isLoaded(code)) loadLang(code).then(() => setLangTick(n => n + 1));
  };

  const closeMenu = () => { setIsMenuOpen(false); document.body.style.overflow = ''; };
  const openMenu  = () => { setIsMenuOpen(true);  document.body.style.overflow = 'hidden'; };

  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const el = document.querySelector(targetId);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
    closeMenu();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Seo
        lang={routeLang}
        path="/"
        title={seo.title}
        description={seo.description}
        jsonLd={jsonLd}
      />

      <NavBar
        t={t} lang={lang} isScrolled={isScrolled} isMenuOpen={isMenuOpen}
        activeLink={activeLink} scrollProgress={scrollProgress}
        LANGUAGES={LANGUAGES} CALENDAR_URL={CALENDAR_URL}
        onOpenMenu={openMenu} onCloseMenu={closeMenu}
        onSmoothScroll={handleSmoothScroll} onSetLanguage={setLanguage}
      />

      <main id="main-content">
        <HeroSection
          t={t} lang={lang}
          CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL}
          onSmoothScroll={handleSmoothScroll} trackEvent={trackEvent}
        />
        <ProblemSection t={t} />
        <SolutionsSection t={t} trackEvent={trackEvent} />
        <TwoTrackSection t={t} onSmoothScroll={handleSmoothScroll} trackEvent={trackEvent} />
        <AITeamSection t={t} trackEvent={trackEvent} />
        <HowItWorksSection t={t} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
        <TiersSection t={t} tiers={activeTiers} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
        <BenefitsSection t={t} />
        <TestimonialsSection t={t} lang={lang} />
        <AboutSection t={t} lang={lang} CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL} trackEvent={trackEvent} />
        <FAQSection t={t} trackEvent={trackEvent} />
        <CTASection t={t} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
      </main>

      <Footer
        t={t} lang={lang}
        CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL}
        onSmoothScroll={handleSmoothScroll}
      />

      <StickyMobileCTA
        t={t}
        CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL}
        trackEvent={trackEvent}
      />

      <ChatWidget t={t} lang={lang} trackEvent={trackEvent} />
    </>
  );
}
