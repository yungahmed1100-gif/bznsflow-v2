// Construction labels for the six-tab kit, EN and AR. Codes stay as stored; only the words change.
import { labelsFrom, BUCKET_TONE } from '../workspace/labels.js';

const L = {
  status: { tender: ['Tender', 'مناقصة'], quoted: ['Quoted', 'مُسعّر'], awarded: ['Awarded', 'مُرسى'], active: ['Active', 'قيد التنفيذ'], practical_completion: ['Practical completion', 'الإنجاز العملي'],
    defects_liability: ['Defects liability', 'فترة الضمان'], closed: ['Closed', 'مغلق'], lost: ['Lost', 'خاسر'], cancelled: ['Cancelled', 'ملغى'] },
  task: { site_visit_request: ['Project enquiry from Layla', 'استفسار مشروع من ليلى'], signed_variation_required: ['Client agreed: attach the signed variation', 'وافق العميل: أرفق أمر التغيير الموقع'],
    materials_due: ['Materials due on site', 'مواد مطلوبة في الموقع'], receivable_overdue: ['Certified payment overdue', 'دفعة معتمدة متأخرة'], safety_review: ['Safety review', 'مراجعة السلامة'],
    rule_certified_balance_due: ['Certified balance due', 'رصيد معتمد مستحق'], rule_variation_decision: ['Variation reminder', 'تذكير بأمر التغيير'], rule_approval_blocker: ['Variation holding work up', 'أمر تغيير يعطل العمل'],
    rule_milestone_dependency: ['Milestone at risk', 'مرحلة معرّضة للخطر'], variation_submitted: ['Variation with the client', 'أمر التغيير لدى العميل'], template_required: ['Template needed', 'يلزم قالب'], send_failed: ['Send failed', 'تعذر الإرسال'] },
  rule: { certified_balance_due: ['Certified balance due', 'رصيد معتمد مستحق'], variation_decision: ['Variation decision', 'قرار أمر التغيير'], approval_blocker: ['Variation holding work up', 'أمر تغيير يعطل العمل'], milestone_dependency: ['Milestone dependency', 'اعتماد المراحل'] },
  draftKind: { certified_balance_due: ['Balance reminder', 'تذكير بالرصيد'], variation_decision: ['Variation reminder', 'تذكير بأمر التغيير'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Queued', 'في قائمة الإرسال'], queued_template: ['Queued as template', 'في قائمة القوالب'], provider_submitted: ['Sent', 'أُرسلت'],
    delivered: ['Delivered', 'وصلت'], read: ['Read', 'قُرئت'], blocked: ['Not sent', 'لم تُرسل'], template_required: ['Template needed', 'يلزم قالب'], failed: ['Failed', 'فشلت'], cancelled: ['Cancelled', 'أُلغيت'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on client', 'بانتظار العميل'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked', 'متعثرة'], completed: ['Completed', 'منجزة'] },
};

export const { label } = labelsFrom(L);
export { BUCKET_TONE };
