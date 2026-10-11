// Dental clinic labels, EN and AR. Codes stay as stored; only the words change. No clinical words.
const L = {
  status: { booked: ['Booked', 'محجوز'], confirmed: ['Confirmed', 'مؤكد'], arrived: ['Arrived', 'حضر'], completed: ['Completed', 'مكتمل'], missed: ['Missed', 'فائت'], cancelled: ['Cancelled', 'ملغى'],
    unknown: ['Outcome not recorded', 'النتيجة غير مسجلة'] },
  next: { confirm: ['Confirm with the patient', 'التأكيد مع المريض'], check_in: ['Check in on arrival', 'تسجيل الوصول'], record_outcome: ['Record whether they came', 'تسجيل الحضور من عدمه'],
    complete: ['Mark completed', 'تسجيل الاكتمال'], rebook: ['Offer another time', 'عرض وقت آخر'], record_charges: ['Record charges', 'تسجيل الرسوم'], collect_balance: ['Balance to collect', 'رصيد للتحصيل'] },
  quick: { all: ['All visits', 'كل الزيارات'], today: ['Today', 'اليوم'], unconfirmed: ['Unconfirmed', 'غير مؤكدة'], missed: ['Missed', 'فائتة'], followupDue: ['Follow-up due', 'متابعة مستحقة'] },
  kind: { provider: ['Provider', 'مقدم الخدمة'], chair: ['Chair', 'الكرسي'] },
  cancel: { patient_request: ['Patient asked', 'بطلب المريض'], clinic_request: ['Clinic changed plans', 'بطلب العيادة'], provider_unavailable: ['Provider unavailable', 'الطبيب غير متاح'],
    duplicate: ['Duplicate booking', 'حجز مكرر'], other_operational: ['Other (operational)', 'سبب تشغيلي آخر'] },
  source: { layla: ['Layla (chat)', 'ليلى (المحادثة)'], phone: ['Phone', 'الهاتف'], walk_in: ['Walk-in', 'حضور مباشر'], staff: ['Front desk', 'الاستقبال'], referral: ['Referral', 'إحالة'] },
  method: { cash: ['Cash', 'نقداً'], card: ['Card', 'بطاقة'], bank_transfer: ['Bank transfer', 'تحويل بنكي'], payment_link: ['Payment link', 'رابط دفع'], other: ['Other', 'أخرى'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on patient', 'بانتظار المريض'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked / failed', 'متعثرة / فشلت'], completed: ['Completed', 'مكتملة'] },
  task: { visit_request: ['Book a visit', 'حجز زيارة'], attendance_unrecorded: ['Record attendance', 'تسجيل الحضور'], charges_unrecorded: ['Record charges', 'تسجيل الرسوم'],
    balance_overdue: ['Balance past due', 'رصيد متأخر'], rebook_missed: ['Offer another time', 'عرض وقت آخر'], rule_visit_confirmation: ['Confirmation reminder', 'تذكير بالتأكيد'],
    rule_missed_recovery: ['Missed-visit message', 'رسالة الزيارة الفائتة'], rule_recall: ['Recall reminder', 'تذكير بموعد المراجعة'], rule_balance_due: ['Balance reminder', 'تذكير بالرصيد'],
    template_required: ['Approved template needed', 'يلزم قالب معتمد'], send_failed: ['Message failed', 'تعذّر الإرسال'] },
  draftKind: { visit_confirmation: ['Confirmation reminder', 'تذكير بالتأكيد'], missed_recovery: ['Missed-visit message', 'رسالة الزيارة الفائتة'], recall: ['Recall reminder', 'تذكير بموعد المراجعة'], balance_due: ['Balance reminder', 'تذكير بالرصيد'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Sending', 'قيد الإرسال'], queued_template: ['Sending as template', 'يُرسل كقالب'], provider_submitted: ['Sent', 'أُرسلت'], delivered: ['Delivered', 'وصلت'],
    read: ['Read', 'قُرئت'], blocked: ['Blocked (opted out)', 'محظورة (ألغى الاشتراك)'], template_required: ['Needs an approved template', 'تحتاج قالباً معتمداً'], failed: ['Failed', 'فشلت'], cancelled: ['Withdrawn', 'سُحبت'] },
  rule: { visit_confirmation: ['Visit confirmation', 'تأكيد الزيارة'], missed_recovery: ['Missed visit', 'الزيارة الفائتة'], recall: ['Recall', 'موعد المراجعة'], balance_due: ['Overdue balance', 'الرصيد المتأخر'] },
  note: { unknown: ['Outcome not recorded', 'النتيجة غير مسجلة'], disputed: ['Disputed (left out)', 'متنازع عليه (مستبعد)'], timely_cancel: ['Cancelled in good time', 'أُلغي في وقت مناسب'],
    returned: ['Refunded or returned', 'مسترد أو ملغى'], no_chairs: ['No chairs set up', 'لا كراسي مضافة'] },
  segment: { provider: ['Provider', 'مقدم الخدمة'], service_group: ['Service group', 'مجموعة الخدمة'], patient_type: ['New vs returning', 'جديد أم عائد'], time_of_day: ['Time of day', 'وقت اليوم'] },
  segmentKey: { new: ['New patient', 'مريض جديد'], returning: ['Returning patient', 'مريض عائد'], morning: ['Morning', 'الصباح'], afternoon: ['Afternoon', 'بعد الظهر'], evening: ['Evening', 'المساء'],
    unknown: ['Not recorded', 'غير مسجل'], not_applicable: ['—', '—'] },
  activity: { booked: ['Booked', 'حُجز'], rescheduled: ['Rescheduled (was)', 'أُعيدت جدولته (كان)'], confirmed: ['Confirmed', 'أُكد'], arrived: ['Arrived', 'حضر'], completed: ['Completed', 'اكتمل'],
    missed: ['Missed', 'فاتت'], cancelled: ['Cancelled', 'أُلغي'], attendance_corrected: ['Attendance corrected', 'صُحّح الحضور'], charges_recorded: ['Charges recorded', 'سُجلت الرسوم'],
    balance_disputed: ['Balance disputed', 'نُوزع في الرصيد'], dispute_cleared: ['Dispute cleared', 'انتهى النزاع'], recall_set: ['Recall date set', 'حُدد موعد المراجعة'], recall_cleared: ['Recall cleared', 'أُلغي موعد المراجعة'] },
};

export const label = (group, key, ar) => { const pair = L[group]?.[key]; return pair ? pair[ar ? 1 : 0] : String(key ?? '').replace(/_/g, ' '); };
export const options = (group, ar) => Object.keys(L[group]).map(id => ({ id, label: label(group, id, ar) }));

// Colour keeps its meaning: blue the patient, yellow in progress, orange the record, green done, coral a problem.
export const STATUS_TONE = { booked: 'yellow', confirmed: 'blue', arrived: 'orange', completed: 'green', missed: 'coral', cancelled: undefined, unknown: 'coral' };
export const BUCKET_TONE = { today: 'orange', overdue: 'coral', scheduled: 'blue', waiting: 'blue', decision: 'yellow', blocked: 'coral', completed: 'green' };
export const QUICK = ['all', 'today', 'unconfirmed', 'missed', 'followupDue'];
export const DENTAL_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
// Closed by a recorded fact (attendance, charges, payment); marking them done would only hide the cause.
export const SELF_CLOSING = new Set(['attendance_unrecorded', 'charges_unrecorded', 'balance_overdue']);
// One tap from a visit row: the next recorded fact, when the visit's state allows it.
export const QUICK_STATUS = { booked: ['confirmed', 'arrived'], confirmed: ['arrived'], arrived: ['completed'] };
export const STATUS_VERB = { confirmed: ['Confirm', 'تأكيد'], arrived: ['Arrived', 'وصل'], completed: ['Completed', 'اكتمل'], missed: ['Missed', 'فاتت'] };
