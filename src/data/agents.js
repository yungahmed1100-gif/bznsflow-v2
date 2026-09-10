// The 12-agent roster for "Meet the AI team".
//
// English source copy lives in marketing/agents.md; the Arabic below is its
// native-register translation («كل اسم له معنى» — every agent is named for the
// job it does). `name` is the display name in the page language; `nameSub` is
// the same name in the other script, shown as a secondary chip beside it.
//
// EN + AR variants; consumed by AITeamSection via pages/Home.jsx.
export const AGENTS = [
  {
    key: 'layla', name: 'Layla', nameSub: 'ليلى', subLang: 'ar', role: 'AI Receptionist', icon: 'message-circle', accent: 'lead',
    specs: ['24/7 · 365', '<60s first reply', '2 Arabic dialects + EN', 'WhatsApp + web', 'Unlimited parallel chats'],
    problem: '78% of customers buy from the business that responds first. Your competitors take hours. Layla takes seconds.',
    outcome: 'Zero missed inquiries. A calendar that fills itself. Proven in real estate — where a 5-minute delay is a lost commission.',
  },
  {
    key: 'hatif', name: 'Hatif', nameSub: 'هاتف', subLang: 'ar', role: 'AI Voice Agent', icon: 'phone', accent: 'order',
    specs: ['Answers on ring 1', '24/7 incl. after-hours', 'AR + EN voice', 'Books mid-call', 'Transcript + summary per call'],
    problem: 'Every unanswered call is a customer dialing your competitor next. Voicemail is where revenue goes to die.',
    outcome: 'Your phone line becomes a booking machine instead of a bottleneck. One missed call per day recovered often pays for Hatif alone.',
  },
  {
    key: 'samira', name: 'Samira', nameSub: 'سميرة', subLang: 'ar', role: 'AI Social Media Manager', icon: 'megaphone', accent: 'lead',
    specs: ['3 platforms: IG · FB · LinkedIn', 'AR + EN, written natively', 'Timezone-aware scheduling', 'Nothing publishes without approval', 'Ramadan · Eid · National Day planning'],
    problem: "Businesses don't fail at social media. They abandon it — because it's one more job nobody has time for.",
    outcome: 'A brand that shows up every day while you run the business. Samira fills the funnel; Layla converts it.',
  },
  {
    key: 'wisal', name: 'Wisal', nameSub: 'وصال', subLang: 'ar', role: 'AI Outreach & Reactivation', icon: 'repeat', accent: 'order',
    specs: ['3 segments: buyers · ghosted · expired', 'Multi-touch cadences', 'AR + EN', 'Automatic re-qualification', 'Hot leads routed in real time'],
    problem: "You paid ad money for every lead in your CRM. Most went quiet. That's not a dead list — it's buried revenue.",
    outcome: "New revenue with zero new ad spend. The cheapest customer you'll ever acquire is the one you already paid for.",
  },
  {
    key: 'saqr', name: 'Saqr', nameSub: 'صقر', subLang: 'ar', role: 'AI Sales Closer', icon: 'target', accent: 'lead',
    specs: ['4 objection classes: price · timing · trust · delay', 'Proposals, quotes + payment links', 'Full deal-stage tracking', '3 lead sources: Layla · Hatif · Wisal', 'Escalates with full context'],
    problem: 'Leads don\'t die because your offer is weak. They die in the gap between "interested" and "signed" — where nobody followed up with precision.',
    outcome: "A closing process that never sleeps, never forgets, and never gets discouraged. Your conversion rate stops depending on someone's mood.",
  },
  {
    key: 'hasib', name: 'Hasib', nameSub: 'حاسب', subLang: 'ar', role: 'AI Data & Reporting Analyst', icon: 'bar-chart', accent: 'order',
    specs: ['Weekly branded report', '5 metrics: leads · calls · bookings · deals · revenue', 'Per-agent performance tracking', 'Month-over-month benchmarking', '3 next actions per report'],
    problem: "Business owners don't quit marketing because it fails — they quit because nobody proves it's working.",
    outcome: 'You stop guessing. Every decision — and every invoice you pay — is backed by a number.',
  },
  {
    key: 'rashid', name: 'Rashid', nameSub: 'رشيد', subLang: 'ar', role: 'AI Business Growth Strategist', icon: 'compass', accent: 'lead',
    specs: ['Quarterly goals + launch roadmap', 'Competitor pricing + positioning analysis', 'Investor updates & partnership proposals', 'Voice memo → structured decisions', 'Go/no-go verdict before spend'],
    problem: 'SME owners work in the business all day. Nobody is left to work on it.',
    outcome: 'Strategy stops being the thing you\'ll "get to eventually." You get a thinking partner on demand.',
  },
  {
    key: 'adiba', name: 'Adiba', nameSub: 'أديبة', subLang: 'ar', role: 'AI Copywriter', icon: 'feather', accent: 'order',
    specs: ['Pages · ads · brochures · proposals', 'AR + EN, each written natively', 'Multi-variant ad hooks for testing', '3 tone registers: B2B · consumer · government', 'One documented brand voice'],
    problem: "Weak copy quietly kills strong offers. Most businesses describe what they do — nobody's writing why it matters.",
    outcome: 'Every word representing your business earns its place. Your materials finally sound as good as your work.',
  },
  {
    key: 'dalil', name: 'Dalil', nameSub: 'دليل', subLang: 'ar', role: 'AI SEO Specialist', icon: 'search', accent: 'lead',
    specs: ['AR + EN keyword research', 'Titles · structure · speed · internal links', 'Programmatic long-tail pages', 'Rank tracking incl. competitors', 'Technical audit + fixes'],
    problem: "Ads stop the moment you stop paying. Search traffic compounds — and in Arabic, it's nearly uncontested territory.",
    outcome: 'A growing stream of free, high-intent leads. The moat gets deeper every month while competitors keep renting attention.',
  },
  {
    key: 'rasil', name: 'Rasil', nameSub: 'راسل', subLang: 'ar', role: 'AI Email Marketing', icon: 'mail', accent: 'order',
    specs: ['4-stage lifecycle: lead → nurture → offer → win-back', 'Segmented sends', 'A/B on subject lines + send times', 'Opens · clicks · revenue per send', 'Welcome, nurture + post-purchase flows'],
    problem: 'Your email list is an owned audience — no algorithm, no ad auction. Most businesses let it rot.',
    outcome: 'A sales channel you own outright, working your list while you sleep.',
  },
  {
    key: 'raqib', name: 'Raqib', nameSub: 'رقيب', subLang: 'ar', role: 'AI Operations Overseer', icon: 'eye', accent: 'lead',
    specs: ['24/7 monitoring', '3 signals: uptime · response time · error rate', 'Baseline drift alerts', 'Live operational log', 'Escalates only on real faults'],
    problem: 'Automated systems fail silently. You find out when a customer complains — which is the most expensive way to find out.',
    outcome: 'You sleep knowing the machine is being watched by something that never sleeps.',
  },
  {
    key: 'haris', name: 'Haris', nameSub: 'حارس', subLang: 'ar', role: 'AI Security & Data Guardian', icon: 'shield-check', accent: 'order',
    specs: ['Encrypted in transit + at rest', 'GDPR (EU) + GCC regional compliance', 'Per-agent access control', 'Exportable · deletable · never sold', 'Full audit trail'],
    problem: 'One data leak destroys years of trust. GCC customers are rightfully sensitive about privacy — and most SMEs have no answer when asked "is my data safe with you?"',
    outcome: 'Security stops being a weakness you hope nobody asks about — and becomes a selling point you lead with.',
  },
];

export const AGENTS_AR = [
  {
    key: 'layla', name: 'ليلى', nameSub: 'Layla', subLang: 'en', role: 'موظفة الاستقبال الذكية', icon: 'message-circle', accent: 'lead',
    // Not "24/7 · 365" — a neutral separator between two numerals gets
    // reordered by the bidi algorithm and renders backwards under RTL.
    specs: ['24/7 طوال السنة', 'رد أول خلال أقل من 60 ثانية', 'لهجتان عربيتان + الإنجليزية', 'واتساب + الموقع', 'محادثات متزامنة بلا حد'],
    problem: '78% من العملاء يشترون من أول من يرد عليهم. منافسوك يتأخرون ساعات — وليلى ترد خلال ثوانٍ.',
    outcome: 'صفر استفسارات ضائعة. تقويم يمتلئ من تلقاء نفسه. مُثبَت في العقارات — حيث تأخير خمس دقائق يعني عمولة ضائعة.',
  },
  {
    key: 'hatif', name: 'هاتف', nameSub: 'Hatif', subLang: 'en', role: 'وكيل الصوت الذكي', icon: 'phone', accent: 'order',
    specs: ['ترد من الرنة الأولى', '24/7 وبعد الدوام', 'صوت عربي + إنجليزي', 'تحجز أثناء المكالمة', 'نص وملخص لكل مكالمة'],
    problem: 'كل مكالمة بلا رد هي عميل يتصل بمنافسك بعدها. البريد الصوتي هو المكان الذي يموت فيه الإيراد.',
    outcome: 'خط هاتفك يتحول إلى آلة حجوزات بدل أن يكون عنق زجاجة. مكالمة واحدة مستعادة يوميًا تغطي غالبًا تكلفة هاتف وحدها.',
  },
  {
    key: 'samira', name: 'سميرة', nameSub: 'Samira', subLang: 'en', role: 'مديرة السوشيال ميديا الذكية', icon: 'megaphone', accent: 'lead',
    specs: ['3 منصات: إنستغرام · فيسبوك · لينكدإن', 'عربي + إنجليزي بكتابة أصلية', 'جدولة حسب التوقيت المحلي', 'لا نشر دون موافقتك', 'رمضان · العيد · اليوم الوطني'],
    problem: 'الأعمال لا تفشل في السوشيال ميديا، بل تهجرها — لأنها مهمة إضافية لا وقت لها عند أحد.',
    outcome: 'علامة حاضرة كل يوم بينما تدير أنت العمل. سميرة تملأ القمع؛ وليلى تحوّله.',
  },
  {
    key: 'wisal', name: 'وصال', nameSub: 'Wisal', subLang: 'en', role: 'التواصل وإعادة التنشيط', icon: 'repeat', accent: 'order',
    specs: ['3 شرائح: مشترون · متجاهلون · منتهية', 'تسلسلات متعددة اللمسات', 'عربي + إنجليزي', 'إعادة تأهيل آلية', 'تحويل فوري للعملاء الساخنين'],
    problem: 'دفعت مال إعلانات عن كل عميل في نظامك. معظمهم صمت. هذه ليست قائمة ميتة — بل إيراد مدفون.',
    outcome: 'إيراد جديد بصفر إنفاق إعلاني إضافي. أرخص عميل ستكسبه هو الذي دفعت ثمنه بالفعل.',
  },
  {
    key: 'saqr', name: 'صقر', nameSub: 'Saqr', subLang: 'en', role: 'مُتمم المبيعات الذكي', icon: 'target', accent: 'lead',
    specs: ['4 اعتراضات: السعر · التوقيت · الثقة · التأجيل', 'عروض وأسعار وروابط دفع', 'تتبع كامل لمراحل الصفقة', '3 مصادر: ليلى · هاتف · وصال', 'تصعيد بسياق كامل'],
    problem: 'العملاء لا يضيعون لأن عرضك ضعيف، بل في الفجوة بين «مهتم» و«وقّع» — حيث لم يتابع أحد بدقة.',
    outcome: 'عملية إتمام لا تنام ولا تنسى ولا تفقد حماسها. معدل تحويلك يتوقف عن الاعتماد على مزاج أحد.',
  },
  {
    key: 'hasib', name: 'حاسب', nameSub: 'Hasib', subLang: 'en', role: 'محلل البيانات والتقارير', icon: 'bar-chart', accent: 'order',
    specs: ['تقرير أسبوعي بعلامتك', '5 مؤشرات: عملاء · مكالمات · مواعيد · صفقات · إيراد', 'تتبع أداء كل وكيل', 'مقارنة شهرًا بشهر', '3 خطوات تالية في كل تقرير'],
    problem: 'أصحاب الأعمال لا يوقفون التسويق لأنه فشل — بل لأن أحدًا لا يثبت لهم أنه ينجح.',
    outcome: 'تتوقف عن التخمين. كل قرار — وكل فاتورة تدفعها — خلفها رقم.',
  },
  {
    key: 'rashid', name: 'رشيد', nameSub: 'Rashid', subLang: 'en', role: 'مستشار نمو الأعمال', icon: 'compass', accent: 'lead',
    specs: ['أهداف وخارطة طريق ربعية', 'تحليل تسعير ومواقع المنافسين', 'تحديثات المستثمرين ومقترحات الشراكة', 'مذكرة صوتية ← قرارات منظمة', 'حكم واضح قبل الإنفاق'],
    problem: 'أصحاب المشاريع يعملون داخل العمل طوال اليوم. لا يبقى أحد ليعمل على تطوير العمل نفسه.',
    outcome: 'الاستراتيجية تتوقف عن كونها الشيء الذي «ستصل إليه لاحقًا». تحصل على شريك تفكير عند الطلب.',
  },
  {
    key: 'adiba', name: 'أديبة', nameSub: 'Adiba', subLang: 'en', role: 'كاتبة المحتوى الإعلاني', icon: 'feather', accent: 'order',
    specs: ['صفحات · إعلانات · بروشورات · عروض', 'عربي + إنجليزي بكتابة أصلية', 'صيغ إعلانية متعددة للاختبار', '3 نبرات: أعمال · أفراد · حكومي', 'صوت علامة واحد موثّق'],
    problem: 'النصوص الضعيفة تقتل العروض القوية بصمت. معظم الأعمال تصف ما تفعله — ولا أحد يكتب لماذا يهم ذلك.',
    outcome: 'كل كلمة تمثل عملك تستحق مكانها. موادك تبدو أخيرًا بجودة شغلك.',
  },
  {
    key: 'dalil', name: 'دليل', nameSub: 'Dalil', subLang: 'en', role: 'أخصائي تحسين محركات البحث', icon: 'search', accent: 'lead',
    specs: ['بحث كلمات بالعربية والإنجليزية', 'عناوين · بنية · سرعة · روابط داخلية', 'صفحات طويلة الذيل برمجيًا', 'تتبع ترتيبك وترتيب المنافسين', 'تدقيق تقني وإصلاح'],
    problem: 'الإعلانات تتوقف لحظة توقف الدفع. زيارات البحث تتراكم — وبالعربية، الساحة شبه خالية من المنافسة.',
    outcome: 'تدفق متنامٍ من عملاء مجانيين بنية شراء عالية. الخندق يتعمق كل شهر بينما يظل منافسوك يستأجرون الانتباه.',
  },
  {
    key: 'rasil', name: 'راسل', nameSub: 'Rasil', subLang: 'en', role: 'التسويق عبر البريد', icon: 'mail', accent: 'order',
    specs: ['دورة من 4 مراحل: عميل ← رعاية ← عرض ← استعادة', 'إرسال مقسّم حسب الشريحة', 'اختبار العناوين وأوقات الإرسال', 'فتح · نقر · إيراد لكل إرسال', 'تدفقات ترحيب ورعاية وما بعد الشراء'],
    problem: 'قائمتك البريدية جمهور تملكه أنت — لا خوارزمية ولا مزاد إعلانات. ومعظم الأعمال تتركها تذبل.',
    outcome: 'قناة مبيعات تملكها بالكامل، تعمل على قائمتك وأنت نائم.',
  },
  {
    key: 'raqib', name: 'رقيب', nameSub: 'Raqib', subLang: 'en', role: 'مراقب العمليات', icon: 'eye', accent: 'lead',
    specs: ['مراقبة 24/7', '3 مؤشرات: التشغيل · زمن الرد · معدل الأخطاء', 'تنبيه عند الانحراف عن الأساس', 'سجل تشغيلي حي', 'تصعيد عند الأعطال الحقيقية فقط'],
    problem: 'الأنظمة الآلية تتعطل بصمت. وتكتشف ذلك حين يشتكي عميل — وهي أغلى طريقة للاكتشاف.',
    outcome: 'تنام مطمئنًا لأن الآلة يحرسها ما لا ينام.',
  },
  {
    key: 'haris', name: 'حارس', nameSub: 'Haris', subLang: 'en', role: 'حارس الأمن والبيانات', icon: 'shield-check', accent: 'order',
    specs: ['تشفير أثناء النقل والتخزين', 'GDPR أوروبا + امتثال إقليمي للخليج', 'تحكم بالوصول لكل وكيل', 'قابل للتصدير والحذف · لا يُباع أبدًا', 'سجل تدقيق كامل'],
    problem: 'تسريب واحد للبيانات يهدم سنوات من الثقة. عملاء الخليج حساسون للخصوصية بحق — ومعظم المنشآت لا تملك جوابًا حين تُسأل: «هل بياناتي آمنة عندكم؟»',
    outcome: 'الأمن يتوقف عن كونه نقطة ضعف تتمنى ألا يسأل عنها أحد — ويصبح ميزة بيع تتصدر بها.',
  },
];

export const PITCH = {
  en: {
    title: 'One team. Twelve specialists. Zero salaries, sick days, or resignations.',
    body: 'They answer at 3 AM. They follow up on day 14. They report every Sunday. They never forget a lead, a call, or a promise. And every one of them is named for exactly what it does — ',
  },
  ar: {
    title: 'فريق واحد. اثنا عشر متخصصًا. صفر رواتب أو إجازات مرضية أو استقالات.',
    body: 'يردّون في الثالثة فجرًا. يتابعون في اليوم الرابع عشر. يرفعون تقاريرهم كل أسبوع. لا ينسون عميلًا ولا مكالمة ولا وعدًا. وكل واحد منهم سُمّي على وظيفته بالضبط — ',
  },
};

// Keyed lookups so other sections can name an agent without re-typing it.
// The tier cards index these by the keys listed in data/tiers.js — a rename
// here carries through to the pricing ladder instead of drifting from it.
export const AGENT_BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a]));
export const AGENT_BY_KEY_AR = Object.fromEntries(AGENTS_AR.map((a) => [a.key, a]));
