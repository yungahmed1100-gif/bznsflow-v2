// The three plans, shown without prices (Ahmed, 2026-10-09). Catalyst is the one on offer today;
// Ascend and Apex are in preparation, so their cards name the problem they will solve and nothing
// more: no inclusions, agents, voice or prices (vault: Pricing, Decisions/2026-10-09-Show-All-Plans-Without-Prices).
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
    available: false,
    problem: 'Answered inquiries still need follow-up',
    intro: 'For businesses whose next problem is what happens after the first answer. In preparation: we will define it with the businesses that need it.',
    cta: 'Ask about Ascend',
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
    available: false,
    problem: 'استفسارات مُجابة ما زالت تحتاج متابعة',
    intro: 'للأعمال التي تبدأ مشكلتها بعد الرد الأول. قيد الإعداد: نحدّدها مع الأعمال التي تحتاجها.',
    cta: 'اسأل عن أسيند',
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
