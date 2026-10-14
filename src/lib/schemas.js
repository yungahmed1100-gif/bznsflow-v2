import { SITE, urlFor } from '../routes-manifest';

// Per-locale homepage SEO copy (en/ar are the prerendered locales).
export const HOME_SEO = {
  en: {
    title: 'Qualified inquiries on WhatsApp & Instagram | BznsFlow',
    description: 'Catalyst: Layla answers your WhatsApp and Instagram inquiries from the facts you approve, asks your qualifying questions and hands you the chat and customer record. Free audit.',
  },
  ar: {
    title: 'استفسارات مؤهلة على واتساب وإنستغرام | BznsFlow',
    description: 'كاتاليست: ليلى ترد على استفسارات واتساب وإنستغرام من معلوماتك المعتمدة، وتسأل أسئلة التأهيل الخاصة بك، وتسلّمك المحادثة وسجل العميل. احجز التدقيق المجاني.',
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
    '@id': `${SITE}/#organization`,
    name: 'BznsFlow',
    url: SITE,
    logo: `${SITE}/logo.png`,
    description: isAr
      ? 'BznsFlow يبني ويشغّل الذكاء الاصطناعي والأتمتة للأعمال في عُمان والخليج. كاتاليست للاستفسارات وأسيند للعمليات القطاعية متاحان بالاتفاق مع الفريق. أبيكس قيد الإعداد.'
      : 'BznsFlow builds and runs AI and automation for businesses in Oman and the GCC. Catalyst handles inquiries; Ascend adds sector operations. Access is arranged with the team. Apex is in preparation.',
    founder: {
      '@type': 'Person',
      name: 'Ahmed Darwish',
      jobTitle: 'Founder',
      sameAs: ['https://www.linkedin.com/in/ahmed-darwish-723822230/'],
    },
    foundingDate: '2024',
    areaServed: ['Oman', 'GCC'],
    knowsAbout: isAr
      ? ['تأهيل الاستفسارات', 'أتمتة واتساب', 'أتمتة إنستغرام', 'الذكاء الاصطناعي للأعمال', 'أتمتة الأعمال', 'جذب العملاء', 'تطوير المواقع', 'نظام CRM']
      : ['inquiry qualification', 'WhatsApp automation', 'Instagram automation', 'AI for business', 'business automation', 'customer acquisition', 'web development', 'CRM'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Arabic'],
      email: 'ahmed@bznsflowai.com',
      telephone: '+201036755930',
      url: 'https://wa.me/201036755930',
    },
    // Profiles that confirm this is the same business. Public URLs only: the
    // LinkedIn admin path and Instagram's share-tracking query are stripped.
    sameAs: [
      'https://www.linkedin.com/company/144967111/',
      'https://www.instagram.com/bznsflow/',
      'https://wa.me/201036755930',
    ],
    // Business verification granted by Meta, 2026-09-16. Not App Review.
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'Meta Verified Tech Provider',
      credentialCategory: 'Platform verification',
      recognizedBy: { '@type': 'Organization', name: 'Meta', url: 'https://www.meta.com' },
    },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: 'BznsFlow',
    url: SITE,
    inLanguage: ['ar', 'en'],
    publisher: { '@id': `${SITE}/#organization` },
    description: isAr
      ? 'استفسارات مؤهلة على واتساب وإنستغرام لأعمال عُمان والخليج، بالعربية والإنجليزية.'
      : 'Qualified inquiries on WhatsApp and Instagram for businesses in Oman and the GCC, in Arabic and English.',
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BznsFlow',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: isAr ? 'تأهيل الاستفسارات على واتساب وإنستغرام' : 'Inquiry qualification on WhatsApp and Instagram',
    operatingSystem: 'Web, WhatsApp, Instagram',
    url: SITE,
    description: isAr
      ? 'كاتاليست: ليلى ترد من معلوماتك المعتمدة، وتسأل أسئلة التأهيل الخاصة بك، وتسلّمك المحادثة وسجل العميل مع إمكانية الاستلام في أي وقت.'
      : 'Catalyst: Layla answers from your approved facts, asks your qualifying questions and hands you the chat and customer record, with human takeover any time.',
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

  // Available services have no invented price or self-serve purchase action.
  const catalyst = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE}/#catalyst`,
    name: isAr ? 'كاتاليست' : 'Catalyst',
    serviceType: isAr ? 'تأهيل الاستفسارات على واتساب وإنستغرام' : 'Inquiry answering and qualification on WhatsApp and Instagram',
    description: isAr
      ? 'ليلى ترد على الاستفسارات من معلومات النشاط المعتمدة، وتسأل أسئلة التأهيل المحددة، وتسلّم صاحب العمل المحادثة وسجل العميل.'
      : 'Layla answers inquiries from approved business facts, asks configured qualifying questions and hands the owner the conversation and customer record.',
    provider: { '@id': `${SITE}/#organization` },
    areaServed: ['Oman', 'GCC'],
    availableChannel: { '@type': 'ServiceChannel', serviceUrl: SITE, availableLanguage: ['Arabic', 'English'] },
  };

  const ascend = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE}/#ascend`,
    name: isAr ? 'أسيند' : 'Ascend',
    serviceType: isAr ? 'عمليات الأعمال حسب القطاع' : 'Sector-specific business operations',
    description: isAr
      ? 'يشمل أسيند موقعاً مجانياً لجمع بيانات العملاء المحتملين كهدية، وليلى للاستفسارات، وحاسب لتتبّع العمل والتذكيرات المفعّلة، وأديبة للعروض التي تعتمدها. قريباً: راسل للنشرات والتسويق عبر البريد الإلكتروني للمشتركين والعملاء الموافقين، بحملات وسلاسل متابعة معتمدة. الوصول يمنحه الفريق، والأتمتة تعتمد على القطاع والإعداد المتفق عليه.'
      : 'Ascend includes a free lead capture website as a gift, Layla for inquiries, Hasib for sector work and enabled reminders, and Adiba for owner-approved offers. Coming soon: Rasil for email newsletters and marketing to subscribers and consenting customers, using approved campaigns and follow-up sequences. Access is granted by the team. Automation depends on the sector and agreed setup.',
    provider: { '@id': `${SITE}/#organization` },
    areaServed: ['Oman', 'GCC'],
    url: `${urlFor('/', lang)}#tiers`,
  };
  const page = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${urlFor('/', lang)}#webpage`,
    url: urlFor('/', lang),
    name: HOME_SEO[lang].title,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE}/#website` },
    about: { '@id': `${SITE}/#organization` },
    mainEntity: [{ '@id': `${SITE}/#catalyst` }, { '@id': `${SITE}/#ascend` }],
  };
  return [organization, website, page, software, catalyst, ascend, ...(faq ? [faq] : [])];
}

// Reuse visible page content; do not infer a registered address or legal entity.
export function buildBusinessPageSchema(page, path, lang, updated) {
  const url = urlFor(path, lang);
  return [{
    '@context': 'https://schema.org',
    '@type': path === '/contact' ? 'ContactPage' : 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: lang,
    dateModified: updated,
    isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'BznsFlow', url: SITE },
    about: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'BznsFlow', url: SITE },
  }];
}
