// What each Media KPI is called and how it is calculated, in the owner's words (ascend/media.md).
// Windows and allowances come from Settings, so every definition names its values.
export const MEDIA_METRICS = {
  on_time_delivery: {
    en: 'On-time final delivery', ar: 'التسليم النهائي في الموعد',
    def: (s, ar) => ar ? 'الإنتاجات التي سُلّمت بحلول موعدها المعتمد ÷ الإنتاجات المستحقة في الفترة، ومنها المتأخرة التي لم تُسلّم بعد. يُستبعد الإلغاء بسبب مسجّل ويظهر منفصلاً، ويبقى الموعد الأصلي محفوظاً. الوحدة هي الإنتاج (تُسلّم مخرجاته معاً).'
      : 'Productions handed over by their approved due date ÷ productions due in the period, including overdue ones not yet delivered. A cancellation with a recorded reason is left out and shown separately; the original due date is kept. The unit is the production (its deliverables are handed over together).',
    owner: ['Producer · weekly', 'المنتج · أسبوعياً'],
  },
  approval_wait: {
    en: 'Approval wait', ar: 'انتظار الاعتماد',
    def: (s, ar) => ar ? 'الوسيط وP90 للوقت من إرسال النسخة للمراجعة حتى قرار العميل عليها، للنسخ التي حُسمت في الفترة. عمر النسخ المعلقة حالياً يظهر منفصلاً.'
      : 'Median and 90th percentile from sending a cut for review to the client’s decision on that exact version, for cuts decided in the period. The age of cuts still pending is shown separately.',
    owner: ['Producer · daily', 'المنتج · يومياً'],
  },
  revision_overrun: {
    en: 'Revision overrun', ar: 'تجاوز جولات التعديل',
    def: (s, ar) => ar ? `الإنتاجات التي تجاوزت جولات التعديل المشمولة ÷ الإنتاجات التي دخلت المراجعة في الفترة واكتملت نافذتها (${s.revisionWindowDays} يوماً أو الاعتماد). أوامر التغيير المدفوعة تظهر منفصلة.`
      : `Productions that used more revision rounds than included ÷ productions that entered review in the period and have matured (${s.revisionWindowDays} days, or accepted). Paid change orders are shown separately.`,
    owner: ['Creative operations lead · weekly', 'مسؤول العمليات الإبداعية · أسبوعياً'],
  },
  project_contribution: {
    en: 'Project contribution', ar: 'مساهمة المشروع',
    def: (s, ar) => ar ? 'إيراد الطلبات الصافي (بدون ضريبة) للإنتاجات المسلّمة في الفترة، شاملاً أوامر التغيير المعتمدة، ناقص التكاليف المباشرة المسجّلة (الطاقم، المعدات، الموقع، التراخيص، السفر، المونتاج، الخدمات الخارجية). يبقى الرقم «غير مكتمل» حتى تُؤكَّد التكاليف. ليس صافي ربح محاسبي.'
      : 'Net order revenue (excluding VAT) of productions delivered in the period, including approved change orders, minus recorded direct costs (crew, equipment, location, licensing, travel, editing, outsourced). It stays “incomplete” until the costs are confirmed. Not accounting net profit.',
    owner: ['Owner · weekly', 'المالك · أسبوعياً'],
  },
  quote_to_booked: {
    en: 'Quote-to-booked conversion', ar: 'التحويل من عرض سعر إلى حجز',
    def: (s, ar) => ar ? `العروض التي حُجزت (قبول ودفعة مقدمة وحجوزات مؤكدة) خلال ${s.quoteWindowDays} يوماً ÷ العروض الصادرة في الفترة التي اكتملت نافذتها.`
      : `Quotes booked (accepted, deposit received, holds confirmed) within ${s.quoteWindowDays} days ÷ quotes issued in the period whose window has passed.`,
    owner: ['Sales / producer · monthly', 'المبيعات / المنتج · شهرياً'],
  },
  shoot_readiness: {
    en: 'Shoot readiness', ar: 'جاهزية التصوير',
    def: (s, ar) => ar ? `بنود التحضير التي تحقق منها شخص بحلول نقطة الجاهزية (قبل التصوير بـ ${s.prepCutoffHours} ساعة) ÷ كل البنود المستحقة عندها، للتصويرات المحجوزة. البنود الحرجة الناقصة تظهر منفصلة.`
      : `Preparation items someone verified by the readiness checkpoint (${s.prepCutoffHours} hours before the shoot) ÷ all items due at it, for booked shoots. Missing critical items are shown separately.`,
    owner: ['Producer · daily before shoot', 'المنتج · يومياً قبل التصوير'],
  },
  committed_utilization: {
    en: 'Crew / resource committed utilisation', ar: 'الاستخدام الملتزم للطاقم والموارد',
    def: (s, ar) => ar ? `ساعات الحجوزات المؤكدة ÷ الساعات المتاحة (الموارد النشطة × ${s.resourceHoursPerDay} ساعات × أيام العمل من الأحد إلى الخميس). الحجوزات المبدئية تظهر منفصلة ولا تُحتسب.`
      : `Confirmed booking hours ÷ available hours (active resources × ${s.resourceHoursPerDay} hours × Sunday–Thursday working days). Tentative holds are shown separately and never counted.`,
    owner: ['Production manager · weekly', 'مدير الإنتاج · أسبوعياً'],
  },
  unapproved_extra_scope: {
    en: 'Unapproved extra-scope cost', ar: 'تكلفة نطاق إضافي غير معتمد',
    def: (s, ar) => ar ? 'حتى الآن: مجموع التكاليف الفعلية والملتزم بها لعمل إضافي بلا أمر تغيير معتمد أو معفى. لا تُحتسب التكلفة مرتين.'
      : 'As of now: the actual and committed costs of extra work with no approved or waived change order behind it. No cost is counted twice.',
    owner: ['Owner · weekly', 'المالك · أسبوعياً'],
  },
};
