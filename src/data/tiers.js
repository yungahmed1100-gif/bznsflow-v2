// The three plans, shown without prices (Ahmed, 2026-10-09). Catalyst and Ascend are available
// (Ascend from 2026-10-12, by Ahmed's grant only: its CTA is a WhatsApp conversation, not self-serve).
// Ascend's card says what each agent does, stated only as the code does it. Apex is in preparation.
// EN and AR side by side; consumed by TiersSection via pages/Home.jsx.

export const TIERS = [
  {
    key: 'catalyst',
    name: 'Catalyst',
    stage: 'Catch',
    available: true,
    problem: 'Inquiries go unanswered or arrive unqualified',
    intro: 'Layla answers your WhatsApp and Instagram inquiries from the facts you approve, asks your qualifying questions, and hands each inquiry to you ready for your next step.',
    insideLabel: 'What Catalyst covers',
    inside: [
      'Layla on WhatsApp and/or Instagram',
      'Answers only from your approved business facts and catalog',
      'Your qualifying questions, one at a time',
      'Every chat and customer record in your dashboard',
      'Take over any conversation yourself, any time',
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
    intro: 'Three agents on one record: Layla answers, Hasib runs the work in your sector’s workspace, and Adiba prepares the offers you approve. Every inquiry is followed to a recorded result.',
    insideLabel: 'What each agent does',
    inside: [
      'Everything in Catalyst',
      'Layla: answers from your approved facts, asks your qualifying questions and records whether each inquiry is qualified',
      'Hasib: tracks each job from inquiry to payment, flags what is stuck and sends the reminders you set to automatic',
      'Adiba: drafts the quotes and offers that need you; a price reaches a customer only from your catalog or your approval',
      'For retail, phones and electronics, dental, real estate, construction, automotive, fitness and media',
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
    intro: 'ليلى ترد على استفسارات واتساب وإنستغرام من المعلومات التي تعتمدها أنت، وتسأل أسئلة التأهيل التي تحددها، وتسلّمك كل استفسار جاهزاً لخطوتك التالية.',
    insideLabel: 'ما يشمله كاتاليست',
    inside: [
      'ليلى على واتساب و/أو إنستغرام',
      'إجابات من معلومات نشاطك وكتالوجك المعتمدة فقط',
      'أسئلة التأهيل الخاصة بك، سؤالاً في كل مرة',
      'كل محادثة وسجل كل عميل في لوحتك',
      'تستلم أي محادثة بنفسك في أي وقت',
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
    intro: 'ثلاثة وكلاء على سجل واحد: ليلى ترد، وحاسب يدير العمل في مساحة قطاعك، وأديبة تُعدّ العروض التي تعتمدها. كل استفسار يُتابَع حتى نتيجة مسجّلة.',
    insideLabel: 'ما يفعله كل وكيل',
    inside: [
      'كل ما في كاتاليست',
      'ليلى: ترد من معلوماتك المعتمدة، وتسأل أسئلة التأهيل الخاصة بك، وتسجّل هل الاستفسار مؤهل',
      'حاسب: يتابع كل عمل من الاستفسار حتى الدفع، وينبّه لما تعطّل، ويرسل التذكيرات التي جعلتها تلقائية',
      'أديبة: تُعدّ العروض والأسعار التي تحتاج قرارك؛ لا يصل سعر إلى العميل إلا من كتالوجك أو باعتمادك',
      'للتجزئة، والهواتف والإلكترونيات، وعيادات الأسنان، والعقارات، والمقاولات، والسيارات، واللياقة، والإنتاج الإعلامي',
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
