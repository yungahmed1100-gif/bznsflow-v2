// The three plans, shown without prices (Ahmed, 2026-10-09). Catalyst and Ascend are available
// (Ascend from 2026-10-12, by Ahmed's grant only: its CTA is a WhatsApp conversation, not self-serve).
// Ascend includes a free lead capture website as a gift; Rasil email marketing is coming soon. Apex is in preparation.
// EN and AR side by side; consumed by TiersSection via pages/Home.jsx.

export const TIERS = [
  {
    key: 'catalyst',
    name: 'Catalyst',
    stage: 'Catch',
    available: true,
    problem: 'Inquiries go unanswered or arrive unqualified',
    intro: 'Spend less time answering the same questions. Get customer details and the conversation together, ready for your next step.',
    insideLabel: 'What you gain',
    inside: [
      { agent: 'layla', name: 'Layla', description: 'Customer needs and details in front of you. Less time repeating answers and collecting information on WhatsApp and Instagram.' },
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
    intro: 'Give customers a clear way to reach you, see where work stands and review offers ready for your decision. Less daily chasing, with email marketing coming soon.',
    insideLabel: 'What you gain',
    inside: [
      'Everything in Catalyst',
      { gift: true, label: 'Gift included', title: 'Free lead capture website', description: 'Present your services and collect customer inquiries.' },
      { agent: 'layla', name: 'Layla', description: 'Customer needs and details in front of you. Less time repeating answers and collecting information.' },
      { agent: 'hasib', name: 'Hasib', description: 'A clear view of progress, stalled work and recorded payments. Less time chasing updates and checking separate records.' },
      { agent: 'adiba', name: 'Adiba', description: 'Quotes ready for your review, with pricing under your control. Less time drafting each offer from scratch.' },
      { agent: 'rasil', name: 'Rasil', status: 'Coming soon', description: 'Keep in touch with subscribers and consenting customers through email campaigns you approve. Less time writing and sending each message yourself.' },
    ],
    cta: 'Contact us on WhatsApp',
  },
  {
    key: 'apex',
    name: 'Apex',
    stage: 'Control',
    available: false,
    problem: 'Inquiries spread across staff and branches',
    intro: 'For teams and branches that share one customer flow. In preparation: we will define it with the businesses that need it.',
    cta: 'Ask about Apex',
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
      { agent: 'layla', name: 'ليلى', description: 'احتياج العميل وتفاصيله أمامك. توفّر وقت الردود المتكررة وجمع المعلومات على واتساب وإنستغرام.' },
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
    intro: 'طريق واضح للعميل ليصل إليك، وصورة واضحة لتقدّم العمل، وعروض جاهزة لقرارك. متابعة يومية أقل، وتسويق بالبريد الإلكتروني قريباً.',
    insideLabel: 'ما تكسبه أنت',
    inside: [
      'كل ما في كاتاليست',
      { gift: true, label: 'هدية مع الباقة', title: 'موقع مجاني لجمع بيانات العملاء المحتملين', description: 'يعرض خدماتك ويستقبل استفساراتهم.' },
      { agent: 'layla', name: 'ليلى', description: 'احتياج العميل وتفاصيله أمامك. توفّر وقت الردود المتكررة وجمع المعلومات.' },
      { agent: 'hasib', name: 'حاسب', description: 'تعرف أين وصل العمل، وما تعطّل، وما سُجّل من دفعات. تقلّل وقت ملاحقة التحديثات والبحث بين السجلات.' },
      { agent: 'adiba', name: 'أديبة', description: 'عروض أسعار جاهزة لمراجعتك، والقرار بالسعر لك. توفّر وقت صياغة كل عرض من البداية.' },
      { agent: 'rasil', name: 'راسل', status: 'قريباً', description: 'تواصل مستمر مع المشتركين والعملاء الموافقين عبر حملات بريد تعتمدها أنت. توفّر وقت كتابة كل رسالة وإرسالها يدوياً.' },
    ],
    cta: 'تواصل معنا على واتساب',
  },
  {
    key: 'apex',
    name: 'أبيكس',
    stage: 'السيطرة',
    available: false,
    problem: 'استفسارات موزّعة بين الموظفين والفروع',
    intro: 'للفرق والفروع التي تتشارك تدفق العملاء نفسه. قيد الإعداد: نحدّدها مع الأعمال التي تحتاجها.',
    cta: 'اسأل عن أبيكس',
  },
];
