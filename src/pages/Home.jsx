import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStrings } from '../i18n';
import { initReveals } from '../lib/reveal';
import { trackEvent } from '../lib/analytics';
import { useExitIntent } from '../hooks/useExitIntent';
import { CALENDAR_URL, WHATSAPP_URL, LANGUAGES } from '../lib/constants';
import { HOME_SEO, buildSchemas } from '../lib/schemas';
import { TIERS, TIERS_AR } from '../data/tiers';
import { Seo } from '../components/ui/Seo';

// All sections are STATIC imports — they must be in the prerendered HTML for SEO.
// (Previously React.lazy behind <Suspense>, which rendered nothing during SSG.)
import { NavBar }             from '../components/layout/NavBar';
import { HeroSection }        from '../components/sections/HeroSection';
import { SolutionsSection }   from '../components/sections/SolutionsSection';
import { ChatWidget }         from '../components/chat/ChatWidget';
import { ClientTape }        from '../components/sections/ClientTape';
import { AITeamSection }      from '../components/sections/AITeamSection';
import { HowItWorksSection }  from '../components/sections/HowItWorksSection';
import { TiersSection }       from '../components/sections/TiersSection';
import { BenefitsSection }    from '../components/sections/BenefitsSection';
import { AboutSection }       from '../components/sections/AboutSection';
import { FAQSection }         from '../components/sections/FAQSection';
import { Footer }             from '../components/layout/Footer';
import { StickyMobileCTA }    from '../components/ui/StickyMobileCTA';
import { PlaybookModal }      from '../components/ui/PlaybookModal';

// ─── Home page ───────────────────────────────────────────────────────────────
// `lang` is the locale of THIS prerendered route ('ar' at /, 'en' at /en).
export default function Home({ lang: routeLang = 'ar' }) {
  const navigate = useNavigate();

  const lang = routeLang;

  const [isMenuOpen,    setIsMenuOpen]    = useState(false);
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [activeLink,    setActiveLink]    = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isChatOpen,    setIsChatOpen]    = useState(false);

  // The popup must never stack on top of another surface that already
  // owns the screen — two dialogs at once is a trap, not a prompt.
  const playbook = useExitIntent({ suppressed: isChatOpen || isMenuOpen });

  const t              = getStrings(lang);
  const activeTiers    = lang === 'ar' ? TIERS_AR : TIERS;
  const seo            = HOME_SEO[routeLang] || HOME_SEO.ar;
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

  // Both languages are prerendered routes — switching = navigating.
  const setLanguage = (code) => {
    navigate(code === 'en' ? '/en' : '/');
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
        <ClientTape t={t} />
        <SolutionsSection t={t} trackEvent={trackEvent} />
        <AITeamSection t={t} lang={lang} trackEvent={trackEvent} />
        <HowItWorksSection t={t} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
        <TiersSection t={t} tiers={activeTiers} lang={lang} trackEvent={trackEvent} />
        <BenefitsSection t={t} />
        <AboutSection t={t} lang={lang} CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL} trackEvent={trackEvent} />
        <FAQSection t={t} trackEvent={trackEvent} />
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

      <ChatWidget t={t} lang={lang} trackEvent={trackEvent} onOpenChange={setIsChatOpen} />

      <PlaybookModal
        t={t} lang={lang}
        open={playbook.armed}
        onClose={playbook.dismiss}
        trackEvent={trackEvent}
      />
    </>
  );
}
