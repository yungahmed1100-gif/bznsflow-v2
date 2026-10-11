// Fitness & wellness labels, EN and AR. Codes stay as stored; only the words change.
import { labelsFrom, BUCKET_TONE } from '../workspace/labels.js';

const L = {
  state: { prospect: ['Trial / enquiry', 'تجربة / استفسار'], pending: ['Awaiting payment', 'بانتظار الدفع'], upcoming: ['Starts soon', 'يبدأ قريباً'], active: ['Active', 'نشط'], frozen: ['Frozen', 'مجمّد'],
    grace: ['Ended, not renewed', 'انتهى ولم يُجدَّد'], renewed: ['Renewed', 'مُجدَّد'], expired: ['Lapsed', 'منتهٍ'], cancelled: ['Cancelled', 'ملغى'] },
  renewal: { renewed: ['Renewed', 'مُجدَّد'], awaiting_payment: ['Awaiting payment', 'بانتظار الدفع'], grace: ['In grace', 'فترة السماح'], due: ['Renewal due', 'التجديد مستحق'], lapsed: ['Lapsed', 'منتهٍ'], not_due: ['Not due', 'غير مستحق'] },
  quick: { all: ['All members', 'كل الأعضاء'], trialFollowUp: ['Trial follow-up', 'متابعة التجربة'], attendanceGap: ['Attendance gap', 'انقطاع عن الحضور'], expiring: ['Expiring', 'ينتهي قريباً'], frozen: ['Frozen', 'مجمّد'] },
  seat: { confirmed: ['Booked', 'محجوز'], waitlisted: ['Waitlist', 'قائمة الانتظار'], attended: ['Attended', 'حضر'], no_show: ['No-show', 'لم يحضر'], cancelled: ['Cancelled', 'ملغى'] },
  trial: { confirmed: ['Trial booked', 'تجربة محجوزة'], waitlisted: ['Trial on the waitlist', 'تجربة في الانتظار'], attended: ['Trial attended', 'حضر التجربة'], no_show: ['Missed the trial', 'فاتته التجربة'], cancelled: ['Trial cancelled', 'أُلغيت التجربة'] },
  planKind: { membership: ['Membership', 'اشتراك'], class_pack: ['Class pack', 'باقة حصص'] },
  billing: { 1: ['Monthly', 'شهري'], 3: ['Quarterly', 'ربع سنوي'], 6: ['Every 6 months', 'كل ٦ أشهر'], 12: ['Yearly', 'سنوي'] },
  source: { walk_in: ['Walk-in', 'زيارة مباشرة'], instagram: ['Instagram', 'إنستغرام'], whatsapp: ['WhatsApp', 'واتساب'], referral: ['Member referral', 'إحالة عضو'], partner: ['Local partner', 'شريك محلي'],
    search: ['Search', 'البحث'], direct: ['Direct', 'مباشر'], unknown: ['Not recorded', 'غير مسجل'], not_applicable: ['—', '—'] },
  method: { cash: ['Cash', 'نقداً'], card: ['Card', 'بطاقة'], bank_transfer: ['Bank transfer', 'تحويل بنكي'], payment_link: ['Payment link', 'رابط دفع'], other: ['Other', 'أخرى'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on customer', 'بانتظار العميل'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked / failed', 'متعثرة / فشلت'], completed: ['Completed', 'مكتملة'] },
  task: { trial_request: ['Book a trial', 'حجز حصة تجريبية'], trial_convert: ['Offer a membership', 'عرض الاشتراك'], payment_due: ['Payment before it starts', 'الدفع قبل البدء'],
    attendance_unrecorded: ['Record attendance', 'تسجيل الحضور'], in_grace: ['Ended, not renewed', 'انتهى ولم يُجدَّد'], rule_trial_reminder: ['Trial reminder', 'تذكير بالتجربة'],
    rule_attendance_gap: ['Invite back', 'دعوة للعودة'], rule_renewal: ['Renewal reminder', 'تذكير بالتجديد'], template_required: ['Approved template needed', 'يلزم قالب معتمد'], send_failed: ['Message failed', 'تعذّر الإرسال'], followup: ['Follow-up', 'متابعة'] },
  draftKind: { trial_reminder: ['Trial reminder', 'تذكير بالتجربة'], attendance_gap: ['Invitation back', 'دعوة للعودة'], renewal: ['Renewal reminder', 'تذكير بالتجديد'], waitlist_promoted: ['A place opened', 'توفر مكان'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Sending', 'قيد الإرسال'], queued_template: ['Sending as template', 'يُرسل كقالب'], provider_submitted: ['Sent', 'أُرسلت'], delivered: ['Delivered', 'وصلت'],
    read: ['Read', 'قُرئت'], blocked: ['Blocked (opted out)', 'محظورة (ألغى الاشتراك)'], template_required: ['Needs an approved template', 'تحتاج قالباً معتمداً'], failed: ['Failed', 'فشلت'], cancelled: ['Withdrawn', 'سُحبت'] },
  rule: { trial_reminder: ['Trial preparation', 'التحضير للتجربة'], attendance_gap: ['Attendance gap', 'الانقطاع عن الحضور'], renewal: ['Renewal', 'التجديد'] },
  note: { frozen: ['Frozen (left out)', 'مجمّد (مستبعد)'], new_member: ['New member, still observed', 'عضو جديد قيد المتابعة'], no_visit_recorded: ['No visit recorded yet', 'لا زيارة مسجلة بعد'],
    cancelled: ['Cancelled', 'ملغى'], freeze_moved_end: ['End moved by a freeze', 'نُقل الانتهاء بسبب تجميد'], unknown: ['Outcome not recorded', 'النتيجة غير مسجلة'], trial: ['Trial', 'تجربة'],
    new: ['New members', 'أعضاء جدد'], reactivated: ['Returned members', 'أعضاء عائدون'], lapsed: ['Lapsed without renewal', 'انتهوا دون تجديد'], classes: ['Classes held', 'حصص منعقدة'] },
  segment: { plan: ['Plan', 'الخطة'], source: ['Acquisition source', 'مصدر الاكتساب'], class_type: ['Class type', 'نوع الحصة'], member_state: ['Frozen vs active', 'مجمّد أم نشط'] },
  activity: { membership_created: ['Membership added', 'أُضيف الاشتراك'], renewal_created: ['Renewal added', 'أُضيف التجديد'], activated: ['Started (paid)', 'بدأ (مدفوع)'], frozen: ['Frozen (days)', 'تجميد (أيام)'],
    cancelled: ['Cancelled', 'أُلغي'], trial_booked: ['Trial booked', 'حُجزت التجربة'], class_booked: ['Class booked', 'حُجزت حصة'], attended: ['Attended', 'حضر'], no_show: ['No-show', 'لم يحضر'] },
};

export const { label, options } = labelsFrom(L);

// Colour keeps its meaning: blue the customer, yellow in progress, orange the record, green done, coral a problem.
export const STATE_TONE = { prospect: 'blue', pending: 'yellow', upcoming: 'yellow', active: 'green', frozen: 'orange', grace: 'coral', renewed: 'green', expired: 'coral', cancelled: undefined };
export const SEAT_TONE = { confirmed: 'yellow', waitlisted: 'orange', attended: 'green', no_show: 'coral', cancelled: undefined };
export { BUCKET_TONE };
export const QUICK = ['all', 'trialFollowUp', 'attendanceGap', 'expiring', 'frozen'];
export const FITNESS_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
// Closed by a recorded fact (payment, attendance, renewal); marking them done would only hide the cause.
export const SELF_CLOSING = new Set(['payment_due', 'attendance_unrecorded', 'in_grace']);
