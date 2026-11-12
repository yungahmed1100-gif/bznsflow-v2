// Catalyst and Ascend offer online payment. Apex is scoped and quoted by request.
// Its industry examples describe potential custom work, not universally included capabilities.
// EN and AR side by side; consumed by TiersSection via pages/Home.jsx.

export const TIERS = [
  {
    key: 'catalyst',
    name: 'Catalyst',
    stage: 'Catch',
    available: true,
    problem: 'Inquiries go unanswered or arrive unqualified',
    intro:
      'Spend less time answering the same questions. Get customer details and the conversation together, ready for your next step.',
    insideLabel: 'What you gain',
    inside: [
      {
        agent: 'layla',
        name: 'Layla',
        description:
          'Customer needs and details in front of you. Less time repeating answers and collecting information on WhatsApp and Instagram.',
      },
      'Consistent answers based on the business information and prices you approve',
      'Customer needs collected through the questions you choose',
      'Conversations and customer details together, with less searching between chats',
      'Control when it matters: take over any conversation',
      'Customer data deletion on request',
    ],
    cta: 'Get my free audit',
  },
  {
    key: 'ascend',
    name: 'Ascend',
    stage: 'Convert',
    available: true,
    problem: 'Answered inquiries still need follow-up',
    intro:
      'Give customers a clear way to reach you, see where work stands and review offers ready for your decision. Less daily chasing, and email campaigns you approve.',
    insideLabel: 'What you gain',
    inside: [
      'Everything in Catalyst',
      {
        gift: true,
        label: 'Gift included',
        title: 'Free lead capture website',
        description: 'Present your services and collect customer inquiries.',
      },
      {
        agent: 'layla',
        name: 'Layla',
        description:
          'Customer needs and details in front of you. Less time repeating answers and collecting information.',
      },
      {
        agent: 'hasib',
        name: 'Hasib',
        description:
          'A clear view of progress, stalled work and recorded payments. Less time chasing updates and checking separate records.',
      },
      {
        agent: 'adiba',
        name: 'Adiba',
        description:
          'Quotes ready for your review, with pricing under your control. Less time drafting each offer from scratch.',
      },
      {
        agent: 'rasil',
        name: 'Rasil',
        description:
          'Keep in touch with subscribers and consenting customers through email campaigns you approve. Less time writing and sending each message yourself.',
      },
    ],
    cta: 'Contact us on WhatsApp',
  },
  {
    key: 'apex',
    name: 'Apex',
    stage: 'Control',
    available: true,
    byRequest: true,
    problem: 'You keep chasing stock, staff and unfinished jobs',
    intro:
      'When a sale needs a stock check, a branch handoff or your approval, work can stall between messages. We scope custom agents around that specific bottleneck, so your team has a clear next step and you spend less time chasing updates.',
    insideLabel: 'What this could look like in your business',
    scopeNote: 'Examples to scope with you. Systems, channels and deliverables are agreed before we build.',
    outcomeLabel: 'Target outcome',
    measureLabel: 'Measure the value',
    roiTitle: 'Work out the return before committing',
    roiDescription:
      'Use your own numbers: staff hours saved × hourly cost, plus gross profit from additional completed jobs. Compare that value with the agreed setup, running and provider costs. We scope the work and quote it with you.',
    inside: [
      'Everything in Ascend',
      {
        capability: 'erp',
        portrait: 'raqib',
        title: 'Building-material suppliers: quote with stock in view',
        description:
          'A contractor asks for 200 bags of cement. We can scope a connection to Odoo or your ERP to check agreed stock and price records and prepare a draft quote for approval, without staff copying details between WhatsApp and the system.',
        outcome: 'Less checking and re-entry before a quote is ready for your decision.',
        measure: 'Time per quote; stock-related quote corrections.',
      },
      {
        capability: 'branches',
        portrait: 'haris',
        title: 'Multi-branch garages: give every inquiry an owner',
        description:
          'A driver messages one branch, but the right technician works at another. We can scope routing by location and service, with a named person responsible and unanswered handoffs visible to the manager.',
        outcome: 'Fewer inquiries passed between branches without anyone taking responsibility.',
        measure: 'Unassigned inquiries; handoff time; confirmed jobs.',
      },
      {
        capability: 'workflows',
        portrait: 'rashid',
        title: 'Fit-out contractors: keep approvals moving',
        description:
          'A site supervisor sends a variation on WhatsApp. We can scope an agent to collect the job reference, photos and cost details, then send a complete request to the right approver and track its status.',
        outcome: 'Complete requests ready for your decision, with less chasing for missing details.',
        measure: 'Admin time per request; approval turnaround; stalled requests.',
      },
      {
        capability: 'channels',
        portrait: 'hatif',
        title: 'Car-rental businesses: capture after-hours requests',
        description:
          'A traveller calls after your desk closes. We can scope a voice intake that captures dates, vehicle needs and a callback number, then hands the request to your team. Voice availability and system access are confirmed during scoping.',
        outcome: 'A clear callback list for the next shift, ready for availability checks.',
        measure: 'Captured requests reached; confirmed rentals; gross profit from those rentals.',
      },
    ],
    cta: 'Request Apex',
    whatsappCta: 'Ask about Apex on WhatsApp',
  },
];

export const TIERS_AR = [
  {
    key: 'catalyst',
    name: 'كاتاليست',
    stage: 'الالتقاط',
    available: true,
    problem: 'استفسارات بلا رد أو تصل غير مؤهلة',
    intro: 'وقت أقل في الإجابة عن الأسئلة المتكررة. تفاصيل العميل والمحادثة أمامك، لتبدأ من الخطوة التالية.',
    insideLabel: 'ما تكسبه أنت',
    inside: [
      {
        agent: 'layla',
        name: 'ليلى',
        description: 'احتياج العميل وتفاصيله أمامك. توفّر وقت الردود المتكررة وجمع المعلومات على واتساب وإنستغرام.',
      },
      'إجابات متّسقة من معلومات نشاطك وأسعارك المعتمدة',
      'احتياجات العميل تُجمع بالأسئلة التي تختارها',
      'المحادثات وتفاصيل العملاء معاً، لتقلّل البحث بين الرسائل',
      'التحكّم بيدك: استلم أي محادثة عندما تحتاج',
      'حذف بيانات العميل عند الطلب',
    ],
    cta: 'احصل على التدقيق المجاني',
  },
  {
    key: 'ascend',
    name: 'أسيند',
    stage: 'التحويل',
    available: true,
    problem: 'استفسارات مُجابة ما زالت تحتاج متابعة',
    intro:
      'طريق واضح للعميل ليصل إليك، وصورة واضحة لتقدّم العمل، وعروض جاهزة لقرارك. متابعة يومية أقل، وحملات بريد إلكتروني تعتمدها أنت.',
    insideLabel: 'ما تكسبه أنت',
    inside: [
      'كل ما في كاتاليست',
      {
        gift: true,
        label: 'هدية مع الباقة',
        title: 'موقع مجاني لجمع بيانات العملاء المحتملين',
        description: 'يعرض خدماتك ويستقبل استفساراتهم.',
      },
      {
        agent: 'layla',
        name: 'ليلى',
        description: 'احتياج العميل وتفاصيله أمامك. توفّر وقت الردود المتكررة وجمع المعلومات.',
      },
      {
        agent: 'hasib',
        name: 'حاسب',
        description:
          'تعرف أين وصل العمل، وما تعطّل، وما سُجّل من دفعات. تقلّل وقت ملاحقة التحديثات والبحث بين السجلات.',
      },
      {
        agent: 'adiba',
        name: 'أديبة',
        description: 'عروض أسعار جاهزة لمراجعتك، والقرار بالسعر لك. توفّر وقت صياغة كل عرض من البداية.',
      },
      {
        agent: 'rasil',
        name: 'راسل',
        description:
          'تواصل مستمر مع المشتركين والعملاء الموافقين عبر حملات بريد تعتمدها أنت. توفّر وقت كتابة كل رسالة وإرسالها يدوياً.',
      },
    ],
    cta: 'تواصل معنا على واتساب',
  },
  {
    key: 'apex',
    name: 'أبيكس',
    stage: 'السيطرة',
    available: true,
    byRequest: true,
    problem: 'يومك يضيع في متابعة المخزون والموظفين والمهام المتأخرة',
    intro:
      'البيعة تنتظر تأكيد المخزون، والطلب ينتقل بين الفروع، والعمل يتوقّف على موافقتك. نحدّد معك أين يتعطّل العمل ونبني وكلاء لهذه المهمة، ليعرف فريقك الخطوة التالية ويقلّ وقتك في ملاحقة التحديثات.',
    insideLabel: 'كيف يمكن أن يخدم نشاطك',
    scopeNote: 'أمثلة ندرسها معك. نتّفق على الأنظمة والقنوات والتسليمات قبل البناء.',
    outcomeLabel: 'النتيجة المستهدفة',
    measureLabel: 'كيف تقيس القيمة',
    roiTitle: 'احسب العائد قبل الالتزام',
    roiDescription:
      'بأرقام نشاطك: ساعات العمل التي توفّرها × تكلفة الساعة، مع إجمالي ربح الأعمال الإضافية المنجزة. قارن هذه القيمة بتكاليف التأسيس والتشغيل ومزوّدي الخدمة المتّفق عليها. نحدّد النطاق والسعر معك.',
    inside: [
      'كل ما في أسيند',
      {
        capability: 'erp',
        portrait: 'raqib',
        title: 'مورّدو مواد البناء: عرض سعر والمخزون أمامك',
        description:
          'مقاول يسأل عن ٢٠٠ كيس إسمنت. يمكننا تصميم ربط مع Odoo أو نظامك للتحقّق من سجلات المخزون والأسعار المتّفق عليها وتجهيز مسودة عرض لموافقتك، دون نسخ التفاصيل بين واتساب والنظام.',
        outcome: 'وقت أقل في التحقّق وإعادة الإدخال قبل أن يصبح العرض جاهزاً لقرارك.',
        measure: 'وقت تجهيز العرض؛ تصحيحات العروض بسبب المخزون.',
      },
      {
        capability: 'branches',
        portrait: 'haris',
        title: 'ورش متعددة الفروع: مسؤول واضح عن كل استفسار',
        description:
          'عميل يراسل فرعاً، والفنّي المناسب في فرع آخر. يمكننا تصميم توزيع حسب الموقع والخدمة، مع مسؤول محدّد عن كل طلب وإظهار التحويلات التي لم يُردّ عليها لمدير الفرع.',
        outcome: 'استفسارات أقل تتنقّل بين الفروع دون أن يتولّاها أحد.',
        measure: 'الاستفسارات بلا مسؤول؛ وقت التحويل؛ الأعمال المؤكّدة.',
      },
      {
        capability: 'workflows',
        portrait: 'rashid',
        title: 'مقاولو التشطيبات: طلبات مكتملة للموافقة',
        description:
          'مشرف الموقع يرسل طلب تعديل على واتساب. يمكننا تصميم وكيل يجمع رقم المشروع والصور وتفاصيل التكلفة، ثم يرفع طلباً مكتملاً للمسؤول عن الموافقة ويتابع حالته.',
        outcome: 'طلبات جاهزة لقرارك، ووقت أقل في ملاحقة التفاصيل الناقصة.',
        measure: 'وقت تجهيز الطلب؛ مدة انتظار الموافقة؛ الطلبات المتوقّفة.',
      },
      {
        capability: 'channels',
        portrait: 'hatif',
        title: 'تأجير السيارات: سجّل طلبات ما بعد الدوام',
        description:
          'مسافر يتّصل بعد إغلاق المكتب. يمكننا دراسة استقبال صوتي يجمع التواريخ ونوع السيارة ورقم التواصل، ثم يسلّم الطلب لفريقك. نتحقّق من إتاحة الصوت والربط بنظامك عند تحديد النطاق.',
        outcome: 'قائمة واضحة للفترة التالية للتواصل والتحقّق من توافر السيارات.',
        measure: 'الطلبات التي تواصلتم معها؛ الحجوزات المؤكّدة؛ إجمالي ربحها.',
      },
    ],
    cta: 'اطلب أبيكس',
    whatsappCta: 'اسأل عن أبيكس على واتساب',
  },
];
