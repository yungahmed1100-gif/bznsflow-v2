// Automotive workshop labels for the six-tab kit, EN and AR. Codes stay as stored; only the words change.
import { labelsFrom, BUCKET_TONE } from '../workspace/labels.js';

const L = {
  status: { intake: ['Intake', 'الاستقبال'], inspection: ['Inspection', 'الفحص'], awaiting_approval: ['Awaiting approval', 'بانتظار الموافقة'], approved: ['Approved', 'معتمد'],
    in_progress: ['In progress', 'قيد العمل'], quality_check: ['Quality check', 'فحص الجودة'], ready: ['Ready', 'جاهزة'], collected: ['Collected', 'مستلمة'], closed: ['Closed', 'مغلق'], cancelled: ['Cancelled', 'ملغى'] },
  task: { appointment_request: ['Appointment request', 'طلب موعد'], chat_booking_request: ['Service request from Layla', 'طلب خدمة من ليلى'], approval_waiting: ['Estimate waiting for approval', 'عرض سعر بانتظار الموافقة'],
    past_promise: ['Past the promised time', 'تجاوز الموعد الموعود'], ready_uncollected: ['Ready, not collected', 'جاهزة ولم تُستلم'], parts_blocking: ['Waiting on a part', 'بانتظار قطعة'],
    rule_ready_for_collection: ['Ready for collection', 'جاهزة للاستلام'], rule_estimate_reminder: ['Estimate reminder', 'تذكير بعرض السعر'], rule_service_due: ['Service due', 'موعد صيانة'],
    rule_promise_risk: ['Promise at risk', 'موعد التسليم معرّض للخطر'], estimate_issued: ['Estimate with the customer', 'عرض السعر لدى العميل'], template_required: ['Template needed', 'يلزم قالب'], send_failed: ['Send failed', 'تعذر الإرسال'] },
  rule: { ready_for_collection: ['Ready for collection', 'جاهزة للاستلام'], estimate_reminder: ['Estimate reminder', 'تذكير بعرض السعر'], service_due: ['Next service due', 'موعد الصيانة القادم'], promise_risk: ['Promise at risk', 'موعد التسليم معرّض للخطر'] },
  draftKind: { ready_for_collection: ['Ready message', 'رسالة الجاهزية'], estimate_reminder: ['Estimate reminder', 'تذكير بعرض السعر'], service_due: ['Service reminder', 'تذكير بالصيانة'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Queued', 'في قائمة الإرسال'], queued_template: ['Queued as template', 'في قائمة القوالب'], provider_submitted: ['Sent', 'أُرسلت'],
    delivered: ['Delivered', 'وصلت'], read: ['Read', 'قُرئت'], blocked: ['Not sent', 'لم تُرسل'], template_required: ['Template needed', 'يلزم قالب'], failed: ['Failed', 'فشلت'], cancelled: ['Cancelled', 'أُلغيت'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on customer', 'بانتظار العميل'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked', 'متعثرة'], completed: ['Completed', 'منجزة'] },
};

export const { label } = labelsFrom(L);
export { BUCKET_TONE };
