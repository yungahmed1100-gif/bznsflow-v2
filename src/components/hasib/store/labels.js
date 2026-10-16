// Store labels (retail and retail-tech) for the six-tab kit, EN and AR. Codes stay as stored; only the words change.
import { labelsFrom, BUCKET_TONE } from '../workspace/labels.js';

const L = {
  status: { pending: ['Pending', 'قيد الانتظار'], confirmed: ['Confirmed', 'مؤكد'], ready: ['Ready', 'جاهز'], received: ['Received', 'مستلم'], diagnosing: ['Diagnosing', 'قيد الفحص'],
    waiting_parts: ['Waiting for parts', 'بانتظار القطع'], repairing: ['Repairing', 'قيد الإصلاح'], collected: ['Collected', 'تم التسليم'], cancelled: ['Cancelled', 'ملغى'] },
  task: { low_stock: ['Low stock', 'مخزون منخفض'], ready_uncollected: ['Ready, not collected', 'جاهز ولم يُستلم'], repair_ready_uncollected: ['Repair ready, not collected', 'الصيانة جاهزة ولم تُستلم'],
    repair_request: ['Repair question from Layla', 'استفسار صيانة من ليلى'], repair_quote_waiting: ['Repair quote with the customer', 'عرض الصيانة لدى العميل'],
    rule_ready_for_collection: ['Ready for collection', 'جاهز للاستلام'], rule_back_in_stock: ['Back in stock', 'عاد إلى المخزون'], rule_order_unconfirmed: ['Order Layla could not confirm', 'طلب لم تؤكده ليلى'],
    rule_repair_ready: ['Repair ready', 'الصيانة جاهزة'], rule_repair_quote_reminder: ['Repair quote reminder', 'تذكير بعرض الصيانة'], rule_overdue_repair: ['Repair past its date', 'صيانة تجاوزت موعدها'],
    template_required: ['Template needed', 'يلزم قالب'], send_failed: ['Send failed', 'تعذر الإرسال'] },
  rule: { ready_for_collection: ['Order ready for collection', 'الطلب جاهز للاستلام'], back_in_stock: ['Back in stock', 'عاد إلى المخزون'], order_unconfirmed: ['Order Layla could not confirm', 'طلب لم تؤكده ليلى'],
    repair_ready: ['Repair ready', 'الصيانة جاهزة'], repair_quote_reminder: ['Repair quote reminder', 'تذكير بعرض الصيانة'], overdue_repair: ['Repair past its date', 'صيانة تجاوزت موعدها'] },
  draftKind: { ready_for_collection: ['Ready message', 'رسالة الجاهزية'], back_in_stock: ['Back-in-stock message', 'رسالة التوفر'], repair_ready: ['Repair ready message', 'رسالة جاهزية الصيانة'],
    repair_quote_reminder: ['Quote reminder', 'تذكير بالعرض'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Queued', 'في قائمة الإرسال'], queued_template: ['Queued as template', 'في قائمة القوالب'], provider_submitted: ['Sent', 'أُرسلت'],
    delivered: ['Delivered', 'وصلت'], read: ['Read', 'قُرئت'], blocked: ['Not sent', 'لم تُرسل'], template_required: ['Template needed', 'يلزم قالب'], failed: ['Failed', 'فشلت'], cancelled: ['Cancelled', 'أُلغيت'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on customer', 'بانتظار العميل'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked', 'متعثرة'], completed: ['Completed', 'منجزة'] },
};

export const { label } = labelsFrom(L);
export { BUCKET_TONE };
