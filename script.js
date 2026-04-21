/**
 * BznsFlow — script.js
 * Smooth Scroll · Mobile Menu · Scroll Animations · Navbar Behavior · Bilingual i18n
 * Vanilla JS — No frameworks, no dependencies.
 */

'use strict';

/* ============================================================
   DOM REFERENCES
============================================================ */
const navbar       = document.getElementById('navbar');
const hamburger    = document.getElementById('hamburger');
const navLinks     = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link');
const fadeEls      = document.querySelectorAll('.fade-in');
const langToggle   = document.getElementById('langToggle');
const langLabel    = document.getElementById('langLabel');

/* ============================================================
   BILINGUAL TRANSLATION DICTIONARY
   All text content for English (en) and Arabic (ar).
   Arabic copy is professionally written — not machine translated.
============================================================ */
const translations = {

  en: {
    // Navbar
    nav_tagline:      'for AI solutions',
    nav_problem:      'Problem',
    nav_benefits:     'Benefits',
    nav_how:          'How It Works',
    nav_cases:        'Use Cases',
    nav_about:        'About',
    nav_cta:          'Book a Call',

    // Hero
    hero_badge:       'AI-Powered Business Automation',
    hero_headline:    `You're Not Losing Leads<br />to Your <span class="gradient-text">Competitors</span>.<br />You're Losing Them to<br /><span class="gradient-text">Your Own Operations.</span>`,
    hero_sub:         `Every slow reply, every missed follow-up, every unqualified lead that slips through — that's not a marketing problem. That's an operational failure. BznsFlow deploys intelligent AI systems that engage, qualify, and route leads the moment they appear — before your team even opens their inbox.`,
    hero_cta_primary: 'Book a Free Strategy Call',
    hero_cta_secondary: 'See How It Works',
    stat_1:           'Faster Lead Response',
    stat_2:           'Automated Engagement',
    stat_3:           'Reduction in Missed Leads',

    // Problem section
    problem_label:    'The Real Problem',
    problem_title:    `Your Marketing Isn't Broken.<br /><span class="gradient-text">Your Operations Are.</span>`,
    pain_title:       'The Pain You Know',
    pain_1:           `A lead fills out your form at 11 PM. No one responds until morning. They've already booked with a competitor.`,
    pain_2:           `Your sales team spends 60% of their time qualifying leads that were never going to convert.`,
    pain_3:           `High-value inbound requests get buried in a shared inbox, never assigned, never followed up.`,
    pain_4:           `You're paying for ads that generate leads your ops can't handle fast enough to close.`,
    fix_title:        'The BznsFlow Fix',
    fix_1:            'Instant AI engagement the moment a lead lands — day or night, weekday or holiday.',
    fix_2:            'Intelligent qualification flows that filter serious buyers before a human ever gets involved.',
    fix_3:            'Smart routing assigns leads to the right team member based on budget, intent, and geography.',
    fix_4:            'Your ad spend finally works as hard as your marketing team intended it to.',

    // Benefits section
    benefits_label:   'Core Capabilities',
    benefits_title:   `Everything Your Pipeline Needs<br /><span class="gradient-text">to Stop Leaking Revenue</span>`,
    benefits_sub:     `BznsFlow doesn't just add automation — it builds the operational backbone your business was missing.`,
    b1_title:         'Instant Engagement',
    b1_desc:          'Respond to every lead in under 60 seconds — automatically. AI-crafted messages that feel personal, not robotic, delivered via WhatsApp, email, or web chat the instant a prospect shows intent.',
    b2_title:         'Auto-Qualification',
    b2_desc:          'Let AI handle the discovery process. Smart conversation flows identify budget, timeline, and intent — so your sales team only speaks to leads that are genuinely ready to move forward.',
    b3_title:         'Smart Routing',
    b3_desc:          'The right lead reaches the right closer at the right moment. BznsFlow routes based on service type, deal size, location, or any custom rule your team defines — zero manual triage required.',
    b4_title:         'Automated Follow-Ups',
    b4_desc:          `Deals don't die at first contact — they die at the fifth touchpoint that never happened. BznsFlow automates intelligent, timely follow-up sequences that nurture leads through every stage of the funnel.`,
    b5_title:         'Pipeline Visibility',
    b5_desc:          'Know exactly where every lead is at any moment. Real-time dashboards surface bottlenecks before they become lost deals — giving you the clarity to manage by data, not gut feeling.',
    b6_title:         'Always-On Reliability',
    b6_desc:          `Your business doesn't sleep, and neither does BznsFlow. 24/7 automated systems handle peak traffic, off-hours inquiries, and weekend leads — with zero dependency on human availability.`,

    // How It Works section
    how_label:        'The Process',
    how_title:        `From Discovery to Deployment<br /><span class="gradient-text">in 4 Clean Steps</span>`,
    how_sub:          `No lengthy onboarding. No technical complexity on your side. BznsFlow handles the build — you handle the results.`,
    step1_title:      'Strategy & Audit',
    step1_desc:       'We begin with a deep-dive into your current lead flow, team structure, and conversion bottlenecks. We identify exactly where leads are slipping through the cracks and what systems need to be built.',
    step2_title:      'System Design',
    step2_desc:       'We architect your custom automation stack — conversation flows, qualification logic, routing rules, and integration touchpoints — all mapped to your specific business model and sales process.',
    step3_title:      'Build & Integrate',
    step3_desc:       'BznsFlow builds and deploys the entire system — AI agents, automation flows, CRM integrations, WhatsApp connections — fully integrated with your existing tools. Zero disruption to your team.',
    step4_title:      'Launch & Optimize',
    step4_desc:       'Go live with full monitoring. We track performance, refine conversation scripts, optimize routing logic, and ensure your system improves continuously — not just on day one.',
    how_cta:          'Start With a Free Strategy Call',

    // Use Cases section
    cases_label:      `Who It's For`,
    cases_title:      `Built for Businesses Where<br /><span class="gradient-text">Speed to Lead Means Revenue</span>`,
    cases_sub:        `If your business generates inbound interest and your team struggles to respond fast enough — BznsFlow was built for you.`,
    uc1_title:        'Digital Agencies',
    uc1_desc:         'Handle high inbound volume from ad campaigns without expanding your team. Qualify discovery calls automatically and route serious clients directly to your account managers.',
    uc1_tag:          'Qualify → Book → Close',
    uc2_title:        'Sales Teams',
    uc2_desc:         `Let AI do the heavy lifting on outbound sequences and inbound qualification so your closers spend 100% of their time on deals — not on sorting through unqualified leads.`,
    uc2_tag:          'More Closes, Less Admin',
    uc3_title:        'Real Estate',
    uc3_desc:         'Capture and respond to property inquiries 24/7. Automatically segment buyers by budget and location, book site visits, and follow up with listings matched to their criteria.',
    uc3_tag:          'Never Miss a Buyer',
    uc4_title:        'SaaS & Tech Companies',
    uc4_desc:         'Automate your entire demo booking pipeline. AI qualifies company size, use case, and budget before connecting prospects with the right sales engineer — no SDR required.',
    uc4_tag:          'Demo → Qualified → Closed',
    uc5_title:        'Healthcare & Clinics',
    uc5_desc:         'Automate appointment booking, follow-up reminders, and patient triage. Reduce no-shows, streamline front-desk operations, and ensure every inquiry receives an immediate response.',
    uc5_tag:          'Seamless Patient Flow',
    uc6_title:        'E-Commerce & DTC Brands',
    uc6_desc:         'Recover abandoned carts, automate post-purchase upsells, and handle customer service queries through intelligent AI agents — at a fraction of the cost of a support team.',
    uc6_tag:          'Automate the Revenue Cycle',

    // About section
    about_label:          'The Founder',
    about_title:          `Ahmed Darwish —<br /><span class="gradient-text">Building Systems That Scale</span>`,
    about_location:       'Cairo, Egypt',
    about_role:           'AI Automation Specialist',
    about_founder_role:   'BznsFlow Founder',
    about_p1:             `BznsFlow was born from a single, frustrating observation: businesses across the Middle East and beyond were spending thousands on marketing — and losing those leads before a human could ever respond. The problem wasn't effort or budget. It was operational infrastructure.`,
    about_p2:             `Ahmed Darwish founded BznsFlow with one mandate: build the AI-powered operational layer that turns marketing spend into predictable, scalable revenue. Based in Cairo and working with clients regionally and globally, BznsFlow has become the trusted automation partner for agencies, sales teams, and growth-oriented businesses who understand that speed-to-lead is a competitive advantage — not a nice-to-have.`,
    about_p3:             `Every system BznsFlow builds is bespoke — designed around your specific pipeline, your team's capacity, and your market's expectations. No off-the-shelf solutions. No template-and-forget setups. Just intelligent automation engineered to perform from day one and improve over time.`,
    about_cta1:           'Book a Call with Ahmed',
    about_cta2:           'WhatsApp',

    // CTA section
    cta_label:        'Ready When You Are',
    cta_title:        `Stop Leaving Revenue<br /><span class="gradient-text">on the Table</span>`,
    cta_sub:          `One 30-minute strategy call is all it takes to identify the operational gaps costing you leads right now. No pitch decks. No pressure. Just clarity on what's broken and how to fix it.`,
    cta_btn:          'Book Your Free Strategy Call',
    cta_note:         'Free consultation · No commitment · Results-first approach',

    // Footer
    footer_desc:             'AI-powered operational systems that engage, qualify, and route leads so your business stops losing revenue to slow operations.',
    footer_nav_heading:      'Navigation',
    footer_nav_1:            'The Problem',
    footer_nav_2:            'Benefits',
    footer_nav_3:            'How It Works',
    footer_nav_4:            'Use Cases',
    footer_nav_5:            'About',
    footer_services_heading: 'Services',
    footer_svc_1:            'AI Lead Engagement',
    footer_svc_2:            'Auto-Qualification',
    footer_svc_3:            'Smart Routing',
    footer_svc_4:            'Pipeline Automation',
    footer_svc_5:            'CRM Integration',
    footer_contact_heading:  'Contact',
    footer_book:             'Book a Strategy Call',
    footer_copy:             '© 2025 BznsFlow. All rights reserved. Built for scale. Engineered for results.',
    footer_founder:          'Founded by Ahmed Darwish · Cairo, Egypt',

    // Floating WhatsApp
    wa_tooltip: 'Chat on WhatsApp',
  },

  ar: {
    // Navbar
    nav_tagline:      'لحلول الذكاء الاصطناعي',
    nav_problem:      'المشكلة',
    nav_benefits:     'المزايا',
    nav_how:          'كيف يعمل',
    nav_cases:        'حالات الاستخدام',
    nav_about:        'من نحن',
    nav_cta:          'احجز مكالمة',

    // Hero
    hero_badge:       'أتمتة الأعمال بالذكاء الاصطناعي',
    hero_headline:    `لا تخسر عملاءك المحتملين<br />بسبب <span class="gradient-text">منافسيك</span>.<br />أنت تخسرهم بسبب<br /><span class="gradient-text">طريقة عمل شركتك.</span>`,
    hero_sub:         `كل رد متأخر، كل متابعة فائتة، كل عميل محتمل يفلت دون تأهيل — هذه ليست مشكلة تسويق، بل إخفاق تشغيلي. تنشر BznsFlow أنظمة ذكاء اصطناعي متطورة تتفاعل مع العملاء وتؤهلهم وتوجههم في اللحظة التي يظهرون فيها — قبل أن يفتح فريقك بريده الإلكتروني.`,
    hero_cta_primary: 'احجز مكالمة استراتيجية مجانية',
    hero_cta_secondary: 'اكتشف كيف يعمل',
    stat_1:           'سرعة أكبر في الاستجابة',
    stat_2:           'تفاعل آلي على مدار الساعة',
    stat_3:           'تقليل في الفرص الضائعة',

    // Problem section
    problem_label:    'المشكلة الحقيقية',
    problem_title:    `تسويقك ليس المشكلة.<br /><span class="gradient-text">عملياتك هي المشكلة.</span>`,
    pain_title:       'الألم الذي تعرفه',
    pain_1:           `يملأ عميل محتمل نموذجك في الساعة الحادية عشرة مساءً. لا أحد يرد حتى الصباح. وبحلول ذلك الوقت، يكون قد حجز مع منافسك.`,
    pain_2:           `يقضي فريق المبيعات 60% من وقته في تأهيل عملاء لم يكونوا جادين أصلاً في الشراء.`,
    pain_3:           `الطلبات الواردة عالية القيمة تختفي داخل صندوق وارد مشترك — لا تُسنَد، ولا يُتابَع عليها.`,
    pain_4:           `تدفع مقابل إعلانات تولّد عملاء محتملين لا تستطيع عملياتك إغلاقهم بالسرعة الكافية.`,
    fix_title:        'الحل الذي تقدمه BznsFlow',
    fix_1:            'تفاعل فوري بالذكاء الاصطناعي في اللحظة التي يصل فيها العميل — ليلاً أو نهاراً، أيام العمل أو الإجازات.',
    fix_2:            'تدفقات تأهيل ذكية تفرز المشترين الجادين قبل أن يتدخل أي إنسان في العملية.',
    fix_3:            'توجيه ذكي يحيل كل عميل إلى الشخص المناسب بناءً على الميزانية والنية والموقع الجغرافي.',
    fix_4:            'إنفاقك الإعلاني يعمل أخيراً بكامل طاقته كما أراد له فريق التسويق.',

    // Benefits section
    benefits_label:   'القدرات الأساسية',
    benefits_title:   `كل ما يحتاجه مسار مبيعاتك<br /><span class="gradient-text">لوقف نزيف الإيرادات</span>`,
    benefits_sub:     `لا تضيف BznsFlow أتمتة فحسب — بل تبني العمود الفقري التشغيلي الذي كان عملك يفتقده.`,
    b1_title:         'تفاعل فوري',
    b1_desc:          'استجب لكل عميل محتمل في أقل من 60 ثانية — تلقائياً. رسائل مصاغة بالذكاء الاصطناعي تبدو شخصية لا آلية، تُرسَل عبر واتساب أو البريد الإلكتروني أو الدردشة الفورية في اللحظة التي يُبدي فيها العميل اهتمامه.',
    b2_title:         'تأهيل آلي',
    b2_desc:          'دع الذكاء الاصطناعي يتولى عملية الاستكشاف. تدفقات محادثة ذكية تحدد الميزانية والجدول الزمني والنية — حتى يتحدث فريق المبيعات فقط مع العملاء المستعدين فعلاً للمضي قدماً.',
    b3_title:         'توجيه ذكي',
    b3_desc:          'العميل المناسب يصل إلى المغلق المناسب في اللحظة المناسبة. تُوجّه BznsFlow بناءً على نوع الخدمة وحجم الصفقة والموقع أو أي قاعدة مخصصة يضعها فريقك — دون أي فرز يدوي.',
    b4_title:         'متابعات آلية',
    b4_desc:          `الصفقات لا تموت عند أول تواصل — بل تموت عند نقطة التواصل الخامسة التي لم تحدث أبداً. تؤتمت BznsFlow تسلسلات متابعة ذكية وفي الوقت المناسب لرعاية العملاء في كل مرحلة من مراحل القمع.`,
    b5_title:         'رؤية كاملة للمسار',
    b5_desc:          'اعرف أين يقف كل عميل محتمل في أي لحظة. تكشف لوحات المعلومات الآنية عن نقاط الاختناق قبل أن تتحول إلى صفقات ضائعة — مما يمنحك وضوحاً لإدارة الأعمال بالبيانات لا بالحدس.',
    b6_title:         'موثوقية لا تتوقف',
    b6_desc:          `عملك لا ينام، وكذلك BznsFlow. الأنظمة الآلية تعمل 24/7 وتتعامل مع ذروة الطلب والاستفسارات خارج أوقات العمل وعملاء نهاية الأسبوع — دون أي اعتماد على توفر البشر.`,

    // How It Works section
    how_label:        'العملية',
    how_title:        `من الاكتشاف إلى التشغيل<br /><span class="gradient-text">في 4 خطوات واضحة</span>`,
    how_sub:          `لا إعداد مطوّل. لا تعقيد تقني من جانبك. BznsFlow تتولى البناء — وأنت تحصد النتائج.`,
    step1_title:      'الاستراتيجية والتدقيق',
    step1_desc:       'نبدأ بتحليل معمّق لتدفق العملاء الحاليين وهيكل الفريق ونقاط الاختناق في التحويل. نحدد بالضبط أين يفلت العملاء المحتملون وما الأنظمة التي يجب بناؤها.',
    step2_title:      'تصميم النظام',
    step2_desc:       'نهندس مجموعة الأتمتة المخصصة لك — تدفقات المحادثة ومنطق التأهيل وقواعد التوجيه ونقاط التكامل — كل ذلك مُعيَّن على نموذج عملك وعملية مبيعاتك بالتحديد.',
    step3_title:      'البناء والتكامل',
    step3_desc:       'تبني BznsFlow وتنشر النظام بالكامل — وكلاء الذكاء الاصطناعي وتدفقات الأتمتة وتكاملات CRM وربط واتساب — متكاملاً تماماً مع أدواتك الموجودة. صفر إخلال بفريقك.',
    step4_title:      'الإطلاق والتحسين',
    step4_desc:       'انطلق مع المراقبة الكاملة. نتتبع الأداء، ونصقل نصوص المحادثات، ونحسّن منطق التوجيه، ونضمن أن نظامك يتحسن باستمرار — ليس في اليوم الأول فحسب.',
    how_cta:          'ابدأ بمكالمة استراتيجية مجانية',

    // Use Cases section
    cases_label:      'لمن صُمّم هذا؟',
    cases_title:      `مبني للأعمال التي يعني فيها<br /><span class="gradient-text">سرعة الاستجابة مزيداً من الإيرادات</span>`,
    cases_sub:        `إذا كان عملك يولّد اهتماماً وارداً ويكافح فريقك للاستجابة بسرعة كافية — فـBznsFlow بُنيت من أجلك.`,
    uc1_title:        'الوكالات الرقمية',
    uc1_desc:         'تعامل مع الحجم الوارد الكبير من الحملات الإعلانية دون توسيع فريقك. أهّل مكالمات الاستكشاف تلقائياً ووجّه العملاء الجادين مباشرة إلى مديري حساباتك.',
    uc1_tag:          'تأهيل ← حجز ← إغلاق',
    uc2_title:        'فرق المبيعات',
    uc2_desc:         `دع الذكاء الاصطناعي يتولى العبء الثقيل في التسلسلات الصادرة والتأهيل الوارد حتى يقضي مغلقوك 100% من وقتهم على الصفقات — لا على فرز العملاء غير المؤهلين.`,
    uc2_tag:          'إغلاق أكثر، إدارة أقل',
    uc3_title:        'العقارات',
    uc3_desc:         'التقط الردود على الاستفسارات العقارية على مدار الساعة. صنّف المشترين تلقائياً بحسب الميزانية والموقع، احجز الزيارات الميدانية، وتابع بعروض مطابقة لمعاييرهم.',
    uc3_tag:          'لا تفوّت أي مشترٍ',
    uc4_title:        'شركات SaaS والتقنية',
    uc4_desc:         'أتمت مسار حجز العروض التوضيحية بالكامل. يؤهّل الذكاء الاصطناعي حجم الشركة وحالة الاستخدام والميزانية قبل ربط العملاء المحتملين بالمهندس المناسب — دون الحاجة لممثل مبيعات.',
    uc4_tag:          'عرض ← تأهيل ← إغلاق',
    uc5_title:        'الرعاية الصحية والعيادات',
    uc5_desc:         'أتمت حجز المواعيد وتذكيرات المتابعة وفرز المرضى. قلل حالات الغياب، بسّط عمليات الاستقبال، واضمن الرد الفوري على كل استفسار.',
    uc5_tag:          'تدفق سلس لرعاية المرضى',
    uc6_title:        'التجارة الإلكترونية وعلامات DTC',
    uc6_desc:         'استرجع عربات التسوق المتروكة، أتمت عمليات البيع الإضافي بعد الشراء، وتعامل مع استفسارات خدمة العملاء عبر وكلاء ذكاء اصطناعي — بجزء بسيط من تكلفة فريق دعم تقليدي.',
    uc6_tag:          'أتمت دورة الإيرادات',

    // About section
    about_label:          'المؤسس',
    about_title:          `أحمد درويش —<br /><span class="gradient-text">يبني أنظمة قابلة للتوسع</span>`,
    about_location:       'القاهرة، مصر',
    about_role:           'متخصص أتمتة بالذكاء الاصطناعي',
    about_founder_role:   'مؤسس BznsFlow',
    about_p1:             `وُلدت BznsFlow من ملاحظة واحدة محبطة: كانت الشركات في الشرق الأوسط وما وراءه تنفق الآلاف على التسويق — وتخسر هؤلاء العملاء قبل أن يتمكن أي إنسان من الرد عليهم. لم تكن المشكلة في الجهد أو الميزانية. كانت في البنية التحتية التشغيلية.`,
    about_p2:             `أسّس أحمد درويش BznsFlow بتفويض واحد: بناء الطبقة التشغيلية المدعومة بالذكاء الاصطناعي التي تحوّل الإنفاق التسويقي إلى إيرادات متوقعة وقابلة للتوسع. من القاهرة وبالعمل مع عملاء إقليميين وعالميين، أصبحت BznsFlow الشريك الموثوق في الأتمتة للوكالات وفرق المبيعات والشركات الساعية إلى النمو، والتي تدرك أن سرعة الاستجابة للعملاء ميزة تنافسية — لا مجرد رفاهية.`,
    about_p3:             `كل نظام تبنيه BznsFlow مخصص — مصمم حول مسار مبيعاتك المحدد وطاقة فريقك وتوقعات سوقك. لا حلول جاهزة. لا إعدادات يتم نسيانها. فقط أتمتة ذكية مهندَسة للأداء من اليوم الأول والتحسن بمرور الوقت.`,
    about_cta1:           'احجز مكالمة مع أحمد',
    about_cta2:           'واتساب',

    // CTA section
    cta_label:        'جاهزون عندما تكون مستعداً',
    cta_title:        `أوقف نزيف الإيرادات<br /><span class="gradient-text">من جدول أعمالك</span>`,
    cta_sub:          `مكالمة استراتيجية واحدة مدتها 30 دقيقة تكفي لتحديد الثغرات التشغيلية التي تكلفك عملاء الآن. لا شرائح عروض تقديمية. لا ضغط. فقط وضوح حول ما هو مكسور وكيفية إصلاحه.`,
    cta_btn:          'احجز مكالمتك الاستراتيجية المجانية',
    cta_note:         'استشارة مجانية · بدون التزام · نهج يُقدّم النتائج أولاً',

    // Footer
    footer_desc:             'أنظمة تشغيلية مدعومة بالذكاء الاصطناعي تتفاعل مع العملاء المحتملين وتؤهلهم وتوجههم حتى يتوقف عملك عن خسارة الإيرادات بسبب بطء العمليات.',
    footer_nav_heading:      'التنقل',
    footer_nav_1:            'المشكلة',
    footer_nav_2:            'المزايا',
    footer_nav_3:            'كيف يعمل',
    footer_nav_4:            'حالات الاستخدام',
    footer_nav_5:            'من نحن',
    footer_services_heading: 'الخدمات',
    footer_svc_1:            'تفاعل آلي مع العملاء',
    footer_svc_2:            'التأهيل التلقائي',
    footer_svc_3:            'التوجيه الذكي',
    footer_svc_4:            'أتمتة المسار التجاري',
    footer_svc_5:            'تكامل CRM',
    footer_contact_heading:  'تواصل معنا',
    footer_book:             'احجز مكالمة استراتيجية',
    footer_copy:             '© 2025 BznsFlow. جميع الحقوق محفوظة. مبني للتوسع. مهندَس للنتائج.',
    footer_founder:          'تأسست بواسطة أحمد درويش · القاهرة، مصر',

    // Floating WhatsApp
    wa_tooltip: 'تحدث عبر واتساب',
  }
};

/* ============================================================
   i18n ENGINE — Apply translations to the page
   Finds every element with data-i18n and injects the correct text.
   Uses innerHTML so that embedded <span class="gradient-text"> tags
   inside headlines are preserved correctly.
============================================================ */
let currentLang = localStorage.getItem('bznsflow_lang') || 'en';

function applyTranslations(lang) {
  const dict = translations[lang];
  if (!dict) return;

  // Update every labeled element
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) {
      // Use innerHTML so gradient-text spans inside headlines render correctly
      el.innerHTML = dict[key];
    }
  });

  // Update the HTML direction and language attribute
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  // Update the toggle button label to show the OTHER language
  langLabel.textContent = lang === 'ar' ? 'English' : 'عربي';

  // Persist the user's choice
  localStorage.setItem('bznsflow_lang', lang);
  currentLang = lang;
}

/* ============================================================
   LANGUAGE TOGGLE — Click handler
============================================================ */
langToggle.addEventListener('click', () => {
  const newLang = currentLang === 'en' ? 'ar' : 'en';
  applyTranslations(newLang);
});

// Apply saved language on page load
applyTranslations(currentLang);

/* ============================================================
   NAVBAR — Scroll-triggered class toggle
============================================================ */
let lastScrollY = window.scrollY;
let ticking     = false;

function handleNavbarScroll() {
  const scrollY = window.scrollY;

  if (scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  lastScrollY = scrollY;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(handleNavbarScroll);
    ticking = true;
  }
}, { passive: true });

// Run once on load in case page is already scrolled
handleNavbarScroll();

/* ============================================================
   MOBILE MENU — Hamburger toggle
============================================================ */
function openMenu() {
  navLinks.classList.add('open');
  hamburger.classList.add('active');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.contains('open');
  if (isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
});

// Close menu when a nav link is clicked
navLinkItems.forEach(link => {
  link.addEventListener('click', () => {
    closeMenu();
  });
});

// Close menu on backdrop click (clicking outside nav links area)
document.addEventListener('click', (e) => {
  if (
    navLinks.classList.contains('open') &&
    !navLinks.contains(e.target) &&
    !hamburger.contains(e.target)
  ) {
    closeMenu();
  }
});

// Close menu on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    closeMenu();
  }
});

/* ============================================================
   SMOOTH SCROLL — Internal anchor links
   (CSS scroll-behavior handles most of this, but this ensures
   consistent behavior across all browsers and offsets for navbar)
============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;

    e.preventDefault();

    const navbarHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')
    ) || 72;

    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight;

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });
  });
});

/* ============================================================
   SCROLL ANIMATIONS — IntersectionObserver fade-in
============================================================ */
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -60px 0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Once visible, stop observing for performance
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

fadeEls.forEach(el => {
  observer.observe(el);
});

/* ============================================================
   HERO — Immediate visibility (no delay for above-the-fold)
============================================================ */
const heroContent = document.querySelector('.hero-content');
if (heroContent) {
  // Small delay for cinematic entrance after page load
  setTimeout(() => {
    heroContent.classList.add('visible');
  }, 180);
}

/* ============================================================
   ACTIVE NAV LINK — Highlight based on scroll position
============================================================ */
const sections = document.querySelectorAll('section[id]');

function updateActiveLink() {
  const scrollY = window.scrollY;
  const navbarHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')
  ) || 72;

  let current = '';

  sections.forEach(section => {
    const sectionTop    = section.offsetTop - navbarHeight - 80;
    const sectionBottom = sectionTop + section.offsetHeight;

    if (scrollY >= sectionTop && scrollY < sectionBottom) {
      current = section.getAttribute('id');
    }
  });

  navLinkItems.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === `#${current}`) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', () => {
  window.requestAnimationFrame(updateActiveLink);
}, { passive: true });

/* ============================================================
   WHATSAPP FLOAT — Appear after scroll
============================================================ */
const whatsappFloat = document.getElementById('whatsappFloat');

if (whatsappFloat) {
  whatsappFloat.style.opacity = '0';
  whatsappFloat.style.transform = 'translateY(16px)';
  whatsappFloat.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

  setTimeout(() => {
    whatsappFloat.style.opacity = '1';
    whatsappFloat.style.transform = 'translateY(0)';
  }, 1500);
}

/* ============================================================
   PERFORMANCE — Passive video handling
   Ensure video plays on mobile devices that may pause it
============================================================ */
const heroVideo = document.querySelector('.hero-video');

if (heroVideo) {
  // Attempt to play video on user interaction if autoplay was blocked
  document.addEventListener('touchstart', () => {
    if (heroVideo.paused) {
      heroVideo.play().catch(() => {
        // Video play was rejected; this is expected on some browsers
      });
    }
  }, { once: true, passive: true });

  // Handle video load error gracefully — hero remains functional
  heroVideo.addEventListener('error', () => {
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.style.backgroundImage = 'linear-gradient(135deg, #0d1117 0%, #111827 50%, #0d1117 100%)';
    }
  });
}

/* ============================================================
   RESIZE HANDLER — Close mobile menu on desktop resize
============================================================ */
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && navLinks.classList.contains('open')) {
    closeMenu();
  }
}, { passive: true });

/* ============================================================
   INIT LOG
============================================================ */
console.log('%cBznsFlow — AI Solutions', 'font-size:18px; font-weight:800; color:#4f8ef7;');
console.log('%cBuilt for performance. Engineered to convert.', 'font-size:12px; color:#8b99b5;');
console.log('%cBilingual EN/AR — i18n active.', 'font-size:11px; color:#10b981;');
