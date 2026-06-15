import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { getStrings, isLoaded, loadLang, ALL_LANGS, EAGER_LANGS } from './i18n';
import { postLead } from './lib/leads';
import './index.css';

// ── Above-the-fold: eager (in the critical render path) ──────────────────────
import { NavBar }             from './components/NavBar';
import { HeroSection }        from './components/HeroSection';
import { ProblemSection }     from './components/ProblemSection';

// ── Below-the-fold: lazy-loaded so they don't block first paint ──────────────
// Default exports aren't used by these modules, so map the named export through.
const BenefitsSection     = lazy(() => import('./components/BenefitsSection').then(m => ({ default: m.BenefitsSection })));
const ROISection          = lazy(() => import('./components/ROISection').then(m => ({ default: m.ROISection })));
const ServicesSection     = lazy(() => import('./components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const ComparisonSection   = lazy(() => import('./components/ComparisonSection').then(m => ({ default: m.ComparisonSection })));
const TiersSection        = lazy(() => import('./components/TiersSection').then(m => ({ default: m.TiersSection })));
const HowItWorksSection   = lazy(() => import('./components/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const UseCasesSection     = lazy(() => import('./components/UseCasesSection').then(m => ({ default: m.UseCasesSection })));
const TestimonialsSection = lazy(() => import('./components/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));
const AboutSection        = lazy(() => import('./components/AboutSection').then(m => ({ default: m.AboutSection })));
const CTASection          = lazy(() => import('./components/CTASection').then(m => ({ default: m.CTASection })));
const FAQSection          = lazy(() => import('./components/FAQSection').then(m => ({ default: m.FAQSection })));
const Footer              = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));

// Small interactive widgets — eager (tiny, and the modal/sticky CTA must be ready).
import { StickyMobileCTA }    from './components/StickyMobileCTA';
import { LeadModal }          from './components/LeadModal';

// ─── Shared constants ────────────────────────────────────────────────────────
const CALENDAR_URL  = 'https://calendar.app.google/JbRGCCbMXzaEUVrT7';
const WHATSAPP_URL  = 'https://wa.me/201036755930';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ar', flag: '🇦🇪', label: 'عربي' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];
const SUPPORTED_LANGS = ALL_LANGS;

const trackEvent = (name, props) => {
  if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }
};

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
];

// ─── Pricing tiers (Catch → Convert → Dominate ladder) ───────────────────────
const TIERS = [
  {
    key: 'catalyst',
    name: 'Catalyst',
    price: '$199',
    cadence: '/mo',
    flag: null,
    popular: false,
    stage: 'Catch',
    bottleneck: 'Leads die before anyone answers',
    intro: 'After 6pm and on weekends, inquiries hit WhatsApp, Instagram, your website, and the portals — and sit. Teams lose 30–40% of after-hours leads to whoever replies first.',
    insideLabel: "What's inside",
    inside: [
      'Layla on WhatsApp Business API (Meta-verified) — answers every inquiry in seconds, 24/7, in any language',
      'Four-question qualification — budget, area, financing, timeline — so only real buyers reach your team',
      'Auto-booking — qualified leads dropped straight into the team calendar, with confirmations sent',
      'Instant hot-lead alert to the right agent, with the full conversation as context',
      'Capture from everywhere — click-to-WhatsApp on Instagram and the website widget feed one brain',
      'Daily lead digest + transcripts to the owner — nothing lost, every conversation logged',
    ],
    roiReplaces: 'A part-time receptionist ($1,100–2,200/mo)',
    roiLine: 'Under one-fifth the cost of part-time coverage — with none of the gaps. Break-even is the first deal you would otherwise have lost.',
    payback: 'First recovered deal',
    pull: '$199/mo to stop losing the leads you already paid to generate.',
    nextStep: 'Layla catches and qualifies — but the 80% who say “not yet” still slip away, and you still can’t see which agent actually converts.',
    cta: 'Book Your Growth Call',
  },
  {
    key: 'ascend',
    name: 'Ascend',
    price: '$699',
    cadence: '/mo',
    flag: 'Most agencies start here',
    popular: true,
    stage: 'Convert',
    bottleneck: 'Leads leak in the middle of the funnel',
    intro: 'You’re catching leads now — but deals die between first contact and close. The “call me next month” buyers get no follow-up, leads live scattered in chats, and the owner is blind to who’s performing.',
    insideLabel: 'Everything in Catalyst, plus',
    inside: [
      'Khaled — inbound voice AI — answers calls, qualifies, and books, running the same brain as Layla',
      'Full custom CRM — a visual pipeline (lead → contacted → viewing → offer → closed), auto-logged',
      'Automated nurture sequences (WhatsApp + email) — drip the “not ready” leads until they are',
      'Review-generation engine — automated requests on Bayut, Property Finder, and Google, with a private-feedback intercept',
      'Owner BI dashboard — revenue, conversion by agent, response time, viewings, no-show rate',
      'Weekly performance digest to the owner',
    ],
    roiReplaces: 'A CRM build ($12K+) plus review & BI retainers',
    roiLine: 'A bespoke CRM build alone runs $12,000+. Ascend bundles all of it for ~$8,400 a year. One additional closed deal per quarter covers the entire year.',
    payback: 'One extra deal per quarter',
    pull: '$699/mo to stop deals dying in the gap you can’t see.',
    nextStep: 'You convert what comes in — but you’re still waiting for the phone to ring. No outbound, no forecast, no way to go and take the market.',
    cta: 'Book Your Growth Call',
  },
  {
    key: 'apex',
    name: 'Apex',
    price: '$1,799',
    cadence: '/mo',
    flag: null,
    popular: false,
    stage: 'Dominate',
    bottleneck: 'Growth is capped by your own reach',
    intro: 'You’re winning, but you’ve hit the ceiling of inbound volume and human outreach. You react to what arrives instead of going to get it, your dormant database sits cold, and the owner is still firefighting.',
    insideLabel: 'Everything in Ascend, plus',
    inside: [
      'ARIA — outbound AI calling agent — works lead lists, reactivates your dormant database, and books viewings proactively',
      'Modeer — autonomous monitoring — watches system KPIs, self-heals reversible issues, flags breakages before you notice',
      'Predictive BI — pipeline forecasting, which leads are likely to close, and where next quarter’s revenue is coming from',
      'Full 20-MVP stack access — paid ads, social, e-commerce, and more, switched on as you need them',
      'Dedicated growth strategist + a quarterly roadmap reviewed with you',
    ],
    roiReplaces: 'A full agency retainer ($3K–12K/mo)',
    roiLine: 'A comparable managed retainer runs $3,000–12,000/mo — for less capability and no outbound AI. ARIA reactivates leads you’d otherwise never touch. One reactivated deal pays for months.',
    payback: 'One reactivated deal',
    pull: '$1,799/mo to stop reacting and start dominating.',
    nextStep: null,
    cta: 'Book Your Growth Call',
  },
];

const TIERS_AR = [
  {
    key: 'catalyst',
    name: 'كاتاليست',
    price: '$199',
    cadence: '/شهرياً',
    flag: null,
    popular: false,
    stage: 'الالتقاط',
    bottleneck: 'العملاء يموتون قبل أن يردّ أحد',
    intro: 'بعد المساء وفي العطل، تصل الاستفسارات إلى واتساب وإنستغرام والموقع والبوابات — وتبقى دون رد. الفِرَق تخسر 30–40% من عملاء ما بعد الدوام لمن يرد أولاً.',
    insideLabel: 'ما الذي بالداخل',
    inside: [
      'ليلى على واتساب للأعمال (موثّق من Meta) — ترد على كل استفسار في ثوانٍ، 24/7، بأي لغة',
      'تأهيل بأربعة أسئلة — الميزانية، المنطقة، التمويل، التوقيت — فلا يصل فريقك إلا المشترون الجادون',
      'حجز آلي — العملاء المؤهلون يُدرَجون مباشرة في تقويم الفريق مع تأكيدات',
      'تنبيه فوري بالعميل الساخن للوكيل المناسب، مع كامل المحادثة كسياق',
      'التقاط من كل مكان — زر واتساب على إنستغرام وأداة الموقع يغذّيان عقلاً واحداً',
      'ملخص عملاء يومي + نصوص المحادثات للمالك — لا شيء يُفقد، كل محادثة مُسجّلة',
    ],
    roiReplaces: 'موظف استقبال بدوام جزئي (1,100–2,200$ شهرياً)',
    roiLine: 'أقل من خُمس تكلفة التغطية الجزئية — وبلا أي فجوات. نقطة التعادل هي أول صفقة كنت ستخسرها.',
    payback: 'أول صفقة مُستردّة',
    pull: '199$ شهرياً لإيقاف خسارة العملاء الذين دفعت بالفعل لتوليدهم.',
    nextStep: 'ليلى تلتقط وتؤهّل — لكن الـ80% الذين يقولون «ليس الآن» ما زالوا ينزلقون، وما زلت لا ترى أي وكيل يحوّل فعلاً.',
    cta: 'احجز مكالمة النمو',
  },
  {
    key: 'ascend',
    name: 'أسيند',
    price: '$699',
    cadence: '/شهرياً',
    flag: 'معظم الوكالات تبدأ هنا',
    popular: true,
    stage: 'التحويل',
    bottleneck: 'العملاء يتسربون في منتصف المسار',
    intro: 'أنت تلتقط العملاء الآن — لكن الصفقات تموت بين أول تواصل والإغلاق. عملاء «اتصل بي الشهر القادم» بلا متابعة، والعملاء مبعثرون في المحادثات، والمالك أعمى عن الأداء.',
    insideLabel: 'كل ما في كاتاليست، بالإضافة إلى',
    inside: [
      'خالد — ذكاء صوتي للمكالمات الواردة — يرد ويؤهّل ويحجز، بنفس عقل ليلى',
      'نظام CRM مخصص كامل — مسار مرئي (عميل ← تواصل ← معاينة ← عرض ← إغلاق)، يُسجَّل آلياً',
      'تسلسلات رعاية آلية (واتساب + بريد) — تُرعى العملاء غير الجاهزين حتى يصبحوا كذلك',
      'محرك توليد التقييمات — طلبات آلية على Bayut وProperty Finder وGoogle، مع اعتراض للتغذية الخاصة',
      'لوحة ذكاء أعمال للمالك — الإيرادات، التحويل لكل وكيل، زمن الرد، المعاينات، نسبة الغياب',
      'ملخص أداء أسبوعي للمالك',
    ],
    roiReplaces: 'بناء CRM (12 ألف$+) مع باقات التقييمات وذكاء الأعمال',
    roiLine: 'بناء CRM مخصص وحده يكلّف 12,000$+. أسيند يجمع كل ذلك مقابل ~8,400$ سنوياً. صفقة إضافية واحدة كل ربع تغطي السنة كاملة.',
    payback: 'صفقة إضافية كل ربع',
    pull: '699$ شهرياً لإيقاف موت الصفقات في الفجوة التي لا تراها.',
    nextStep: 'أنت تحوّل ما يصل — لكنك ما زلت تنتظر رنين الهاتف. لا تواصل خارجي، لا توقّعات، لا طريقة للذهاب وأخذ السوق.',
    cta: 'احجز مكالمة النمو',
  },
  {
    key: 'apex',
    name: 'أبيكس',
    price: '$1,799',
    cadence: '/شهرياً',
    flag: null,
    popular: false,
    stage: 'السيطرة',
    bottleneck: 'النمو مقيّد بحدود وصولك',
    intro: 'أنت تربح، لكنك بلغت سقف حجم الوارد وقدرة التواصل البشري. تتفاعل مع ما يصل بدل الذهاب لأخذه، وقاعدتك الخاملة باردة، والمالك ما زال يطفئ الحرائق.',
    insideLabel: 'كل ما في أسيند، بالإضافة إلى',
    inside: [
      'آريا — وكيل اتصال خارجي بالذكاء الاصطناعي — يعمل على قوائم العملاء، يعيد تنشيط قاعدتك الخاملة، ويحجز المعاينات استباقياً',
      'مدير — مراقبة ذاتية — يراقب مؤشرات النظام، يُصلح المشاكل القابلة للعكس ذاتياً، ويُنبّه قبل أن تلاحظ',
      'ذكاء أعمال تنبؤي — توقّع المسار، أي العملاء أقرب للإغلاق، ومن أين تأتي إيرادات الربع القادم',
      'وصول كامل لحزمة الـ20 منتجاً — إعلانات مدفوعة، سوشال، متاجر، وأكثر، تُفعَّل حسب حاجتك',
      'استراتيجي نمو مخصص + خارطة طريق ربع سنوية تُراجَع معك',
    ],
    roiReplaces: 'باقة وكالة كاملة (3–12 ألف$ شهرياً)',
    roiLine: 'باقة مُدارة مماثلة تكلّف 3,000–12,000$ شهرياً — بقدرات أقل وبلا ذكاء خارجي. آريا يعيد تنشيط عملاء لم تكن لتلمسهم. صفقة مُعاد تنشيطها واحدة تدفع لأشهر.',
    payback: 'صفقة واحدة مُعاد تنشيطها',
    pull: '1,799$ شهرياً لتتوقف عن التفاعل وتبدأ السيطرة.',
    nextStep: null,
    cta: 'احجز مكالمة النمو',
  },
];

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem('bznsflow_lang');
    return SUPPORTED_LANGS.includes(stored) ? stored : 'en';
  });
  const [isMenuOpen,    setIsMenuOpen]    = useState(false);
  const [isScrolled,    setIsScrolled]    = useState(false);
  const [activeLink,    setActiveLink]    = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Lead-capture modal
  const [isLeadOpen,  setIsLeadOpen]  = useState(false);
  const [leadEmail,   setLeadEmail]   = useState('');
  const [leadStatus,  setLeadStatus]  = useState('idle');
  const exitIntentFired = useRef(false);

  // Flips once below-the-fold chunks have been prefetched so the fade-in observer
  // re-attaches to the freshly-mounted lazy sections.
  const [sectionsReady, setSectionsReady] = useState(false);

  // Bump to force a re-render when a lazily-loaded language finishes loading.
  const [, setLangTick] = useState(0);

  // Use the requested language only if its strings are loaded; otherwise render
  // English until the chunk resolves (avoids a flash of missing keys).
  const activeLang    = isLoaded(lang) ? lang : 'en';
  const t             = getStrings(activeLang);
  const activeServices = activeLang === 'ar' ? SERVICES_AR : SERVICES;
  const activeTiers    = activeLang === 'ar' ? TIERS_AR : TIERS;

  // ── Effects ────────────────────────────────────────────────────────────────

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

  // Prefetch below-the-fold chunks during browser idle time, then signal the
  // fade-in observer to re-scan once they've mounted. Keeps scrolling seamless.
  useEffect(() => {
    const prefetch = () => {
      Promise.all([
        import('./components/BenefitsSection'),
        import('./components/ROISection'),
        import('./components/ServicesSection'),
        import('./components/ComparisonSection'),
        import('./components/TiersSection'),
        import('./components/HowItWorksSection'),
        import('./components/UseCasesSection'),
        import('./components/TestimonialsSection'),
        import('./components/AboutSection'),
        import('./components/CTASection'),
        import('./components/FAQSection'),
        import('./components/Footer'),
      ]).then(() => setSectionsReady(true));
    };
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const id = ric(prefetch);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  // Fade-in observer. Re-runs on language switch and once lazy sections mount.
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
  }, [lang, sectionsReady]);

  // If a returning visitor's saved language is lazy-loaded, fetch it on mount.
  useEffect(() => {
    if (!isLoaded(lang)) {
      loadLang(lang).then(() => setLangTick(n => n + 1));
    }
  }, []);

  // HTML lang + dir
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => { if (e.key === 'Escape') setIsLeadOpen(false); };
    document.addEventListener('keydown', handleKey);
    document.getElementById('lead-email')?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isLeadOpen]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const setLanguage = (code) => {
    setLang(code);
    localStorage.setItem('bznsflow_lang', code);
    if (!isLoaded(code)) {
      loadLang(code).then(() => setLangTick(n => n + 1));
    }
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
        <Suspense fallback={null}>
          <BenefitsSection t={t} />
          <ROISection t={t} CALENDAR_URL={CALENDAR_URL} trackEvent={trackEvent} />
          <ServicesSection t={t} activeServices={activeServices} CALENDAR_URL={CALENDAR_URL} />
          <ComparisonSection t={t} CALENDAR_URL={CALENDAR_URL} />
          <TiersSection t={t} tiers={activeTiers} CALENDAR_URL={CALENDAR_URL} />
          <HowItWorksSection t={t} CALENDAR_URL={CALENDAR_URL} />
          <UseCasesSection t={t} lang={lang} />
          <TestimonialsSection t={t} lang={lang} />
          <AboutSection t={t} lang={lang} CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL} />
          <FAQSection t={t} />
          <CTASection t={t} CALENDAR_URL={CALENDAR_URL} />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer
          t={t} lang={lang}
          CALENDAR_URL={CALENDAR_URL} WHATSAPP_URL={WHATSAPP_URL}
          onSmoothScroll={handleSmoothScroll}
        />
      </Suspense>

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
