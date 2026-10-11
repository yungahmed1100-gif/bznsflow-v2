// What each dental KPI is called and how it is calculated, in the owner's words (ascend/dental.md).
// Windows come from Settings → Follow-up rules, so every definition names its values.
export const DENTAL_METRICS = {
  visit_attendance: {
    en: 'Visit attendance', ar: 'حضور الزيارات',
    def: (s, ar) => ar ? 'الزيارات التي حضرها المريض أو اكتملت ÷ الزيارات المستحقة في الفترة ذات النتيجة المسجلة. الاكتمال بعد الحضور لا يُحتسب مرتين، والزيارة بلا نتيجة تبقى غير معروفة وتظهر منفصلة.'
      : 'Arrived or completed visits ÷ due visits in the period with a recorded outcome. Completed after arrived counts once; a visit with no outcome stays unknown and is shown separately.',
    owner: ['Reception lead · daily', 'مسؤول الاستقبال · يومياً'],
  },
  missed_visits: {
    en: 'Missed visits', ar: 'الزيارات الفائتة',
    def: (s, ar) => ar ? 'الزيارات المنتهية التي سُجلت صراحةً «فائتة». الزيارة غير المسجلة لا تُعد فائتة.' : 'Past visits explicitly recorded as missed. An unrecorded visit is never counted as missed.',
    owner: ['Reception lead · daily', 'مسؤول الاستقبال · يومياً'],
  },
  followups_due: {
    en: 'Follow-ups due', ar: 'المتابعات المستحقة',
    def: (s, ar) => ar ? 'حتى الآن: مهام المتابعة المفتوحة التي حلّ موعدها.' : 'As of now: open follow-up tasks whose due time has passed.',
    owner: ['Reception lead · daily', 'مسؤول الاستقبال · يومياً'],
  },
  overdue_balances: {
    en: 'Overdue visit balances', ar: 'أرصدة الزيارات المتأخرة',
    def: (s, ar) => ar ? `حتى الآن: مجموع الأرصدة الموجبة على رسوم الزيارات التي تجاوزت موعد استحقاقها (${s.balanceDueDays} أيام بعد الزيارة). الرصيد المتنازع عليه مستبعد ويظهر منفصلاً.`
      : `As of now: the sum of positive visit-charge balances past their due date (${s.balanceDueDays} days after the visit). A disputed balance is left out and shown separately.`,
    owner: ['Practice manager · daily', 'مدير العيادة · يومياً'],
  },
  chair_utilization: {
    en: 'Available-chair utilization', ar: 'استخدام الكراسي المتاحة',
    def: (s, ar) => ar ? `دقائق الزيارات المحضورة ÷ دقائق الكراسي المتاحة (الكراسي النشطة × ${s.chairDayMinutes} دقيقة × ${s.openDaysPerWeek} أيام عمل أسبوعياً). من الساعات المضبوطة، لا من تقويم الكراسي.`
      : `Attended visit minutes ÷ staffed chair minutes (active chairs × ${s.chairDayMinutes} minutes × ${s.openDaysPerWeek} open days a week). From configured hours, not a chair calendar.`,
    owner: ['Practice manager · weekly', 'مدير العيادة · أسبوعياً'],
  },
  late_cancellation: {
    en: 'Late-cancellation rate', ar: 'نسبة الإلغاء المتأخر',
    def: (s, ar) => ar ? `الزيارات الملغاة خلال ${s.lateCancelHours} ساعة قبل موعدها ÷ الزيارات المحجوزة للفترة. يُثبَّت التأخر لحظة الإلغاء.`
      : `Visits cancelled within ${s.lateCancelHours} hours of their time ÷ visits booked for the period. Lateness is fixed when the cancellation is recorded.`,
    owner: ['Reception lead · weekly', 'مسؤول الاستقبال · أسبوعياً'],
  },
  recall_completion: {
    en: 'Recall completion', ar: 'إتمام المراجعات',
    def: (s, ar) => ar ? `مواعيد المراجعة التي حددها الطبيب وتبعتها زيارة مكتملة خلال ${s.recallWindowDays} يوماً ÷ المواعيد التي اكتملت نافذتها. لا مواعيد مقترحة آلياً.`
      : `Clinician-set recall dates followed by a completed visit within ${s.recallWindowDays} days ÷ recall dates whose window has matured. No recall date is ever suggested.`,
    owner: ['Practice manager · monthly', 'مدير العيادة · شهرياً'],
  },
  charge_collection: {
    en: 'Charge collection', ar: 'تحصيل الرسوم',
    def: (s, ar) => ar ? 'المدفوع ÷ الرسوم القابلة للتحصيل للزيارات التي حلّ استحقاقها في الفترة. المسترد والملغى يظهران منفصلين.'
      : 'Paid ÷ collectible charges for visits whose due date fell in the period. Refunds and returns are shown separately.',
    owner: ['Finance owner · monthly', 'المسؤول المالي · شهرياً'],
  },
};
