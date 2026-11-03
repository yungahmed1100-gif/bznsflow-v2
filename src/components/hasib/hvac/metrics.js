// What each AC service KPI is called and how it is calculated, in the owner's words (ascend/hvac.md,
// with the measures top service companies track). Windows come from Settings → Follow-up rules, so
// every definition names its values. Industry figures are references, not the business's target.
const def = (en, ar) => (s, isAr) => (isAr ? ar(s) : en(s));

export const HVAC_METRICS = {
  on_time_arrival: {
    en: 'On-time arrival', ar: 'الوصول في الموعد',
    def: def(s => `Visits where the technician arrived by the end of the booked window plus ${s.arrivalGraceMinutes} minutes ÷ visits whose window has passed. A visit with no arrival recorded counts as late and is shown separately. Well-run service companies reach 95%+.`,
      s => `الزيارات التي وصل فيها الفني قبل نهاية النافذة المحجوزة + ${s.arrivalGraceMinutes} دقيقة ÷ الزيارات التي مرّ وقتها. الزيارة بلا وصول مسجل تُحتسب متأخرة وتظهر منفصلة. الشركات الأفضل تتجاوز ٩٥٪.`),
    owner: ['Dispatcher · daily', 'منسق المواعيد · يومياً'],
  },
  first_time_fix: {
    en: 'First-time fix', ar: 'الإصلاح من أول زيارة',
    def: def(s => `Repair, gas and cleaning jobs completed in one visit and not back for the same unit within ${s.repeatWindowDays} days ÷ such jobs whose ${s.repeatWindowDays}-day window has closed. Top shops reach 80%+.`,
      s => `أعمال الإصلاح والغاز والتنظيف التي اكتملت بزيارة واحدة ولم تعد لنفس الوحدة خلال ${s.repeatWindowDays} يوماً ÷ هذه الأعمال التي انتهت نافذتها. أفضل الشركات تتجاوز ٨٠٪.`),
    owner: ['Service manager · weekly', 'مدير الخدمة · أسبوعياً'],
  },
  maintenance_due: {
    en: 'Maintenance due', ar: 'صيانات مستحقة',
    def: def(() => 'As of now: units past the service date their technician set, with no job since, plus contract visits past due with no visit booked.',
      () => 'حتى الآن: الوحدات التي تجاوزت موعد الصيانة الذي حدده الفني دون عمل بعده، وزيارات العقود المتأخرة دون موعد محجوز.'),
    owner: ['Dispatcher · daily', 'منسق المواعيد · يومياً'],
  },
  job_contribution: {
    en: 'Job contribution', ar: 'مساهمة الأعمال',
    def: def(() => 'Revenue before VAT less the recorded parts, gas, labour and subcontract costs, for completed jobs whose costs are marked complete. Jobs without complete costs are shown separately, never guessed.',
      () => 'الإيراد قبل الضريبة ناقص تكاليف القطع والغاز والأجرة والمقاولين المسجلة، للأعمال المكتملة ذات التكاليف المكتملة. الأعمال بلا تكاليف مكتملة تظهر منفصلة ولا تُقدّر.'),
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  booking_rate: {
    en: 'Request → booked', ar: 'الطلبات المحجوزة',
    def: def(s => `Requests given a visit within ${s.bookingWindowDays} days ÷ requests old enough to judge. Contract visits are left out. The best-run call centres book 60%+.`,
      s => `الطلبات التي حُجزت لها زيارة خلال ${s.bookingWindowDays} يوم ÷ الطلبات التي مضى عليها ما يكفي للحكم. زيارات العقود مستبعدة. أفضل الفرق تحجز أكثر من ٦٠٪.`),
    owner: ['Front desk · daily', 'الاستقبال · يومياً'],
  },
  time_to_first_visit: {
    en: 'Time to first visit', ar: 'الوقت حتى أول زيارة',
    def: def(() => 'Median (and slowest 10%) time from the request to the technician’s first arrival. Requests not visited yet are shown separately. Split it by urgent versus routine in the breakdown.',
      () => 'الوسيط (وأبطأ ١٠٪) للوقت من الطلب إلى أول وصول للفني. الطلبات التي لم تُزر بعد تظهر منفصلة. قسّمه حسب العاجل والاعتيادي في التفصيل.'),
    owner: ['Dispatcher · weekly', 'منسق المواعيد · أسبوعياً'],
  },
  estimate_acceptance: {
    en: 'Estimate acceptance', ar: 'قبول التسعيرات',
    def: def(s => `The latest estimate sent for each job, approved within ${s.estimateWindowDays} days ÷ those whose window has closed. A later version needs its own yes. Strong shops convert 45–65%.`,
      s => `آخر تسعيرة أُرسلت لكل عمل واعتُمدت خلال ${s.estimateWindowDays} يوماً ÷ التسعيرات التي انتهت نافذتها. النسخة الأحدث تحتاج موافقتها الخاصة. الشركات القوية تحوّل ٤٥–٦٥٪.`),
    owner: ['Owner · weekly', 'المالك · أسبوعياً'],
  },
  repeat_fault_rate: {
    en: 'Repeat-fault rate', ar: 'نسبة الأعطال المتكررة',
    def: def(s => `Completed jobs that came back for the same unit within ${s.repeatWindowDays} days ÷ completed jobs whose window has closed. Contract visits are left out. The best keep it under 2%.`,
      s => `الأعمال المكتملة التي عادت لنفس الوحدة خلال ${s.repeatWindowDays} يوماً ÷ الأعمال المكتملة التي انتهت نافذتها. زيارات العقود مستبعدة. الأفضل تحت ٢٪.`),
    owner: ['Service manager · weekly', 'مدير الخدمة · أسبوعياً'],
  },
  contract_renewal: {
    en: 'Contract renewal', ar: 'تجديد العقود',
    def: def(s => `Maintenance contracts renewed by their end date plus ${s.renewalGraceDays} days ÷ contracts that ended in the period. Leading service companies renew 85–95%.`,
      s => `عقود الصيانة المجددة حتى تاريخ انتهائها + ${s.renewalGraceDays} يوماً ÷ العقود المنتهية في الفترة. الشركات الرائدة تجدد ٨٥–٩٥٪.`),
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  jobs_past_promise: {
    en: 'Jobs past promise', ar: 'أعمال تجاوزت الوعد',
    def: def(() => 'As of now: open jobs whose booked window ended with no arrival recorded, or whose parts are past their expected date.',
      () => 'حتى الآن: الأعمال المفتوحة التي انتهت نافذة زيارتها دون تسجيل وصول، أو تجاوزت قطعها التاريخ المتوقع.'),
    owner: ['Dispatcher · daily', 'منسق المواعيد · يومياً'],
  },
  average_ticket: {
    en: 'Average ticket', ar: 'متوسط الفاتورة',
    def: def(() => 'Revenue before VAT of completed, charged jobs ÷ those jobs. Contract visits are paid by their contract and left out. Revenue per technician-day is shown with it.',
      () => 'إيراد الأعمال المكتملة المفوترة قبل الضريبة ÷ عددها. زيارات العقود مدفوعة بعقدها ومستبعدة. يظهر معه الإيراد لكل يوم فني.'),
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  receivables: {
    en: 'Money owed', ar: 'المبالغ المستحقة',
    def: def(() => 'As of now: open balances on completed jobs and contracts, aged from when they were charged (0–30, 31–60, over 60 days).',
      () => 'حتى الآن: الأرصدة المفتوحة على الأعمال المكتملة والعقود، حسب عمرها منذ الفوترة (٠–٣٠، ٣١–٦٠، أكثر من ٦٠ يوماً).'),
    owner: ['Finance owner · weekly', 'المسؤول المالي · أسبوعياً'],
  },
};
