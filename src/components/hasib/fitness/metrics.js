// What each Fitness KPI is called and how it is calculated, in the owner's words (ascend/fitness.md).
// Windows come from Settings → Follow-up rules, so every definition names its values.
export const FITNESS_METRICS = {
  trial_to_member: {
    en: 'Trial-to-member conversion', ar: 'التحويل من تجربة إلى عضوية',
    def: (s, ar) => ar ? `التجارب التي حضرها أصحابها وتبعتها أول عضوية مدفوعة خلال ${s.conversionWindowDays} يوماً ÷ التجارب المحضورة التي اكتملت نافذتها. التجديد لا يُحتسب تحويلاً.`
      : `Attended trials followed by a first paid membership within ${s.conversionWindowDays} days ÷ attended trials whose window has matured. A renewal is never a conversion.`,
    owner: ['Sales lead · weekly', 'مسؤول المبيعات · أسبوعياً'],
  },
  membership_renewal: {
    en: 'Membership renewal', ar: 'تجديد العضوية',
    def: (s, ar) => ar ? 'العضويات المنتهية التي جُدِّدت ودُفعت بحلول نهاية فترة السماح ÷ العضويات التي انتهت في الفترة واكتملت فترة سماحها. التجميد يؤخر تاريخ الانتهاء.'
      : 'Memberships renewed and paid by the end of their grace period ÷ memberships that ended in the period with grace passed. A freeze moves the end date.',
    owner: ['Membership lead · weekly', 'مسؤول العضويات · أسبوعياً'],
  },
  attendance_gap: {
    en: 'Members with an attendance gap', ar: 'أعضاء انقطعوا عن الحضور',
    def: (s, ar) => ar ? `حتى الآن: الأعضاء النشطون غير المجمّدين، بعد ${s.minObservationDays} يوماً من بدايتهم، بلا زيارة مسجلة منذ ${s.gapDays} يوماً. المجمّدون مستبعدون ويظهرون منفصلين، ونهاية التجميد تُعد بداية جديدة للعدّ.`
      : `As of now: active, non-frozen members, past their first ${s.minObservationDays} days, with no recorded visit for ${s.gapDays} days. Frozen members are left out and shown separately; the end of a freeze restarts the clock.`,
    owner: ['Member success lead · daily', 'مسؤول نجاح الأعضاء · يومياً'],
  },
  class_occupancy: {
    en: 'Class attended occupancy', ar: 'إشغال الحصص بالحضور',
    def: (s, ar) => ar ? 'المقاعد التي حضرها أصحابها ÷ المقاعد المتاحة في الحصص المنعقدة في الفترة. الحصة الملغاة تخرج من الطرفين.'
      : 'Attended seats ÷ available seats across classes held in the period. A cancelled class leaves both sides.',
    owner: ['Program lead · weekly', 'مسؤول البرامج · أسبوعياً'],
  },
  opening_retention: {
    en: 'Opening-cohort retention', ar: 'الاحتفاظ بفوج البداية',
    def: (s, ar) => ar ? 'الأعضاء النشطون في بداية الفترة وما زالوا نشطين في نهايتها (بما في ذلك عبر التجديد) ÷ الأعضاء النشطين في بدايتها. المجمّد يُحتسب محتفظاً به ويظهر منفصلاً.'
      : 'Members active at the start of the period still active at its end (including through a renewal) ÷ members active at the start. A frozen member counts as retained and is shown separately.',
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  net_growth: {
    en: 'Membership net growth', ar: 'صافي نمو العضويات',
    def: (s, ar) => ar ? 'الأعضاء الجدد والعائدون ناقص من انتهت عضويتهم دون تجديد أو ألغوها في الفترة، مع نسبة إلى قاعدة البداية. التجديد لا يُحتسب عضواً جديداً.'
      : 'New plus returning members, minus memberships cancelled or lapsed without renewal in the period, with the rate of the opening base. A renewal is not a new member.',
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  recurring_revenue: {
    en: 'Recurring membership revenue', ar: 'إيراد العضويات المتكرر',
    def: (s, ar) => ar ? 'حتى الآن: الرسوم الشهرية المعادلة للعضويات النشطة (السعر ÷ أشهر الفوترة)، دون الضريبة. معدل تشغيل لا إيراد محقق؛ المجمّدون مستبعدون ويظهرون منفصلين.'
      : 'As of now: the monthly-equivalent fee of active memberships (price ÷ billing months). A run rate, not recognised revenue; frozen members are left out and shown separately.',
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  no_show: {
    en: 'Class no-show rate', ar: 'نسبة عدم الحضور',
    def: (s, ar) => ar ? 'المقاعد المسجلة «لم يحضر» ÷ المقاعد ذات النتيجة المسجلة في الحصص المنعقدة في الفترة. الحضور غير المسجل يبقى غير معروف ولا يُحتسب.'
      : 'Seats marked no-show ÷ seats with a recorded outcome in classes held in the period. An unrecorded check-in stays unknown and is not counted.',
    owner: ['Program lead · weekly', 'مسؤول البرامج · أسبوعياً'],
  },
};
