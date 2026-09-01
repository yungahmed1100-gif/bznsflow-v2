// Packaged plans — Catch → Convert → Dominate ladder, with published pricing.
// EN + AR variants; consumed by TiersSection via pages/Home.jsx.

// Which roster agents each tier adds, by `key` in data/agents.js. Tiers never
// hard-code an agent name — the card renders the name and role straight from
// the roster, so the two can't drift apart the way Khaled/Mahmood/ARIA/Ali did.
// Cumulative, matching the "Everything in X, plus" convention: a tier lists
// only the agents it adds on top of the one below it.
const TIER_AGENTS = {
  catalyst: ['layla'],
  ascend: ['hatif', 'haris', 'hasib'],
  apex: ['raqib', 'wisal', 'saqr', 'rashid'],
};

// Demand generation — these fill the funnel rather than work it, so they sit
// beside the ladder as an add-on instead of inside a tier whose bottleneck is
// about inquiries already coming in.
export const GROWTH_AGENTS = ['samira', 'adiba', 'dalil', 'rasil'];

// Published pricing: a monthly subscription plus a one-time setup fee, no
// annual commitment. OMR is what we invoice; the USD figures are the pegged
// equivalent (1 OMR = 2.6008 USD) shown for visitors outside Oman. Kept here
// rather than in the tier objects so EN and AR can never quote different
// numbers — if the peg moves, this is the only block to touch.
const TIER_PRICING = {
  catalyst: { monthly: 40, setup: 70, monthlyUsd: 104, setupUsd: 182 },
  ascend: { monthly: 120, setup: 210, monthlyUsd: 312, setupUsd: 546 },
  apex: { monthly: 300, setup: 525, monthlyUsd: 780, setupUsd: 1365 },
};

export const TIERS = [
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
      'Every WhatsApp enquiry answered in seconds, 24/7, in your customers’ language',
      'Automatic enquiry capture straight into your pipeline',
      'Basic qualification — know who’s serious before you follow up',
      'Covers one service line or business area',
      'Hands anything that needs a human straight to you — never oversteps',
    ],
    agents: TIER_AGENTS.catalyst,
    pricing: TIER_PRICING.catalyst,
    roiReplaces: 'A part-time receptionist',
    roiLine: 'Less per month than a single day of a receptionist’s salary — and it covers every night, weekend, and holiday. The setup fee builds it around your business once; after that it just runs.',
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
      'Inbound calls answered by AI voice — first ring, every time, no call left in voicemail',
      'Automated multi-touch follow-up that nurtures until the appointment lands in your calendar',
      'Live dashboard with de-duplicated records and hot/warm/cold scoring on every lead',
      'A daily evening report, KPI tracking, and an alert the moment an enquiry needs a human',
      'Multiple service lines + full multi-language coverage',
    ],
    agents: TIER_AGENTS.ascend,
    pricing: TIER_PRICING.ascend,
    roiReplaces: 'A CRM build, a lead-gen website, and reporting retainers',
    roiLine: 'One monthly fee instead of three separate invoices — a website build, a CRM, and a reporting retainer would each cost more than this on their own. The setup fee covers the build; the follow-up compounds every month it runs.',
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
      'Automatic routing and assignment across your team, watched 24/7',
      'Multiple AI agents tuned per service line or per location',
      'Proactive outbound that reactivates dormant customers and old lead lists',
      'Deal-closing support on hot leads, plus a growth plan reviewed each quarter',
      'Priority response, priority support, advanced team reporting, and white-glove setup',
    ],
    agents: TIER_AGENTS.apex,
    pricing: TIER_PRICING.apex,
    roiReplaces: 'A full agency retainer plus a sales-ops hire',
    roiLine: 'A fraction of one sales-ops salary, covering routing, reporting, and outbound across every branch and every service line. The setup fee tunes it per location once, then it runs on your team.',
    payback: 'One reactivated customer',
    pull: 'For multi-location and multi-team businesses where enquiries can’t fall through the cracks.',
    nextStep: null,
    cta: 'Get Apex on WhatsApp',
  },
];

export const TIERS_AR = [
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
      'رد على كل استفسار واتساب في ثوانٍ، 24/7، بلغة عملائك',
      'التقاط آلي للاستفسارات مباشرة في مسارك',
      'تأهيل أساسي — تعرف من هو الجاد قبل أن تتابع',
      'يغطّي خط خدمة أو مجال عمل واحد',
      'يُسلّم أي شيء يحتاج إنساناً إليك مباشرة — دون تجاوز',
    ],
    agents: TIER_AGENTS.catalyst,
    pricing: TIER_PRICING.catalyst,
    roiReplaces: 'موظف استقبال بدوام جزئي',
    roiLine: 'شهرياً أقل من أجر يوم واحد لموظف استقبال — ويغطّي كل ليلة وعطلة وإجازة. رسوم الإعداد تبنيه حول أعمالك مرة واحدة، وبعدها يعمل وحده.',
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
      'رد صوتي ذكي على المكالمات الواردة — من أول رنة، ولا مكالمة تذهب للبريد الصوتي',
      'متابعة آلية متعددة اللمسات ترعى العميل حتى يستقر الموعد في تقويمك',
      'لوحة حيّة بسجلات منزوعة التكرار وتصنيف ساخن/دافئ/بارد لكل عميل',
      'تقرير يومي كل مساء، تتبّع المؤشرات، وتنبيه فور حاجة الاستفسار إلى إنسان',
      'خطوط خدمة متعددة + تغطية كاملة متعددة اللغات',
    ],
    agents: TIER_AGENTS.ascend,
    pricing: TIER_PRICING.ascend,
    roiReplaces: 'بناء CRM وموقع لجذب العملاء وباقات تقارير',
    roiLine: 'رسم شهري واحد بدل ثلاث فواتير منفصلة — بناء موقع، ونظام CRM، وباقة تقارير، كل واحد منها يكلّف أكثر من هذا وحده. رسوم الإعداد تغطي البناء، والمتابعة تتراكم كل شهر يعمل فيه.',
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
      'توجيه وتعيين آلي عبر فريقك، تحت مراقبة 24/7',
      'وكلاء ذكاء اصطناعي متعددون مُهيَّأون لكل خط خدمة أو فرع',
      'تواصل صادر استباقي يعيد تنشيط العملاء الخاملين وقوائم العملاء القديمة',
      'دعم إغلاق الصفقات على العملاء الساخنين، مع خطة نمو تُراجَع كل ربع',
      'استجابة بأولوية، دعم بأولوية، تقارير فريق متقدمة، وإعداد فاخر',
    ],
    agents: TIER_AGENTS.apex,
    pricing: TIER_PRICING.apex,
    roiReplaces: 'باقة وكالة كاملة مع توظيف عمليات مبيعات',
    roiLine: 'جزء بسيط من راتب موظف عمليات مبيعات واحد، يغطّي التوجيه والتقارير والتواصل الصادر عبر كل فرع وكل خط خدمة. رسوم الإعداد تُهيّئه لكل موقع مرة واحدة، ثم يعمل مع فريقك.',
    payback: 'عميل واحد مُعاد تنشيطه',
    pull: 'للأعمال متعددة الفروع والفِرَق حيث لا يمكن أن تسقط الاستفسارات بين الشقوق.',
    nextStep: null,
    cta: 'احصل على أبيكس عبر واتساب',
  },
];
