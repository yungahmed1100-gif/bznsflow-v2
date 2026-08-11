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
    duties: [
      'Answers every WhatsApp and website message instantly — 24/7, weekends, Eid holidays, all of it',
      'Qualifies each lead with smart questions: budget, timeline, requirements — so you only talk to serious buyers',
      'Books appointments directly into your calendar, no back-and-forth',
      'Follows up automatically on cold conversations — the follow-up your team forgets is the one Layla never misses',
      "Speaks your customer's language: Khaleeji Arabic, Egyptian Arabic, English — naturally, not robotically",
      "Hands hot leads to you (or to Saqr) the moment they're ready to close",
    ],
    outcome: 'Zero missed inquiries. A calendar that fills itself. Proven in real estate — where a 5-minute delay is a lost commission.',
  },
  {
    key: 'hatif', name: 'Hatif', nameSub: 'هاتف', subLang: 'ar', role: 'AI Voice Agent', icon: 'phone', accent: 'order',
    specs: ['Answers on ring 1', '24/7 incl. after-hours', 'AR + EN voice', 'Books mid-call', 'Transcript + summary per call'],
    problem: 'Every unanswered call is a customer dialing your competitor next. Voicemail is where revenue goes to die.',
    duties: [
      'Answers every phone call in a natural, professional voice — first ring, every time',
      'Handles the full conversation: questions, pricing basics, availability, directions',
      'Qualifies the caller and books the appointment during the call itself',
      'Takes structured messages for anything needing a human — and pushes them to you on WhatsApp instantly',
      'Covers after-hours, lunch breaks, Fridays, and the moments your team is with another client',
      "Logs every call with a summary, so nothing lives only in someone's memory",
    ],
    outcome: 'Your phone line becomes a booking machine instead of a bottleneck. One missed call per day recovered often pays for Hatif alone.',
  },
  {
    key: 'samira', name: 'Samira', nameSub: 'سميرة', subLang: 'ar', role: 'AI Social Media Manager', icon: 'megaphone', accent: 'lead',
    specs: ['3 platforms: IG · FB · LinkedIn', 'AR + EN, written natively', 'Timezone-aware scheduling', 'Nothing publishes without approval', 'Ramadan · Eid · National Day planning'],
    problem: "Businesses don't fail at social media. They abandon it — because it's one more job nobody has time for.",
    duties: [
      'Builds your social strategy: goals, channels, content pillars, posting cadence',
      'Creates the content: posts, captions with variations, hashtags, carousels, video scripts, story ideas',
      'Adapts every piece per platform — Instagram, Facebook, LinkedIn — correct format, length, and tone',
      'Plans campaigns around what matters in your market: Ramadan, Eid, National Day, launches, seasonal cycles',
      'Schedules and publishes directly to your connected accounts — timezone-aware',
      'Nothing ships without your approval — you review, edit, approve. Full brand control, zero surprises',
    ],
    outcome: 'A brand that shows up every day while you run the business. Samira fills the funnel; Layla converts it.',
  },
  {
    key: 'wisal', name: 'Wisal', nameSub: 'وصال', subLang: 'ar', role: 'AI Outreach & Reactivation', icon: 'repeat', accent: 'order',
    specs: ['3 segments: buyers · ghosted · expired', 'Multi-touch cadences', 'AR + EN', 'Automatic re-qualification', 'Hot leads routed in real time'],
    problem: "You paid ad money for every lead in your CRM. Most went quiet. That's not a dead list — it's buried revenue.",
    duties: [
      'Reactivates dormant leads and old customer lists with intelligent, personalized outbound sequences',
      'Segments the list: past buyers, ghosted prospects, expired inquiries — each gets a different conversation',
      'Runs smart follow-up cadences that feel human, not spammy — spaced, contextual, in the right dialect',
      'Re-qualifies revived leads and routes hot ones straight to Saqr or your sales team',
      'Wins back lapsed customers with tailored offers and check-ins',
      'Reports exactly how much pipeline was revived — in numbers, not vibes',
    ],
    outcome: "New revenue with zero new ad spend. The cheapest customer you'll ever acquire is the one you already paid for.",
  },
  {
    key: 'saqr', name: 'Saqr', nameSub: 'صقر', subLang: 'ar', role: 'AI Sales Closer', icon: 'target', accent: 'lead',
    specs: ['4 objection classes: price · timing · trust · delay', 'Proposals, quotes + payment links', 'Full deal-stage tracking', '3 lead sources: Layla · Hatif · Wisal', 'Escalates with full context'],
    problem: 'Leads don\'t die because your offer is weak. They die in the gap between "interested" and "signed" — where nobody followed up with precision.',
    duties: [
      'Takes qualified leads from Layla, Hatif, and Wisal and drives them to a decision',
      'Handles objections with prepared, honest answers: price, timing, trust, "let me think about it"',
      'Sends proposals, quotes, and payment links at the exact right moment in the conversation',
      'Runs deal follow-up sequences with the patience of a hunter — persistent, never desperate',
      'Knows when to escalate to you personally — the big deals get the human touch, prepped with full context',
      'Tracks every deal stage so you see the pipeline, not a mystery',
    ],
    outcome: "A closing process that never sleeps, never forgets, and never gets discouraged. Your conversion rate stops depending on someone's mood.",
  },
  {
    key: 'hasib', name: 'Hasib', nameSub: 'حاسب', subLang: 'ar', role: 'AI Data & Reporting Analyst', icon: 'bar-chart', accent: 'order',
    specs: ['Weekly branded report', '5 metrics: leads · calls · bookings · deals · revenue', 'Per-agent performance tracking', 'Month-over-month benchmarking', '3 next actions per report'],
    problem: "Business owners don't quit marketing because it fails — they quit because nobody proves it's working.",
    duties: [
      'Produces your weekly business report: leads captured, calls answered, appointments booked, deals closed, revenue attributed',
      "Tracks the performance of every other agent — Layla's response times, Samira's engagement, Wisal's revival rate — in one dashboard",
      'Monitors your ad spend against results and flags waste before it compounds',
      'Translates raw data into three clear next actions — not a spreadsheet dump',
      'Benchmarks month against month, so growth is visible and provable',
      'Delivers it all as a clean, branded report you can forward to a partner or investor as-is',
    ],
    outcome: 'You stop guessing. Every decision — and every invoice you pay — is backed by a number.',
  },
  {
    key: 'rashid', name: 'Rashid', nameSub: 'رشيد', subLang: 'ar', role: 'AI Business Growth Strategist', icon: 'compass', accent: 'lead',
    specs: ['Quarterly goals + launch roadmap', 'Competitor pricing + positioning analysis', 'Investor updates & partnership proposals', 'Voice memo → structured decisions', 'Go/no-go verdict before spend'],
    problem: 'SME owners work in the business all day. Nobody is left to work on it.',
    duties: [
      'Analyzes your market and competitors: pricing, positioning, gaps you can attack',
      'Builds growth plans: quarterly goals, launch roadmaps, expansion strategy',
      'Evaluates new ideas before you spend money on them — honest verdicts, not cheerleading',
      'Drafts the serious documents: investor updates, partnership proposals, business plans',
      'Turns your meeting notes and voice memos into structured decisions and action items',
      'Advises like a majlis counselor, modernized: calm, data-driven, speaks in numbers and next steps',
    ],
    outcome: 'Strategy stops being the thing you\'ll "get to eventually." You get a thinking partner on demand.',
  },
  {
    key: 'adiba', name: 'Adiba', nameSub: 'أديبة', subLang: 'ar', role: 'AI Copywriter', icon: 'feather', accent: 'order',
    specs: ['Pages · ads · brochures · proposals', 'AR + EN, each written natively', 'Multi-variant ad hooks for testing', '3 tone registers: B2B · consumer · government', 'One documented brand voice'],
    problem: "Weak copy quietly kills strong offers. Most businesses describe what they do — nobody's writing why it matters.",
    duties: [
      'Writes conversion copy for your website: headlines, landing pages, service pages, CTAs',
      'Crafts ad copy variants for Meta campaigns — hooks tested against each other, not guessed',
      'Produces brochures, proposals, company profiles, and pitch documents that read premium',
      'Maintains one consistent brand voice across everything — Arabic and English, each written natively',
      'Rewrites and sharpens existing copy: same page, double the persuasion',
      'Adapts tone per audience: corporate for B2B, warm for consumers, formal for government',
    ],
    outcome: 'Every word representing your business earns its place. Your materials finally sound as good as your work.',
  },
  {
    key: 'dalil', name: 'Dalil', nameSub: 'دليل', subLang: 'ar', role: 'AI SEO Specialist', icon: 'search', accent: 'lead',
    specs: ['AR + EN keyword research', 'Titles · structure · speed · internal links', 'Programmatic long-tail pages', 'Rank tracking incl. competitors', 'Technical audit + fixes'],
    problem: "Ads stop the moment you stop paying. Search traffic compounds — and in Arabic, it's nearly uncontested territory.",
    duties: [
      'Researches what your customers actually search for — in Arabic AND English (your competitors ignore the Arabic half)',
      'Optimizes your website pages: titles, structure, speed, internal linking',
      'Builds programmatic landing pages targeting long-tail searches in your vertical',
      "Tracks your rankings and your competitors' — and tells you where to strike next",
      'Fixes the technical issues silently costing you visibility',
      'Turns every service you offer into a findable, rankable page',
    ],
    outcome: 'A growing stream of free, high-intent leads. The moat gets deeper every month while competitors keep renting attention.',
  },
  {
    key: 'rasil', name: 'Rasil', nameSub: 'راسل', subLang: 'ar', role: 'AI Email Marketing', icon: 'mail', accent: 'order',
    specs: ['4-stage lifecycle: lead → nurture → offer → win-back', 'Segmented sends', 'A/B on subject lines + send times', 'Opens · clicks · revenue per send', 'Welcome, nurture + post-purchase flows'],
    problem: 'Your email list is an owned audience — no algorithm, no ad auction. Most businesses let it rot.',
    duties: [
      'Builds and runs your email sequences: welcome series, nurture flows, post-purchase follow-up',
      'Writes newsletters your list actually opens — value first, pitch second',
      'Segments your audience so the right offer reaches the right customer',
      'Automates the lifecycle: new lead → nurture → offer → win-back',
      'A/B tests subject lines and send times, then keeps what wins',
      'Reports opens, clicks, and — the only number that matters — revenue per send',
    ],
    outcome: 'A sales channel you own outright, working your list while you sleep.',
  },
  {
    key: 'raqib', name: 'Raqib', nameSub: 'رقيب', subLang: 'ar', role: 'AI Operations Overseer', icon: 'eye', accent: 'lead',
    specs: ['24/7 monitoring', '3 signals: uptime · response time · error rate', 'Baseline drift alerts', 'Live operational log', 'Escalates only on real faults'],
    problem: 'Automated systems fail silently. You find out when a customer complains — which is the most expensive way to find out.',
    duties: [
      'Monitors every agent and system around the clock — uptime, response times, error rates',
      'Flags issues the moment they appear, before customers ever notice',
      'Watches performance trends and alerts you when something drifts off baseline',
      'Coordinates between agents so handoffs (Layla → Saqr, Wisal → Saqr) never drop a lead',
      'Keeps a live operational log: what ran, what succeeded, what needs attention',
      'Escalates to a human only when it matters — no noise, no false alarms',
    ],
    outcome: 'You sleep knowing the machine is being watched by something that never sleeps.',
  },
  {
    key: 'haris', name: 'Haris', nameSub: 'حارس', subLang: 'ar', role: 'AI Security & Data Guardian', icon: 'shield-check', accent: 'order',
    specs: ['Encrypted in transit + at rest', 'GDPR (EU) + GCC regional compliance', 'Per-agent access control', 'Exportable · deletable · never sold', 'Full audit trail'],
    problem: 'One data leak destroys years of trust. GCC customers are rightfully sensitive about privacy — and most SMEs have no answer when asked "is my data safe with you?"',
    duties: [
      'Guards every customer conversation and record — encrypted in transit and at rest',
      'Enforces data protection standards: GDPR for EU operations, regional compliance for GCC markets',
      'Controls who and what can access client data — including which agents see which information',
      "Guarantees data ownership: your clients' data is exportable, deletable, never sold, never used for training",
      'Maintains audit trails, so every access is accounted for',
      'Gives YOU the answer that closes enterprise deals: "yes, and here\'s exactly how we protect it"',
    ],
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
    duties: [
      'ترد فورًا على كل رسالة واتساب وموقع — 24/7، في العطل وأيام العيد',
      'تؤهّل كل عميل بأسئلة ذكية: الميزانية، التوقيت، المتطلبات — فلا تتحدث إلا مع الجادين',
      'تحجز المواعيد مباشرة في تقويمك، دون أخذ ورد',
      'تتابع المحادثات الباردة تلقائيًا — المتابعة التي ينساها فريقك لا تفوتها ليلى أبدًا',
      'تتحدث بلغة عميلك: الخليجية، المصرية، والإنجليزية — بطبيعية لا كالروبوتات',
      'تسلّمك العملاء الجاهزين (أو إلى صقر) لحظة استعدادهم لإتمام الصفقة',
    ],
    outcome: 'صفر استفسارات ضائعة. تقويم يمتلئ من تلقاء نفسه. مُثبَت في العقارات — حيث تأخير خمس دقائق يعني عمولة ضائعة.',
  },
  {
    key: 'hatif', name: 'هاتف', nameSub: 'Hatif', subLang: 'en', role: 'وكيل الصوت الذكي', icon: 'phone', accent: 'order',
    specs: ['ترد من الرنة الأولى', '24/7 وبعد الدوام', 'صوت عربي + إنجليزي', 'تحجز أثناء المكالمة', 'نص وملخص لكل مكالمة'],
    problem: 'كل مكالمة بلا رد هي عميل يتصل بمنافسك بعدها. البريد الصوتي هو المكان الذي يموت فيه الإيراد.',
    duties: [
      'يرد على كل مكالمة بصوت طبيعي واحترافي — من أول رنة، في كل مرة',
      'يدير المحادثة كاملة: الأسئلة، أساسيات الأسعار، التوفر، والعناوين',
      'يؤهّل المتصل ويحجز الموعد أثناء المكالمة نفسها',
      'يسجّل رسائل منظمة لكل ما يحتاج تدخلًا بشريًا — ويرسلها لك على واتساب فورًا',
      'يغطي ما بعد الدوام، الاستراحات، أيام الجمعة، ولحظات انشغال فريقك مع عميل آخر',
      'يوثّق كل مكالمة بملخص، فلا يبقى شيء في ذاكرة أحد فقط',
    ],
    outcome: 'خط هاتفك يتحول إلى آلة حجوزات بدل أن يكون عنق زجاجة. مكالمة واحدة مستعادة يوميًا تغطي غالبًا تكلفة هاتف وحدها.',
  },
  {
    key: 'samira', name: 'سميرة', nameSub: 'Samira', subLang: 'en', role: 'مديرة السوشيال ميديا الذكية', icon: 'megaphone', accent: 'lead',
    specs: ['3 منصات: إنستغرام · فيسبوك · لينكدإن', 'عربي + إنجليزي بكتابة أصلية', 'جدولة حسب التوقيت المحلي', 'لا نشر دون موافقتك', 'رمضان · العيد · اليوم الوطني'],
    problem: 'الأعمال لا تفشل في السوشيال ميديا، بل تهجرها — لأنها مهمة إضافية لا وقت لها عند أحد.',
    duties: [
      'تبني استراتيجيتك: الأهداف، القنوات، محاور المحتوى، وإيقاع النشر',
      'تصنع المحتوى: منشورات، نصوص بنسخ متعددة، هاشتاقات، كاروسيلات، سكربتات فيديو وأفكار ستوري',
      'تكيّف كل قطعة حسب المنصة — إنستغرام، فيسبوك، لينكدإن — بالصيغة والطول والنبرة الصحيحة',
      'تخطط الحملات حول ما يهم سوقك: رمضان، العيد، اليوم الوطني، الإطلاقات والمواسم',
      'تجدول وتنشر مباشرة على حساباتك المربوطة — بتوقيت منطقتك',
      'لا شيء يُنشر دون موافقتك — تراجع وتعدّل وتعتمد. تحكم كامل بالعلامة، صفر مفاجآت',
    ],
    outcome: 'علامة حاضرة كل يوم بينما تدير أنت العمل. سميرة تملأ القمع؛ وليلى تحوّله.',
  },
  {
    key: 'wisal', name: 'وصال', nameSub: 'Wisal', subLang: 'en', role: 'التواصل وإعادة التنشيط', icon: 'repeat', accent: 'order',
    specs: ['3 شرائح: مشترون · متجاهلون · منتهية', 'تسلسلات متعددة اللمسات', 'عربي + إنجليزي', 'إعادة تأهيل آلية', 'تحويل فوري للعملاء الساخنين'],
    problem: 'دفعت مال إعلانات عن كل عميل في نظامك. معظمهم صمت. هذه ليست قائمة ميتة — بل إيراد مدفون.',
    duties: [
      'يعيد تنشيط العملاء الخاملين والقوائم القديمة بتسلسلات صادرة ذكية ومخصصة',
      'يقسّم القائمة: مشترون سابقون، مهتمون انقطعوا، استفسارات منتهية — لكلٍّ حديثه المختلف',
      'يدير متابعات ذكية تبدو بشرية لا مزعجة — متباعدة، بسياقها، وباللهجة الصحيحة',
      'يعيد تأهيل العملاء المستعادين ويوجّه الجاهزين مباشرة إلى صقر أو فريق مبيعاتك',
      'يستعيد العملاء المنقطعين بعروض مخصصة واهتمام حقيقي',
      'يقدّم تقريرًا دقيقًا بحجم الإيراد المستعاد — بالأرقام لا بالانطباعات',
    ],
    outcome: 'إيراد جديد بصفر إنفاق إعلاني إضافي. أرخص عميل ستكسبه هو الذي دفعت ثمنه بالفعل.',
  },
  {
    key: 'saqr', name: 'صقر', nameSub: 'Saqr', subLang: 'en', role: 'مُتمم المبيعات الذكي', icon: 'target', accent: 'lead',
    specs: ['4 اعتراضات: السعر · التوقيت · الثقة · التأجيل', 'عروض وأسعار وروابط دفع', 'تتبع كامل لمراحل الصفقة', '3 مصادر: ليلى · هاتف · وصال', 'تصعيد بسياق كامل'],
    problem: 'العملاء لا يضيعون لأن عرضك ضعيف، بل في الفجوة بين «مهتم» و«وقّع» — حيث لم يتابع أحد بدقة.',
    duties: [
      'يستلم العملاء المؤهلين من ليلى وهاتف ووصال ويقودهم نحو القرار',
      'يعالج الاعتراضات بإجابات جاهزة وصادقة: السعر، التوقيت، الثقة، و«دعني أفكر»',
      'يرسل العروض والتسعيرات وروابط الدفع في اللحظة المناسبة تمامًا من المحادثة',
      'يدير متابعات الصفقات بصبر الصياد — مثابر دون إلحاح',
      'يعرف متى يصعّد الأمر إليك شخصيًا — الصفقات الكبيرة تأخذ اللمسة البشرية بكامل سياقها',
      'يتتبع كل مرحلة من الصفقة فترى مسار المبيعات بوضوح لا لغزًا',
    ],
    outcome: 'عملية إتمام لا تنام ولا تنسى ولا تفقد حماسها. معدل تحويلك يتوقف عن الاعتماد على مزاج أحد.',
  },
  {
    key: 'hasib', name: 'حاسب', nameSub: 'Hasib', subLang: 'en', role: 'محلل البيانات والتقارير', icon: 'bar-chart', accent: 'order',
    specs: ['تقرير أسبوعي بعلامتك', '5 مؤشرات: عملاء · مكالمات · مواعيد · صفقات · إيراد', 'تتبع أداء كل وكيل', 'مقارنة شهرًا بشهر', '3 خطوات تالية في كل تقرير'],
    problem: 'أصحاب الأعمال لا يوقفون التسويق لأنه فشل — بل لأن أحدًا لا يثبت لهم أنه ينجح.',
    duties: [
      'يُعدّ تقريرك الأسبوعي: عملاء مُلتقطون، مكالمات مُجابة، مواعيد محجوزة، صفقات مُتمّة، وإيراد منسوب لمصدره',
      'يتتبع أداء بقية الفريق — سرعة ردود ليلى، تفاعل سميرة، استعادة وصال — في لوحة واحدة',
      'يراقب إنفاقك الإعلاني مقابل النتائج ويكشف الهدر قبل أن يتراكم',
      'يترجم البيانات الخام إلى ثلاث خطوات تالية واضحة — لا جداول مبعثرة',
      'يقارن شهرًا بشهر، فيصبح النمو مرئيًا وقابلًا للإثبات',
      'يسلّمك تقريرًا أنيقًا بهوية علامتك يمكنك تمريره لشريك أو مستثمر كما هو',
    ],
    outcome: 'تتوقف عن التخمين. كل قرار — وكل فاتورة تدفعها — خلفها رقم.',
  },
  {
    key: 'rashid', name: 'رشيد', nameSub: 'Rashid', subLang: 'en', role: 'مستشار نمو الأعمال', icon: 'compass', accent: 'lead',
    specs: ['أهداف وخارطة طريق ربعية', 'تحليل تسعير ومواقع المنافسين', 'تحديثات المستثمرين ومقترحات الشراكة', 'مذكرة صوتية ← قرارات منظمة', 'حكم واضح قبل الإنفاق'],
    problem: 'أصحاب المشاريع يعملون داخل العمل طوال اليوم. لا يبقى أحد ليعمل على تطوير العمل نفسه.',
    duties: [
      'يحلل سوقك ومنافسيك: التسعير، التموضع، والثغرات التي يمكنك اقتناصها',
      'يبني خطط النمو: أهداف ربع سنوية، خرائط إطلاق، واستراتيجية توسّع',
      'يقيّم الأفكار الجديدة قبل أن تنفق عليها — أحكام صادقة لا مجاملة',
      'يصيغ الوثائق الجادة: تحديثات المستثمرين، مقترحات الشراكات، وخطط الأعمال',
      'يحوّل ملاحظات اجتماعاتك ورسائلك الصوتية إلى قرارات وبنود تنفيذ',
      'ينصح كمستشار مجلس بروح العصر: هادئ، مبني على البيانات، يتكلم بالأرقام والخطوات',
    ],
    outcome: 'الاستراتيجية تتوقف عن كونها الشيء الذي «ستصل إليه لاحقًا». تحصل على شريك تفكير عند الطلب.',
  },
  {
    key: 'adiba', name: 'أديبة', nameSub: 'Adiba', subLang: 'en', role: 'كاتبة المحتوى الإعلاني', icon: 'feather', accent: 'order',
    specs: ['صفحات · إعلانات · بروشورات · عروض', 'عربي + إنجليزي بكتابة أصلية', 'صيغ إعلانية متعددة للاختبار', '3 نبرات: أعمال · أفراد · حكومي', 'صوت علامة واحد موثّق'],
    problem: 'النصوص الضعيفة تقتل العروض القوية بصمت. معظم الأعمال تصف ما تفعله — ولا أحد يكتب لماذا يهم ذلك.',
    duties: [
      'تكتب نصوص التحويل لموقعك: العناوين، صفحات الهبوط، صفحات الخدمات، وأزرار الدعوة',
      'تصيغ نسخ إعلانات ميتا — افتتاحيات تُختبر ضد بعضها، لا تخمينًا',
      'تنتج بروشورات وعروضًا وملفات شركات ووثائق تقديم تُقرأ بمستوى فاخر',
      'تحافظ على صوت واحد للعلامة في كل شيء — عربية وإنجليزية، كلٌّ تُكتب بلغتها لا ترجمة حرفية',
      'تعيد صياغة نصوصك الحالية وتشحذها: الصفحة نفسها، ضعف الإقناع',
      'تكيّف النبرة حسب الجمهور: رسمية للشركات، دافئة للمستهلكين، بروتوكولية للجهات الحكومية',
    ],
    outcome: 'كل كلمة تمثل عملك تستحق مكانها. موادك تبدو أخيرًا بجودة شغلك.',
  },
  {
    key: 'dalil', name: 'دليل', nameSub: 'Dalil', subLang: 'en', role: 'أخصائي تحسين محركات البحث', icon: 'search', accent: 'lead',
    specs: ['بحث كلمات بالعربية والإنجليزية', 'عناوين · بنية · سرعة · روابط داخلية', 'صفحات طويلة الذيل برمجيًا', 'تتبع ترتيبك وترتيب المنافسين', 'تدقيق تقني وإصلاح'],
    problem: 'الإعلانات تتوقف لحظة توقف الدفع. زيارات البحث تتراكم — وبالعربية، الساحة شبه خالية من المنافسة.',
    duties: [
      'يبحث عمّا يكتبه عملاؤك فعلًا في البحث — بالعربية والإنجليزية (منافسوك يتجاهلون النصف العربي)',
      'يحسّن صفحات موقعك: العناوين، البنية، السرعة، والروابط الداخلية',
      'يبني صفحات هبوط موجهة لعمليات البحث الدقيقة في مجالك',
      'يتتبع ترتيبك وترتيب منافسيك — ويخبرك أين تضرب تاليًا',
      'يصلح المشاكل التقنية التي تكلفك الظهور بصمت',
      'يحوّل كل خدمة تقدمها إلى صفحة قابلة للعثور عليها والترتيب بها',
    ],
    outcome: 'تدفق متنامٍ من عملاء مجانيين بنية شراء عالية. الخندق يتعمق كل شهر بينما يظل منافسوك يستأجرون الانتباه.',
  },
  {
    key: 'rasil', name: 'راسل', nameSub: 'Rasil', subLang: 'en', role: 'التسويق عبر البريد', icon: 'mail', accent: 'order',
    specs: ['دورة من 4 مراحل: عميل ← رعاية ← عرض ← استعادة', 'إرسال مقسّم حسب الشريحة', 'اختبار العناوين وأوقات الإرسال', 'فتح · نقر · إيراد لكل إرسال', 'تدفقات ترحيب ورعاية وما بعد الشراء'],
    problem: 'قائمتك البريدية جمهور تملكه أنت — لا خوارزمية ولا مزاد إعلانات. ومعظم الأعمال تتركها تذبل.',
    duties: [
      'يبني ويدير تسلسلاتك البريدية: سلسلة الترحيب، مسارات الرعاية، ومتابعة ما بعد الشراء',
      'يكتب نشرات يفتحها الناس فعلًا — القيمة أولًا والعرض ثانيًا',
      'يقسّم جمهورك ليصل العرض الصحيح إلى العميل الصحيح',
      'يؤتمت دورة الحياة: عميل جديد ← رعاية ← عرض ← استعادة',
      'يختبر عناوين الرسائل وأوقات الإرسال ويُبقي على الرابح',
      'يقيس الفتح والنقر — والرقم الوحيد المهم: الإيراد لكل إرسال',
    ],
    outcome: 'قناة مبيعات تملكها بالكامل، تعمل على قائمتك وأنت نائم.',
  },
  {
    key: 'raqib', name: 'رقيب', nameSub: 'Raqib', subLang: 'en', role: 'مراقب العمليات', icon: 'eye', accent: 'lead',
    specs: ['مراقبة 24/7', '3 مؤشرات: التشغيل · زمن الرد · معدل الأخطاء', 'تنبيه عند الانحراف عن الأساس', 'سجل تشغيلي حي', 'تصعيد عند الأعطال الحقيقية فقط'],
    problem: 'الأنظمة الآلية تتعطل بصمت. وتكتشف ذلك حين يشتكي عميل — وهي أغلى طريقة للاكتشاف.',
    duties: [
      'يراقب كل وكيل ونظام على مدار الساعة — الجاهزية، أزمنة الاستجابة، ومعدلات الأخطاء',
      'يرصد المشاكل لحظة ظهورها، قبل أن يلاحظها العملاء',
      'يتابع اتجاهات الأداء وينبهك حين ينحرف شيء عن خط الأساس',
      'ينسّق بين الوكلاء حتى لا يسقط أي عميل أثناء التسليمات (ليلى ← صقر، وصال ← صقر)',
      'يحتفظ بسجل تشغيلي حي: ما نُفّذ، ما نجح، وما يحتاج انتباهًا',
      'يصعّد للبشر فقط عند الحاجة الحقيقية — لا ضجيج ولا إنذارات كاذبة',
    ],
    outcome: 'تنام مطمئنًا لأن الآلة يحرسها ما لا ينام.',
  },
  {
    key: 'haris', name: 'حارس', nameSub: 'Haris', subLang: 'en', role: 'حارس الأمن والبيانات', icon: 'shield-check', accent: 'order',
    specs: ['تشفير أثناء النقل والتخزين', 'GDPR أوروبا + امتثال إقليمي للخليج', 'تحكم بالوصول لكل وكيل', 'قابل للتصدير والحذف · لا يُباع أبدًا', 'سجل تدقيق كامل'],
    problem: 'تسريب واحد للبيانات يهدم سنوات من الثقة. عملاء الخليج حساسون للخصوصية بحق — ومعظم المنشآت لا تملك جوابًا حين تُسأل: «هل بياناتي آمنة عندكم؟»',
    duties: [
      'يحرس كل محادثة وسجل عميل — مشفّرة أثناء النقل وفي التخزين',
      'يطبّق معايير حماية البيانات: GDPR لعمليات أوروبا والامتثال الإقليمي لأسواق الخليج',
      'يتحكم في من وما يمكنه الوصول لبيانات العملاء — بما في ذلك أي وكيل يرى أي معلومة',
      'يضمن ملكية البيانات: بيانات عملائك قابلة للتصدير والحذف، لا تُباع ولا تُستخدم للتدريب',
      'يحتفظ بسجلات تدقيق، فكل وصول محسوب وموثق',
      'يمنحك أنت الجواب الذي يُقنع كبار العملاء: «نعم، وهذه بالضبط طريقة حمايتها»',
    ],
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
