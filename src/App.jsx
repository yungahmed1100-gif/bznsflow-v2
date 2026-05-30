import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { getStrings, isLoaded, loadLang, ALL_LANGS, EAGER_LANGS } from './i18n';
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

// Lead-capture endpoint. Set to a Formspree / Make.com / Resend webhook to activate.
// When null: form shows success state without posting (safe dev default).
const LEAD_ENDPOINT = null;

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
  { icon: '🌐', name: 'Conversion-Optimized Website',         tag: 'Your website isn\'t a brochure — it\'s your best salesperson. We engineer it to sell.',                                    bullets: ['Built to convert visitors into booked leads, not just impress', 'Fast-loading, mobile-first, ranked for GCC & European searches', 'Captures inquiries 24/7 so no visitor leaves without a follow-up'],                           category: 'foundation' },
  { icon: '🤖', name: 'AI Smart Receptionist',                tag: '68% of businesses lose leads by not responding within 5 minutes. This eliminates that permanently.',                         bullets: ['Replies to every inquiry in under 30 seconds — at 2am, on weekends', 'Qualifies prospects automatically so you only speak to buyers', 'Works across WhatsApp, web chat, and email without lifting a finger'],                    category: 'foundation' },
  { icon: '💬', name: 'WhatsApp Business Automation System',  tag: 'WhatsApp is where your customers decide. We engineer it to close deals, not just chat.',                                     bullets: ['Intelligent auto-replies that understand context and buying intent', 'Segments leads by interest and routes them through your sales flow', 'Turns conversations into booked appointments and paid orders'],                          category: 'foundation' },
  { icon: '📊', name: 'Custom Business CRM',                  tag: 'Deals don\'t die in meetings. They die in missed follow-ups and forgotten chats.',                                           bullets: ['Every lead tracked, every deal stage visible — nothing slips through', 'Automated follow-up sequences that nurture leads until they buy', 'Real-time pipeline view so you know exactly where revenue is stalling'],                  category: 'foundation' },
  { icon: '📅', name: 'Online Booking & Appointment System',  tag: 'Every no-show is stolen revenue. Every manual booking is wasted staff time. Both end here.',                                  bullets: ['Clients self-book 24/7 — no calls, no waiting, no back-and-forth', 'Smart reminders that eliminate no-shows before they happen', 'Auto-synced to your calendar — zero double-bookings, zero admin'],                         category: 'foundation' },
  { icon: '⭐', name: 'Customer Loyalty & Retention System',  tag: 'Acquiring a new customer costs 5x more than keeping one. Stop losing clients you already won.',                              bullets: ['Automated loyalty rewards that make clients choose you every time', 'Tracks purchase behaviour and triggers perfectly-timed retention offers', 'Turns one-time buyers into lifetime revenue streams'],                                   category: 'foundation' },
  { icon: '📍', name: 'Google Business & Local SEO System',   tag: 'If your business doesn\'t show up when they search, you don\'t exist. We fix that.',                                         bullets: ['Optimized Google Business Profile that dominates local search results', 'Strategic SEO engineered for GCC and European market intent', 'More qualified inbound — without paying for ads'],                                       category: 'foundation' },
  { icon: '🏆', name: 'Online Reputation Management',         tag: '92% of buyers read reviews before deciding. What decision are yours driving right now?',                                     bullets: ['Automated system that generates reviews from every satisfied client', 'Real-time monitoring so you catch problems before they damage trust', 'Positions your brand as the obvious, trusted choice in your market'],                    category: 'foundation' },
  { icon: '🎯', name: 'AI Lead Qualification Chatbot',        tag: 'Stop burning hours on prospects who will never buy. Let AI filter them out instantly.',                                       bullets: ['Qualifies every lead by budget, intent, and readiness — automatically', 'Delivers only sales-ready prospects to your team, nothing else', 'Active around the clock across your website, WhatsApp, and social'],                     category: 'foundation' },
  { icon: '📡', name: 'Business Intelligence Dashboard',      tag: 'You can\'t dominate a market you don\'t understand. We give you the intelligence to move first.',                            bullets: ['Real-time view of leads, revenue, conversion rates, and bottlenecks', 'Custom KPI dashboards built for your exact business model', 'Spot growth opportunities and threats before your competitors do'],                       category: 'foundation' },
  { icon: '🛒', name: 'E-commerce Store',                     tag: 'Your products deserve a storefront that sells — not one that just sits there looking good.',                                  bullets: ['Built to convert browsers into buyers from the very first visit', 'Integrated with payments, inventory management, and your CRM', 'Optimized for GCC and European buyer behaviour from day one'],                               category: 'growth' },
  { icon: '📲', name: 'Social Media Management System',       tag: 'Posting without a strategy is noise. We engineer your social presence into a lead machine.',                                  bullets: ['AI-powered content strategy and scheduling that builds real authority', 'Engagement automation that grows your audience without burning your team', 'Turns followers into qualified leads flowing directly into your pipeline'],            category: 'growth' },
  { icon: '✉️', name: 'Email & SMS Marketing Automation',     tag: 'Your customer list is generating zero revenue right now. That\'s your most valuable asset doing nothing.',                   bullets: ['Automated sequences generate 320% more revenue than one-off campaigns', 'Recover 15–20% of lost sales with abandoned cart and win-back flows', 'Highest ROI of any digital channel — $10–36 returned per $1 spent'],                 category: 'growth' },
  { icon: '🎯', name: 'Paid Ads Management — Google + Meta + TikTok', tag: 'Most businesses waste 60–70% of their ad budget on poor targeting. Every dirham should be tracked to revenue.', bullets: ['Campaigns built around cost per lead and ROAS — never vanity metrics', 'A/B testing always live, weekly optimization, zero budget wasted', 'Professionally managed campaigns average 200–800% ROAS'],                            category: 'growth' },
  { icon: '👥', name: 'HR & Payroll Automation System',       tag: 'Every WPS deadline you miss is a fine. Every manual payroll is an error waiting to happen. Both end here.',                 bullets: ['UAE WPS-compliant payroll that runs itself — no spreadsheets, no errors', 'Visa expiry alerts, leave tracking, and gratuity calculations — fully automated', 'HR admin time cut by 40% and your data is audit-ready at all times'],        category: 'growth' },
  { icon: '🎬', name: 'Short-Form Video Content System',      tag: 'Video drives 82% of all internet traffic. If your brand isn\'t in the feed, your competitor is.',                           bullets: ['4–12 professionally produced Reels per month — filmed, edited, published', 'Consistent video presence drives 3× more inbound inquiries on average', 'Arabic + English subtitles, trend-aware, optimized for Instagram, TikTok & YouTube'], category: 'scale' },
  { icon: '✍️', name: 'AI Content Creation & SEO System',    tag: 'Your customers search before they buy. If you\'re not on page one, you\'re invisible — and your competitor isn\'t.',        bullets: ['4–8 SEO articles per month — AI-drafted, human-edited, built to rank', 'Keyword strategy for Arabic + English GCC and European search intent', 'Compounds every month — month 6 generates 5–10× the traffic of month 1'],            category: 'scale' },
  { icon: '📦', name: 'Inventory & Operations Management System', tag: 'Stockouts cost you sales. Overstock costs you cash. Manual tracking costs you both.',                                  bullets: ['Real-time stock visibility across every location — no more surprise gaps', 'Automated reorder alerts, supplier PO generation, and waste tracking', 'Reduces overstock by 20% and stockouts by 30% from day one'],                       category: 'scale' },
  { icon: '🖥️', name: 'Digital Menu & Smart Display System', tag: 'Printed materials you can\'t update in real time are losing you money — every single day.',                                  bullets: ['Update menus, prices, and offers from your phone — live in seconds', 'Digital upsell prompts increase average order value by 20–30%', 'Bilingual Arabic/English, scheduled content rotations, QR ordering built in'],             category: 'scale' },
  { icon: '🎓', name: 'Staff Training & Knowledge Base Platform', tag: 'New staff cost AED 8,000–25,000 to train manually. Most quit before you recover that investment.',                     bullets: ['Onboard new hires in 2 days instead of 2 weeks — with zero manager time', 'Role-based training tracks, quizzes, and certifications — fully automated', 'Mobile-optimized, Arabic + English, with compliance modules built in'],           category: 'scale' },
];

const SERVICES_AR = [
  { icon: '🌐', name: 'موقع إلكتروني مُحسَّن للتحويل',         tag: 'موقعك ليس كتيّباً — بل أفضل موظف مبيعات لديك. نهندسه ليبيع.',              bullets: ['مبني لتحويل الزوار إلى عملاء محتملين حاجزين، لا لمجرد الإعجاب', 'سريع التحميل، مُحسَّن للجوال، ومُرتَّب في نتائج البحث في الخليج وأوروبا', 'يلتقط الاستفسارات 24/7 حتى لا يغادر أي زائر دون متابعة'],                                    category: 'foundation' },
  { icon: '🤖', name: 'موظف استقبال ذكي بالذكاء الاصطناعي',    tag: '68% من الشركات تخسر عملاءها لعدم الرد خلال 5 دقائق. هذا يُنهي تلك المشكلة للأبد.', bullets: ['يرد على كل استفسار في أقل من 30 ثانية — في الساعة 2 فجراً، في العطل، بلا استثناء', 'يؤهّل العملاء المحتملين تلقائياً حتى تتحدث فقط مع المستعدين للشراء', 'يعمل عبر واتساب والدردشة على الموقع والبريد الإلكتروني دون أن ترفع إصبعاً'], category: 'foundation' },
  { icon: '💬', name: 'نظام أتمتة واتساب للأعمال',              tag: 'واتساب هو المكان الذي يقرر فيه عملاؤك. نهندسه ليُغلق الصفقات، لا لمجرد الدردشة.',  bullets: ['ردود آلية ذكية تفهم السياق ونية الشراء', 'يصنّف العملاء المحتملين حسب الاهتمام ويوجّههم عبر مسار مبيعاتك', 'يحوّل المحادثات إلى مواعيد محجوزة وطلبات مدفوعة'],                                    category: 'foundation' },
  { icon: '📊', name: 'نظام CRM مخصص لأعمالك',                  tag: 'الصفقات لا تموت في الاجتماعات. تموت في المتابعات الفائتة والمحادثات المنسية.',        bullets: ['كل عميل محتمل مُتتَبَّع، كل مرحلة مرئية — لا شيء يفلت من بين الأصابع', 'تسلسلات متابعة آلية تُرعى العملاء المحتملين حتى يصبحوا جاهزين للشراء', 'عرض مباشر للمسار حتى تعرف بالضبط أين تتعطل الصفقات وتتسرب الإيرادات'], category: 'foundation' },
  { icon: '📅', name: 'نظام الحجز والمواعيد الإلكتروني',        tag: 'كل موعد غائب هو إيراد مسروق. كل حجز يدوي هو وقت موظف مهدر. كلاهما ينتهي هنا.',      bullets: ['العملاء يحجزون ذاتياً 24/7 — بلا مكالمات، بلا انتظار، بلا تبادل رسائل', 'تذكيرات ذكية تقضي على الغيابات قبل أن تحدث', 'مزامنة تلقائية مع تقويمك — لا ازدواجية في الحجوزات، لا إدارة يدوية'],                      category: 'foundation' },
  { icon: '⭐', name: 'نظام الولاء والاحتفاظ بالعملاء',          tag: 'اكتساب عميل جديد يكلّف 5 أضعاف الاحتفاظ بعميل موجود. أوقف خسارة من فزت بهم مسبقاً.',  bullets: ['مكافآت ولاء آلية تجعل العملاء يختارونك في كل مرة', 'يتتبع سلوك الشراء ويُطلق عروضاً في التوقيت المثالي للاحتفاظ بالعميل', 'يحوّل المشترين لمرة واحدة إلى مصادر إيراد مستمرة مدى الحياة'],              category: 'foundation' },
  { icon: '📍', name: 'نظام Google Business والسيو المحلي',       tag: 'إذا لم يظهر نشاطك في البحث، فأنت غير موجود. نُصلح ذلك.',                          bullets: ['ملف Google Business مُحسَّن يهيمن على نتائج البحث المحلي', 'سيو استراتيجي مُهندَس لنية البحث في الخليج وأوروبا', 'استفسارات وارده أكثر — دون الدفع للإعلانات'],                                               category: 'foundation' },
  { icon: '🏆', name: 'إدارة السمعة الإلكترونية',                tag: '92% من المشترين يقرؤون التقييمات قبل اتخاذ القرار. أي قرار تدفع تقييماتك الآن؟',      bullets: ['نظام آلي يولّد التقييمات من كل عميل راضٍ', 'مراقبة في الوقت الفعلي حتى تكتشف المشاكل قبل أن تُلحق ضرراً بالثقة', 'يضع علامتك التجارية باعتبارها الخيار الواضح والموثوق في سوقك'],             category: 'foundation' },
  { icon: '🎯', name: 'شات بوت تأهيل العملاء بالذكاء الاصطناعي', tag: 'توقف عن إضاعة ساعات مع عملاء لن يشتروا أبداً. دع الذكاء يفلترهم فوراً.',            bullets: ['يؤهّل كل عميل حسب الميزانية والنية والجاهزية — تلقائياً', 'يُسلّم فقط العملاء الجاهزين للشراء إلى فريقك، ولا شيء آخر', 'نشط على مدار الساعة عبر موقعك وواتساب ووسائل التواصل الاجتماعي'],            category: 'foundation' },
  { icon: '📡', name: 'لوحة ذكاء الأعمال',                       tag: 'لا يمكنك السيطرة على سوق لا تفهمه. نمنحك الذكاء لتتحرك أولاً.',                    bullets: ['عرض لحظي للعملاء والإيرادات ومعدلات التحويل والاختناقات', 'لوحات KPI مخصصة مبنية لنموذج عملك بالضبط', 'اكتشف فرص النمو والتهديدات قبل منافسيك'],                                                category: 'foundation' },
  { icon: '🛒', name: 'متجر إلكتروني',                           tag: 'منتجاتك تستحق واجهة تبيع — لا واجهة تجلس فيها مكتفية بالمظهر.',                    bullets: ['مبني لتحويل المتصفحين إلى مشترين من الزيارة الأولى', 'متكامل مع المدفوعات وإدارة المخزون ونظام CRM الخاص بك', 'مُحسَّن لسلوك المشتري في الخليج وأوروبا من اليوم الأول'],                              category: 'growth'    },
  { icon: '📲', name: 'نظام إدارة وسائل التواصل الاجتماعي',      tag: 'النشر دون استراتيجية ضوضاء. نهندس حضورك الاجتماعي ليكون آلة توليد عملاء.',          bullets: ['استراتيجية محتوى وجدولة مدعومة بالذكاء الاصطناعي تبني سلطة حقيقية', 'أتمتة التفاعل التي تُنمّي جمهورك دون إجهاد فريقك', 'تحوّل المتابعين إلى عملاء مؤهلين يتدفقون مباشرة إلى مسار مبيعاتك'],           category: 'growth'    },
  { icon: '✉️', name: 'أتمتة التسويق عبر البريد والرسائل',       tag: 'قائمة عملائك لا تولّد إيرادات الآن. إنها أثمن أصولك وتفعل لا شيء.',               bullets: ['التسلسلات الآلية تولّد 320% إيرادات أكثر من الحملات الفردية', 'استرجع 15–20% من المبيعات الضائعة بتدفقات السلة المهجورة وإعادة الاستهداف', 'أعلى عائد استثمار بين جميع القنوات الرقمية — 10–36 دولاراً لكل دولار'],   category: 'growth'    },
  { icon: '🎯', name: 'إدارة الإعلانات المدفوعة — Google + Meta + TikTok', tag: 'معظم الشركات تُهدر 60–70% من ميزانية الإعلانات على استهداف ضعيف. كل درهم يجب تتبّعه إلى إيراد.', bullets: ['حملات مبنية على تكلفة العميل وعائد الإنفاق الإعلاني — لا مقاييس الغرور أبداً', 'اختبار A/B دائماً نشط، تحسين أسبوعي، صفر هدر في الميزانية', 'الحملات المُدارة احترافياً تحقق في المتوسط 200–800% عائد إنفاق إعلاني'], category: 'growth' },
  { icon: '👥', name: 'نظام أتمتة الموارد البشرية والرواتب',     tag: 'كل موعد WPS تفوّته غرامة. كل رواتب يدوية خطأ ينتظر الحدوث. كلاهما ينتهي هنا.',     bullets: ['رواتب متوافقة مع WPS الإماراتي تعمل وحدها — لا جداول، لا أخطاء', 'تنبيهات انتهاء الإقامة وتتبع الإجازات وحسابات المكافأة — مؤتمتة بالكامل', 'تقليص وقت إدارة الموارد البشرية بنسبة 40% وبياناتك جاهزة للمراجعة دائماً'], category: 'growth' },
  { icon: '🎬', name: 'نظام محتوى الفيديو القصير',               tag: 'الفيديو يقود 82% من حركة الإنترنت. إذا لم تكن في الفيد، فمنافسك موجود.',           bullets: ['4–12 ريل احترافي شهرياً — مصوّر ومُنقَّح ومنشور', 'الحضور المرئي المنتظم يجذب 3× استفسارات واردة في المتوسط', 'ترجمة عربية وإنجليزية، مُحسَّن لإنستغرام وتيك توك ويوتيوب'],                                   category: 'scale'     },
  { icon: '✍️', name: 'نظام إنشاء المحتوى والسيو بالذكاء',       tag: 'عملاؤك يبحثون قبل الشراء. إذا لم تكن في الصفحة الأولى، فأنت غير مرئي — ومنافسك ليس كذلك.', bullets: ['4–8 مقالات سيو شهرياً — صُيغت بالذكاء، حُرّرت بشرياً، مبنية للترتيب', 'استراتيجية كلمات مفتاحية للبحث العربي والإنجليزي في الخليج وأوروبا', 'تتراكم كل شهر — الشهر السادس يولّد 5–10 أضعاف حركة الشهر الأول'],          category: 'scale'     },
  { icon: '📦', name: 'نظام إدارة المخزون والعمليات',            tag: 'نقص المخزون يكلّفك مبيعات. فائض المخزون يكلّفك سيولة. التتبع اليدوي يكلّفك الاثنين.', bullets: ['رؤية فورية للمخزون عبر كل موقع — لا مفاجآت بعد الآن', 'تنبيهات إعادة الطلب التلقائية وإنشاء أوامر الموردين وتتبع الهدر', 'تخفيض الفائض بنسبة 20% والنقص بنسبة 30% من اليوم الأول'],                       category: 'scale'     },
  { icon: '🖥️', name: 'نظام القائمة الرقمية والشاشات الذكية',   tag: 'المواد المطبوعة التي لا يمكنك تحديثها في الوقت الفعلي تُكلّفك مالاً — كل يوم.',     bullets: ['حدّث القوائم والأسعار والعروض من هاتفك — مباشرة في ثوانٍ', 'نداءات البيع الذكي الرقمية ترفع متوسط قيمة الطلب بنسبة 20–30%', 'ثنائي اللغة عربي/إنجليزي، تدوير محتوى مجدوَل، طلب QR مدمج'],                  category: 'scale'     },
  { icon: '🎓', name: 'منصة تدريب الموظفين وقاعدة المعرفة',      tag: 'الموظفون الجدد يكلّفون 8000–25000 درهم للتدريب اليدوي. معظمهم يستقيلون قبل أن تسترد استثمارك.', bullets: ['أهّل موظفين جدد في يومين بدلاً من أسبوعين — بدون وقت مدير', 'مسارات تدريب حسب الدور، اختبارات، وشهادات — مؤتمتة بالكامل', 'مُحسَّن للجوال، عربي وإنجليزي، مع وحدات الامتثال القانوني مدمجة'],          category: 'scale'     },
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
      if (LEAD_ENDPOINT) {
        const res = await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, source: 'exit-intent', lang }),
        });
        if (!res.ok) throw new Error(`Lead endpoint ${res.status}`);
      }
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
          <TiersSection t={t} CALENDAR_URL={CALENDAR_URL} />
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
