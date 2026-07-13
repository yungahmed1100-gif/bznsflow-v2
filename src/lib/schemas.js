import { SITE } from '../routes-manifest';

// Per-locale homepage SEO copy (en/ar are the prerendered locales).
export const HOME_SEO = {
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
export function buildSchemas(t, lang) {
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

