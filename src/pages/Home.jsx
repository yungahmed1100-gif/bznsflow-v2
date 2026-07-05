import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStrings, isLoaded, loadLang } from '../i18n';
import { postLead } from '../lib/leads';
import { Seo } from '../components/ui/Seo';
import { SITE } from '../routes-manifest';

// All sections are STATIC imports — they must be in the prerendered HTML for SEO.
// (Previously React.lazy behind <Suspense>, which rendered nothing during SSG.)
import { NavBar }             from '../components/layout/NavBar';
import { HeroSection }        from '../components/sections/HeroSection';
import { ProblemSection }     from '../components/sections/ProblemSection';
import { ROISection }         from '../components/sections/ROISection';
import { SolutionsSection }   from '../components/sections/SolutionsSection';
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
import { LeadModal }          from '../components/modals/LeadModal';

// ─── Shared constants ────────────────────────────────────────────────────────
const CALENDAR_URL  = 'https://calendar.app.google/KS48NKMVXPugQEhm6';
const WHATSAPP_URL  = 'https://wa.me/201036755930';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇴🇲', label: 'عربي' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const trackEvent = (name, props) => {
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }
};

// Per-locale homepage SEO copy (en/ar are the prerendered locales).
const HOME_SEO = {
  en: {
    title: 'BznsFlow — Business-in-a-Box Tech Solutions, Done For You',
    description: 'BznsFlow builds the tech that runs and grows your business — an AI front office, lead-capture websites, CRM, automation, AI agents, and custom apps. Done for you, 24/7, in Arabic & English. Built for businesses worldwide, proven in Oman.',
  },
  ar: {
    title: 'BznsFlow — حلول تقنية متكاملة لأعمالك، منجزة لك',
    description: 'BznsFlow يبني التقنية التي تُشغّل أعمالك وتُنمّيها — مكتب استقبال ذكي، مواقع لجذب العملاء، نظام CRM، أتمتة، وكلاء ذكاء اصطناعي، وتطبيقات مخصصة. منجز لك، 24/7، بالعربية والإنجليزية. لأعمال حول العالم، ومُثبَت في عُمان.',
  },
};

// Build fully-localized structured data schemas from the active language's
// translation strings. Called at render time, so the SSG build will bake the
// correct Arabic schemas into dist/ar.html and English into dist/index.html.
function buildSchemas(t, lang) {
  const isAr = lang === 'ar';

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BznsFlow',
    url: SITE,
    logo: `${SITE}/logo.png`,
    description: isAr
      ? 'BznsFlow شركة حلول تقنية متكاملة لأعمالك — منجزة لك. نبني التقنية التي تُشغّل أعمالك وتُنمّيها: مكتب استقبال ذكي، مواقع لجذب العملاء، نظام CRM، أتمتة وتكاملات، وكلاء ذكاء اصطناعي، وتطبيقات مخصصة. 24/7 بالعربية والإنجليزية. لأعمال حول العالم، ومُثبَت في عُمان.'
      : 'BznsFlow is a business-in-a-box tech solutions company — done for you. We build the tech that runs and grows your business: an AI front office, lead-capture websites, a CRM, automation and integrations, AI agents, and custom apps. 24/7 in Arabic and English. For businesses worldwide, proven in Oman.',
    founder: { '@type': 'Person', name: 'Ahmed Darwish' },
    foundingDate: '2024',
    areaServed: 'Worldwide',
    knowsAbout: isAr
      ? ['حلول تقنية للأعمال', 'البرمجيات كخدمة', 'تطوير المواقع', 'تطبيقات مخصصة', 'أتمتة الأعمال', 'تكاملات الأنظمة', 'نظام CRM', 'وكلاء ذكاء اصطناعي', 'مكتب استقبال ذكي', 'أتمتة واتساب', 'مواقع لجذب العملاء', 'التسويق الرقمي', 'إدارة العملاء']
      : ['business tech solutions', 'business-in-a-box SaaS', 'web development', 'custom apps', 'business automation', 'system integrations', 'CRM', 'AI agents', 'AI front office', 'WhatsApp automation', 'lead-capture websites', 'digital marketing', 'customer management'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Arabic'],
      url: 'https://wa.me/201036755930',
    },
    sameAs: ['https://wa.me/201036755930'],
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BznsFlow',
    url: SITE,
    inLanguage: lang,
    description: isAr
      ? 'موظف استقبال آلي وحجز وأتمتة طلبات واتساب بالذكاء الاصطناعي للأعمال حول العالم — رد فوري وتأهيل وحجز واستقبال طلبات بالعربية والإنجليزية.'
      : 'AI receptionist, booking, and WhatsApp order automation for businesses worldwide — instant replies, lead qualification, appointment booking, and order taking in Arabic and English.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE}#{search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BznsFlow',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: isAr ? 'حلول تقنية متكاملة للأعمال' : 'Business-in-a-Box Tech Solutions',
    operatingSystem: 'Web, WhatsApp, iOS, Android',
    url: SITE,
    description: isAr
      ? 'حلول تقنية متكاملة منجزة لك: مكتب استقبال ذكي، مواقع لجذب العملاء، نظام CRM، أتمتة وتكاملات، وكلاء ذكاء اصطناعي، وتطبيقات مخصصة — 24/7 بالعربية والإنجليزية.'
      : 'Done-for-you tech solutions: an AI front office, lead-capture websites, a CRM, automation and integrations, AI agents, and custom apps — 24/7 in Arabic and English.',
    provider: { '@type': 'Organization', name: 'BznsFlow', url: SITE },
  };

  // Build FAQ schema from the active locale's translation strings.
  const faqItems = [];
  for (let i = 1; i <= 6; i++) {
    const q = (t[`faq_q${i}`] || '').trim();
    const a = (t[`faq_a${i}`] || '').trim().replace(/<[^>]+>/g, '');
    if (q && a) faqItems.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
  }
  const faq = faqItems.length
    ? { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang, mainEntity: faqItems }
    : null;

  // Two engines, modelled as Service items with serviceType + audience so search
  // and answer engines can match per-vertical "AI receptionist / order taking" queries.
  const engines = [
    {
      name: isAr ? 'محرك العملاء' : 'Lead Engine',
      serviceType: isAr ? 'موظف استقبال آلي وتأهيل العملاء بالذكاء الاصطناعي' : 'AI receptionist & lead qualification',
      description: isAr
        ? 'موظف استقبال آلي يرد في ثوانٍ، يؤهّل العميل، يحجز المعاينة أو الموعد، ويتابع آلياً — للأعمال التي تعيش على العملاء عالي القيمة.'
        : 'AI receptionist that replies in seconds, qualifies the lead, books the viewing or appointment, and follows up automatically — for high-value lead businesses.',
      audience: isAr
        ? 'العقارات، عيادات الأسنان، العيادات الطبية، التكييف والتبريد، المقاولات'
        : 'Real estate, dental clinics, medical clinics, HVAC, and construction businesses',
    },
    {
      name: isAr ? 'محرك الطلبات' : 'Order Engine',
      serviceType: isAr ? 'استقبال الطلبات والحجوزات بالذكاء الاصطناعي عبر واتساب' : 'AI order taking & customer response (WhatsApp)',
      description: isAr
        ? 'الذكاء الاصطناعي يستقبل الطلبات والحجوزات والأسئلة فوراً، ويؤكّدها آلياً، ويعيد العملاء بالتذكيرات — للأعمال عالية حجم الطلبات.'
        : 'AI that takes orders, reservations, and FAQs instantly, confirms automatically, and brings customers back with reminders — for high-volume order businesses.',
      audience: isAr
        ? 'معارض الكيك، المقاهي ومحلات الحلويات، المطاعم'
        : 'Cake galleries, coffee & dessert shops, and restaurants',
    },
  ];

  const serviceList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isAr ? 'محرّكا BznsFlow بالذكاء الاصطناعي' : 'BznsFlow AI Engines',
    description: isAr ? 'محرّكان بالذكاء الاصطناعي منجزان لك — محرك العملاء ومحرك الطلبات' : 'Two done-for-you AI engines — Lead Engine and Order Engine',
    url: SITE,
    numberOfItems: engines.length,
    itemListElement: engines.map((engine, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Service',
        name: engine.name,
        serviceType: engine.serviceType,
        description: engine.description,
        provider: { '@type': 'Organization', name: 'BznsFlow', url: SITE },
        areaServed: 'Worldwide',
        audience: { '@type': 'Audience', audienceType: engine.audience },
      },
    })),
  };

  return [organization, website, software, serviceList, ...(faq ? [faq] : [])];
}

// ─── Service catalogue ───────────────────────────────────────────────────────
const SERVICES = [
  { icon: '🤖', name: 'AI Lead Response Agent',              tag: '78% of buyers go with the first agent who replies. This makes you first — every time.',                                    bullets: ['Replies to every lead in under 60 seconds — at 2am, on weekends', 'Works across portals, website, WhatsApp, and missed calls', 'Qualifies on entry so agents only speak to ready buyers'],                                   category: 'foundation' },
  { icon: '🎯', name: 'AI Lead Qualification',               tag: 'Stop burning agent hours on tyre-kickers. Let AI filter every lead instantly.',                                            bullets: ['Qualifies every lead by budget, area, intent, and timeline', 'Delivers only sales-ready buyers and sellers to your agents', 'Active 24/7 across your website, portals, WhatsApp, and social'],                          category: 'foundation' },
  { icon: '🔀', name: 'Smart Lead Routing',                  tag: 'A lead sent to the wrong agent is a dead lead. We route every one in seconds.',                                            bullets: ['Auto-assigns leads by area, price band, language, and agent load', 'Instant hand-off with full context — no lead left waiting', 'Round-robin, performance-based, or custom rules for your team'],                              category: 'foundation' },
  { icon: '💬', name: 'WhatsApp & Portal Automation',        tag: 'WhatsApp and the portals are where buyers decide. We engineer them to convert.',                                          bullets: ['Connects Bayut, Property Finder, Zillow, Rightmove & more', 'Intelligent auto-replies that understand buying intent', 'Turns portal inquiries into booked viewings automatically'],                                 category: 'foundation' },
  { icon: '📊', name: 'Real Estate Deal CRM',                tag: 'Deals don\'t die in viewings. They die in missed follow-ups and forgotten leads.',                                         bullets: ['Every lead, agent, and deal stage visible — nothing slips through', 'Automated follow-up sequences that nurture buyers until they\'re ready', 'Real-time pipeline so you see exactly where commission is stalling'],                category: 'foundation' },
  { icon: '📅', name: 'Showing & Viewing Scheduler',         tag: 'Every missed viewing is a lost commission. Every manual booking wastes agent time.',                                       bullets: ['Buyers self-book viewings 24/7 — no calls, no back-and-forth', 'Smart reminders that eliminate no-shows before they happen', 'Auto-synced to every agent\'s calendar — zero double-bookings'],                              category: 'foundation' },
  { icon: '🌐', name: 'Listing & Lead-Capture Site',         tag: 'Your site isn\'t a brochure — it\'s your top-producing agent. We engineer it to convert.',                                  bullets: ['Built to turn visitors into qualified, booked leads', 'Fast, mobile-first, with IDX/portal-synced listings', 'Captures inquiries 24/7 so no buyer leaves without follow-up'],                                       category: 'foundation' },
  { icon: '🏆', name: 'Agent Reputation Engine',             tag: '92% of buyers read reviews before choosing an agent. What are yours saying?',                                              bullets: ['Automated review requests after every closing and viewing', 'Real-time monitoring so you catch issues before they spread', 'Positions your agents as the obvious, trusted choice in their area'],                          category: 'foundation' },
  { icon: '📡', name: 'Pipeline Intelligence Dashboard',     tag: 'You can\'t scale a pipeline you can\'t see. We give you the numbers to move first.',                                        bullets: ['Real-time view of leads, sources, agent conversion & bottlenecks', 'Know your cost per lead, speed-to-lead, and close rate by agent', 'Spot which campaigns and agents drive real commission'],                                  category: 'foundation' },
  { icon: '📲', name: 'Buyer & Seller Nurture',              tag: '80% of deals need 5+ touches, yet most leads never get a second one. We fix that.',                                        bullets: ['Automated drip sequences that keep cold leads warm for months', 'Triggered by behaviour — new listings, price drops, saved searches', 'Turns "not yet" leads into closings without agent effort'],                                category: 'growth' },
  { icon: '🎯', name: 'Property Ad Management',              tag: 'Most teams waste 60–70% of ad budget on bad targeting. Every dollar should drive a lead.',                                 bullets: ['Meta, Google & portal campaigns built around cost per qualified lead', 'Always-on A/B testing and weekly optimization, zero budget wasted', 'Leads flow straight into your CRM and routing — not a spreadsheet'],            category: 'growth' },
  { icon: '✉️', name: 'Email & SMS Lead Reactivation',       tag: 'Your old lead database is sitting on unclaimed commission right now.',                                                     bullets: ['Reactivation campaigns that revive cold and dead leads', 'Automated sequences that book viewings from your existing list', 'Highest-ROI channel in real estate — leads you already paid for'],                              category: 'growth' },
  { icon: '🎬', name: 'Listing & Reels Video Engine',        tag: 'Video listings get far more engagement. If your listings aren\'t in the feed, your rival\'s are.',                          bullets: ['Property reels and listing videos produced and published monthly', 'Consistent video presence drives more inbound buyer inquiries', 'Subtitled, trend-aware, optimized for Instagram, TikTok & YouTube'],                          category: 'scale' },
  { icon: '✍️', name: 'Market-Report Content & SEO',         tag: 'Buyers and sellers search before they pick an agent. Own page one in your market.',                                        bullets: ['Area guides and market reports — AI-drafted, human-edited, built to rank', 'Local keyword strategy that pulls in buyer and seller intent', 'Compounds monthly — becomes a durable source of organic leads'],                            category: 'scale' },
  { icon: '🤝', name: 'Referral & Past-Client Engine',       tag: 'Repeat and referral business is the cheapest commission you\'ll ever earn. Automate it.',                                  bullets: ['Stay-in-touch automation that keeps you top-of-mind for years', 'Home-anniversary, market-update, and referral-ask sequences', 'Turns every closed deal into a future pipeline of warm leads'],                                category: 'scale' },
  { icon: '🏢', name: 'Brokerage Growth Partnership',        tag: 'Scaling a brokerage is an engineering problem. We run the whole growth engine with you.',                                  bullets: ['Custom-trained AI workforce built for your brokerage and markets', 'Multi-team, multi-market lead and agent management', 'Executive-level strategy, reporting, and continuous optimization'],                                  category: 'scale' },
  { icon: '📱', name: 'Custom Apps',                         tag: 'Tailor-made applications to run your business exactly how you need.',                                                      bullets: ['Bespoke web and mobile applications tailored to your exact workflow', 'Seamless integration with your existing CRM and tools', 'Scalable architecture designed for performance and growth'],                                            category: 'scale' },
];

const SERVICES_AR = [
  {"icon":"🤖","name":"وكيل الرد على العملاء بالذكاء الاصطناعي","tag":"78% من المشترين يتعاملون مع أول وكيل يرد عليهم. هذا يجعلك الأول — في كل مرة.","bullets":["يرد على كل عميل محتمل في أقل من 60 ثانية — ليلاً وفي العطل","يعمل عبر بوابات العقارات والموقع وواتساب والمكالمات الفائتة","يؤهّل العميل فور وصوله حتى لا يتحدث الوكلاء إلا مع المشترين الجاهزين"],"category":"foundation"},
  {"icon":"🎯","name":"تأهيل العملاء بالذكاء الاصطناعي","tag":"توقف عن إهدار ساعات الوكلاء على غير الجادين. دع الذكاء يفلتر كل عميل فوراً.","bullets":["يؤهّل كل عميل حسب الميزانية والمنطقة والنية والتوقيت","يُسلّم فقط المشترين والبائعين الجاهزين إلى وكلائك","نشط 24/7 عبر موقعك والبوابات وواتساب ووسائل التواصل"],"category":"foundation"},
  {"icon":"🔀","name":"التوجيه الذكي للعملاء","tag":"العميل المُرسَل إلى الوكيل الخطأ هو عميل ميت. نوجّه كل واحد في ثوانٍ.","bullets":["يوزّع العملاء تلقائياً حسب المنطقة والسعر واللغة وحِمل الوكيل","تسليم فوري مع كامل السياق — لا عميل ينتظر","دوري، حسب الأداء، أو بقواعد مخصصة لفريقك"],"category":"foundation"},
  {"icon":"💬","name":"أتمتة واتساب وبوابات العقارات","tag":"واتساب والبوابات هما حيث يقرر المشترون. نهندسهما للتحويل.","bullets":["يربط Bayut وProperty Finder وZillow وRightmove وغيرها","ردود آلية ذكية تفهم نية الشراء","يحوّل استفسارات البوابات إلى معاينات محجوزة تلقائياً"],"category":"foundation"},
  {"icon":"📊","name":"نظام CRM للصفقات العقارية","tag":"الصفقات لا تموت في المعاينات. تموت في المتابعات الفائتة والعملاء المنسيين.","bullets":["كل عميل ووكيل ومرحلة صفقة مرئية — لا شيء يفلت","تسلسلات متابعة آلية تُرعى المشترين حتى يصبحوا جاهزين","مسار مباشر يكشف بالضبط أين تتعطل العمولة"],"category":"foundation"},
  {"icon":"📅","name":"نظام جدولة المعاينات","tag":"كل معاينة فائتة عمولة ضائعة. وكل حجز يدوي وقت وكيل مهدر.","bullets":["المشترون يحجزون المعاينات ذاتياً 24/7 — بلا مكالمات","تذكيرات ذكية تقضي على الغيابات قبل حدوثها","مزامنة تلقائية مع تقويم كل وكيل — لا ازدواجية حجوزات"],"category":"foundation"},
  {"icon":"🌐","name":"موقع العروض والتقاط العملاء","tag":"موقعك ليس كتيّباً — بل أفضل وكيل لديك. نهندسه ليُحوّل.","bullets":["مبني لتحويل الزوار إلى عملاء مؤهلين ومحجوزين","سريع، مُحسَّن للجوال، مع عروض مزامنة من البوابات","يلتقط الاستفسارات 24/7 حتى لا يغادر أي مشترٍ دون متابعة"],"category":"foundation"},
  {"icon":"🏆","name":"محرك سمعة الوكلاء","tag":"92% من المشترين يقرؤون التقييمات قبل اختيار وكيل. ماذا تقول تقييماتك؟","bullets":["طلبات تقييم آلية بعد كل صفقة ومعاينة","مراقبة فورية لتكتشف المشاكل قبل أن تنتشر","يضع وكلاءك كالخيار الواضح والموثوق في منطقتهم"],"category":"foundation"},
  {"icon":"📡","name":"لوحة ذكاء المسار","tag":"لا يمكنك توسيع مسار لا تراه. نمنحك الأرقام لتتحرك أولاً.","bullets":["عرض لحظي للعملاء والمصادر وتحويل الوكلاء والاختناقات","اعرف تكلفة العميل وسرعة الرد ومعدل الإغلاق لكل وكيل","اكتشف أي الحملات والوكلاء يحقق عمولة فعلية"],"category":"foundation"},
  {"icon":"📲","name":"رعاية المشترين والبائعين","tag":"80% من الصفقات تحتاج 5 لمسات أو أكثر، ومعظم العملاء لا يحصلون على ثانية. نُصلح ذلك.","bullets":["تسلسلات آلية تُبقي العملاء الباردين دافئين لأشهر","مُفعّلة بالسلوك — عروض جديدة، انخفاض أسعار، عمليات بحث محفوظة","تحوّل عملاء «ليس الآن» إلى صفقات دون جهد الوكيل"],"category":"growth"},
  {"icon":"🎯","name":"إدارة الإعلانات العقارية","tag":"معظم الفرق تُهدر 60–70% من ميزانية الإعلانات على استهداف ضعيف. كل دولار يجب أن يجلب عميلاً.","bullets":["حملات Meta وGoogle والبوابات مبنية على تكلفة العميل المؤهل","اختبار A/B دائم وتحسين أسبوعي، صفر هدر","العملاء يتدفقون مباشرة إلى نظامك — لا إلى جدول"],"category":"growth"},
  {"icon":"✉️","name":"إعادة تنشيط العملاء عبر البريد والرسائل","tag":"قاعدة عملائك القديمة تجلس على عمولة غير محصّلة الآن.","bullets":["حملات إعادة تنشيط تُحيي العملاء الباردين والميتين","تسلسلات آلية تحجز معاينات من قائمتك الحالية","أعلى عائد في العقارات — عملاء دفعت ثمنهم بالفعل"],"category":"growth"},
  {"icon":"🎬","name":"محرك فيديوهات العروض والريلز","tag":"فيديوهات العروض تحقق تفاعلاً أكبر بكثير. إن لم تكن عروضك في الفيد، فعروض منافسك هناك.","bullets":["ريلز عقارية وفيديوهات عروض تُنتَج وتُنشَر شهرياً","حضور فيديو منتظم يجلب استفسارات مشترين أكثر","مترجمة، مواكبة للترند، مُحسَّنة لإنستغرام وتيك توك ويوتيوب"],"category":"scale"},
  {"icon":"✍️","name":"محتوى تقارير السوق والسيو","tag":"المشترون والبائعون يبحثون قبل اختيار وكيل. سيطر على الصفحة الأولى في سوقك.","bullets":["أدلة مناطق وتقارير سوق — صُيغت بالذكاء، حُرّرت بشرياً، مبنية للترتيب","استراتيجية كلمات محلية تجذب نية المشتري والبائع","تتراكم شهرياً — تصبح مصدراً دائماً للعملاء العضويين"],"category":"scale"},
  {"icon":"🤝","name":"محرك الإحالات والعملاء السابقين","tag":"العملاء المتكررون والإحالات أرخص عمولة ستكسبها. أتمتها.","bullets":["أتمتة بقاء على تواصل تُبقيك في الذهن لسنوات","تسلسلات ذكرى الشراء وتحديثات السوق وطلب الإحالة","تحوّل كل صفقة مُغلقة إلى مسار عملاء دافئين مستقبلاً"],"category":"scale"},
  {"icon":"🏢","name":"شراكة نمو الوساطة العقارية","tag":"توسيع شركة وساطة مشكلة هندسية. نُشغّل محرك النمو بالكامل معك.","bullets":["قوة عمل ذكاء اصطناعي مُدرَّبة خصيصاً لشركتك وأسواقك","إدارة عملاء ووكلاء عبر فرق وأسواق متعددة","استراتيجية وتقارير وتحسين مستمر على مستوى تنفيذي"],"category":"scale"},
  {"icon":"📱","name":"تطبيقات مخصصة","tag":"تطبيقات مصممة خصيصاً لإدارة أعمالك بالطريقة التي تحتاجها بالضبط.","bullets":["تطبيقات ويب وهواتف ذكية مصممة لتناسب مسار عملك بدقة","تكامل سلس مع نظام CRM وأدواتك الحالية","بنية قابلة للتوسع مصممة للأداء والنمو"],"category":"scale"},
];

// ─── Plans (no prices) — Catch → Convert → Dominate ladder ────────────────────
const TIERS = [
  {
    key: 'catalyst',
    name: 'Catalyst',
    flag: null,
    popular: false,
    stage: 'Catch',
    bottleneck: 'Enquiries go unanswered',
    intro: 'The starting point. Catalyst plugs the first and biggest leak — enquiries that go unanswered. Your WhatsApp gets a tireless front desk that replies in seconds, day or night, captures every enquiry, and never lets a hot lead sit.',
    insideLabel: 'What it covers',
    inside: [
      'Layla — your AI front desk: replies on WhatsApp in seconds, 24/7, in your customers’ language',
      'Automatic enquiry capture straight into your pipeline',
      'Basic qualification — know who’s serious before you follow up',
      'Covers one service line or business area',
      'Hands anything that needs a human straight to you — never oversteps',
    ],
    roiReplaces: 'A part-time receptionist',
    roiLine: 'Annual coverage that’s live through every season, campaign, and after-hours message — with two months free versus paying month to month.',
    payback: 'First recovered customer',
    pull: 'For the owner who just needs to stop missing enquiries.',
    nextStep: 'Layla answers everything — but the customers who don’t reply yet still need follow-up, and you still need them booked.',
    cta: 'Get Catalyst on WhatsApp',
  },
  {
    key: 'ascend',
    name: 'Ascend',
    flag: 'Most popular',
    popular: true,
    stage: 'Convert',
    bottleneck: 'Answered enquiries never get booked',
    intro: 'The complete customer engine — with a home of its own. A done-for-you lead-capture website and the system behind it: it answers, follows up, nurtures, and books. This is where most businesses recover the customers they were quietly losing — the ones who reached out once and were never followed up.',
    insideLabel: 'Everything in Catalyst, plus',
    inside: [
      'A done-for-you lead-capture website — your brand, built to turn visitors into booked appointments and feed the engine',
      'Automated multi-touch follow-up and nurture sequences',
      'Smart booking flow — appointments scheduled straight into your calendar',
      'Live customer dashboard — every enquiry, score, and stage in one view',
      'Multiple service lines + full multi-language coverage',
      'Mahmood — security & data: de-duplicates enquiries, scores every lead hot/warm/cold, keeps records secure and updated',
      'Ali — manager & oversight: a daily report every evening, KPI tracking, quality grading, and an alert the moment an enquiry needs a human',
    ],
    roiReplaces: 'A CRM build, a lead-gen website, and reporting retainers',
    roiLine: 'A year of compounding follow-up — the nurture engine gets stronger the longer it runs on your pipeline, with two months free built in.',
    payback: 'One extra customer booked',
    pull: 'For the business that wants the whole funnel handled — website, capture, nurture, book.',
    nextStep: 'You convert what comes in — but across staff and locations, enquiries start falling between people.',
    cta: 'Get Ascend on WhatsApp',
  },
  {
    key: 'apex',
    name: 'Apex',
    flag: null,
    popular: false,
    stage: 'Dominate',
    bottleneck: 'Enquiries fall between staff & locations',
    intro: 'The command tier. Apex adds the structure a larger operation needs — enquiries routed to the right person automatically, priority handling, and the controls to run customer flow like an operation instead of a scramble.',
    insideLabel: 'Everything in Ascend, plus',
    inside: [
      'Automatic routing and assignment across your team',
      'Multiple AI agents tuned per service line or per location',
      'ARIA — outbound AI: reactivates dormant customers and old lists proactively',
      'Khaled — AI voice (coming soon, included): answers inbound calls with the same intelligence as Layla',
      'Priority response, priority support, advanced team reporting, and white-glove setup',
    ],
    roiReplaces: 'A full agency retainer plus a sales-ops hire',
    roiLine: 'Built for teams that plan in quarters — a full year of routing, reporting, and priority coverage across the team, with two months free.',
    payback: 'One reactivated customer',
    pull: 'For multi-location and multi-team businesses where enquiries can’t fall through the cracks.',
    nextStep: null,
    cta: 'Get Apex on WhatsApp',
  },
];

const TIERS_AR = [
  {
    key: 'catalyst',
    name: 'كاتاليست',
    flag: null,
    popular: false,
    stage: 'الالتقاط',
    bottleneck: 'الاستفسارات تبقى دون رد',
    intro: 'نقطة البداية. كاتاليست يعالج أول وأكبر سبب لخسارة العملاء — الاستفسارات التي تبقى دون رد. يصبح لواتساب عملك مكتب استقبال لا يكلّ، يرد في ثوانٍ ليلاً ونهاراً، يلتقط كل استفسار، ولا يترك عميلاً مهتماً ينتظر.',
    insideLabel: 'ما الذي يغطّيه',
    inside: [
      'ليلى — مكتب استقبالك الذكي: ترد على واتساب في ثوانٍ، 24/7، بلغة عملائك',
      'التقاط آلي للاستفسارات مباشرة في مسارك',
      'تأهيل أساسي — تعرف من هو الجاد قبل أن تتابع',
      'يغطّي خط خدمة أو مجال عمل واحد',
      'يُسلّم أي شيء يحتاج إنساناً إليك مباشرة — دون تجاوز',
    ],
    roiReplaces: 'موظف استقبال بدوام جزئي',
    roiLine: 'تغطية سنوية حيّة عبر كل موسم وحملة ورسالة بعد الدوام — مع شهرين مجاناً مقارنةً بالدفع الشهري.',
    payback: 'أول عميل مُستردّ',
    pull: 'للمالك الذي يحتاج فقط أن يتوقف عن تفويت الاستفسارات.',
    nextStep: 'ليلى ترد على الجميع — لكن العملاء الذين لا يردّون بعد يحتاجون متابعة، وما زلت تحتاج حجزهم.',
    cta: 'احصل على كاتاليست عبر واتساب',
  },
  {
    key: 'ascend',
    name: 'أسيند',
    flag: 'الأكثر شيوعاً',
    popular: true,
    stage: 'التحويل',
    bottleneck: 'الاستفسارات المُجابة لا تُحجَز',
    intro: 'محرك العملاء الكامل — مع بيت خاص به. موقع التقاط عملاء منجز لك والنظام خلفه: يرد، يتابع، يرعى، ويحجز. هنا تستعيد معظم الأعمال العملاء الذين كانوا يخسرونهم بصمت — الذين تواصلوا مرة ولم تتم متابعتهم أبداً.',
    insideLabel: 'كل ما في كاتاليست، بالإضافة إلى',
    inside: [
      'موقع التقاط عملاء منجز لك — بعلامتك، مبني لتحويل الزوار إلى مواعيد محجوزة ويغذّي المحرك',
      'متابعة ورعاية آلية متعددة اللمسات',
      'تدفق حجز ذكي — المواعيد تُجدوَل مباشرة في تقويمك',
      'لوحة عملاء حيّة — كل استفسار ودرجة ومرحلة في عرض واحد',
      'خطوط خدمة متعددة + تغطية كاملة متعددة اللغات',
      'محمود — الأمن والبيانات: يزيل الاستفسارات المكررة، يُقيّم كل عميل ساخن/دافئ/بارد، ويُبقي السجلات آمنة ومحدّثة',
      'علي — الإدارة والإشراف: تقرير يومي كل مساء، تتبّع المؤشرات، تقييم جودة المحادثات، وتنبيه فور حاجة الاستفسار إلى إنسان',
    ],
    roiReplaces: 'بناء CRM وموقع لجذب العملاء وباقات تقارير',
    roiLine: 'سنة من المتابعة المتراكمة — محرك الرعاية يزداد قوة كلما طال تشغيله على مسارك، مع شهرين مجاناً.',
    payback: 'عميل إضافي واحد محجوز',
    pull: 'للأعمال التي تريد المسار كله منجزاً — موقع، التقاط، رعاية، حجز.',
    nextStep: 'أنت تحوّل ما يصل — لكن عبر الموظفين والفروع، تبدأ الاستفسارات بالسقوط بين الأشخاص.',
    cta: 'احصل على أسيند عبر واتساب',
  },
  {
    key: 'apex',
    name: 'أبيكس',
    flag: null,
    popular: false,
    stage: 'السيطرة',
    bottleneck: 'الاستفسارات تسقط بين الموظفين والفروع',
    intro: 'الباقة الأعلى. أبيكس يضيف البنية التي تحتاجها العمليات الأكبر — استفسارات تُوجَّه للشخص المناسب تلقائياً، أولوية في المعالجة، وأدوات لإدارة تدفق العملاء كعملية منظّمة لا كفوضى.',
    insideLabel: 'كل ما في أسيند، بالإضافة إلى',
    inside: [
      'توجيه وتعيين آلي عبر فريقك',
      'وكلاء ذكاء اصطناعي متعددون مُهيَّأون لكل خط خدمة أو فرع',
      'آريا — تواصل صادر بالذكاء: يعيد تنشيط العملاء الخاملين والقوائم القديمة استباقياً',
      'خالد — الصوت الذكي (قريباً، مشمول): يرد على المكالمات الواردة بنفس ذكاء ليلى',
      'استجابة بأولوية، دعم بأولوية، تقارير فريق متقدمة، وإعداد فاخر',
    ],
    roiReplaces: 'باقة وكالة كاملة مع توظيف عمليات مبيعات',
    roiLine: 'مبني للفِرَق التي تخطط بالأرباع — سنة كاملة من التوجيه والتقارير وتغطية الأولوية عبر الفريق، مع شهرين مجاناً.',
    payback: 'عميل واحد مُعاد تنشيطه',
    pull: 'للأعمال متعددة الفروع والفِرَق حيث لا يمكن أن تسقط الاستفسارات بين الشقوق.',
    nextStep: null,
    cta: 'احصل على أبيكس عبر واتساب',
  },
];

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

  // Lead-capture modal
  // Exit-intent lead modal — the only popup. Fires when the user moves to leave.
  const [isLeadOpen,  setIsLeadOpen]  = useState(false);
  const [leadEmail,   setLeadEmail]   = useState('');
  const [leadStatus,  setLeadStatus]  = useState('idle');
  const exitIntentFired = useRef(false);

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

  // Fade-in observer. Re-runs on language switch.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 },
    );
    document.querySelectorAll('.fade-in:not(.visible)').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [lang]);

  // Exit-intent (desktop only, fires once per session)
  useEffect(() => {
    if (sessionStorage.getItem('bznsflow_exit_seen')) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const handleMouseLeave = (e) => {
      if (e.clientY > 0 || exitIntentFired.current) return;
      exitIntentFired.current = true;
      sessionStorage.setItem('bznsflow_exit_seen', '1');
      setIsLeadOpen(true);
      trackEvent('ExitIntentShown');
    };
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    return () => document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  // Body-scroll lock + Esc-to-close when lead modal open
  useEffect(() => {
    if (!isLeadOpen) return;
    const lastFocused = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') setIsLeadOpen(false); };
    document.addEventListener('keydown', handleKey);
    document.getElementById('lead-email')?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
      if (lastFocused && lastFocused.focus) lastFocused.focus();   // restore focus on close
    };
  }, [isLeadOpen]);

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

  const closeLeadModal = () => {
    setIsLeadOpen(false);
    if (leadStatus === 'success') { setLeadStatus('idle'); setLeadEmail(''); }
  };

  const handleLeadEmailChange = (e) => {
    setLeadEmail(e.target.value);
    if (leadStatus === 'error') setLeadStatus('idle');
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    const email = leadEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setLeadStatus('error'); return; }
    setLeadStatus('submitting');
    trackEvent('LeadSubmit', { source: 'exit-intent' });
    try {
      await postLead({ email, sourceCta: 'Exit-intent modal' }, { lang });
      setLeadStatus('success');
    } catch (err) {
      console.error('Lead submission failed:', err);
      setLeadStatus('error');
    }
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
        <ROISection t={t} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
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

      <LeadModal
        t={t} lang={lang}
        isOpen={isLeadOpen}
        leadEmail={leadEmail} leadStatus={leadStatus}
        CALENDAR_URL={CALENDAR_URL}
        onClose={closeLeadModal}
        onEmailChange={handleLeadEmailChange}
        onSubmit={handleLeadSubmit}
        trackEvent={trackEvent}
      />
    </>
  );
}
