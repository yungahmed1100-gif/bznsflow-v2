// Media & production labels, EN and AR. Codes stay as stored; only the words change.
import { BUCKET_TONE } from '../workspace/labels.js';

const L = {
  status: { brief_incomplete: ['Brief', 'الموجز'], quoted: ['Quoted', 'مُسعّر'], awaiting_acceptance: ['Awaiting acceptance', 'بانتظار القبول'], booked: ['Booked', 'محجوز'],
    preproduction: ['Preproduction', 'ما قبل الإنتاج'], shooting: ['Shooting', 'التصوير'], editing: ['Editing', 'المونتاج'], review: ['Client review', 'مراجعة العميل'],
    accepted: ['Accepted', 'معتمد'], delivered: ['Delivered', 'مُسلّم'], closed: ['Closed', 'مغلق'], on_hold: ['On hold', 'متوقف مؤقتاً'], cancelled: ['Cancelled', 'ملغى'] },
  column: { brief: ['Brief', 'الموجز'], quoted: ['Quote', 'التسعير'], booked: ['Booked & prep', 'الحجز والتحضير'], production: ['Shoot & edit', 'التصوير والمونتاج'], review: ['Client review', 'مراجعة العميل'], accepted: ['Accepted', 'معتمد'] },
  type: { photo: ['Photo', 'تصوير فوتوغرافي'], video: ['Video', 'فيديو'], podcast: ['Podcast', 'بودكاست'], social_package: ['Social package', 'باقة سوشيال'], live_capture: ['Live capture', 'تغطية مباشرة'] },
  format: { video: ['Video', 'فيديو'], photo: ['Photo', 'صورة'], audio: ['Audio', 'صوت'], social_cut: ['Social cut', 'مقطع سوشيال'], stills_set: ['Stills set', 'مجموعة صور'], livestream: ['Livestream', 'بث مباشر'] },
  category: { crew: ['Crew', 'طاقم'], camera: ['Camera', 'كاميرا'], lighting: ['Lighting', 'إضاءة'], audio: ['Audio', 'صوت'], location: ['Location', 'موقع'], other: ['Other', 'أخرى'], not_applicable: ['—', '—'] },
  cost: { crew_time: ['Crew time', 'وقت الطاقم'], vendor: ['Vendor', 'مورد'], equipment: ['Equipment', 'معدات'], location: ['Location', 'موقع'], licensing: ['Licensing', 'ترخيص'],
    travel: ['Travel', 'سفر'], editing: ['Editing', 'مونتاج'], outsourced: ['Outsourced', 'خدمات خارجية'] },
  prep: { crew_confirmed: ['Crew confirmed', 'تأكيد الطاقم'], location_permission: ['Location permission', 'تصريح الموقع'], equipment_ready: ['Equipment ready', 'جاهزية المعدات'],
    client_assets: ['Client assets received', 'استلام ملفات العميل'], talent_releases: ['Talent releases signed', 'توقيع موافقات الظهور'] },
  blocker: { brief_incomplete: ['Brief incomplete', 'الموجز غير مكتمل'], quote_not_presented: ['Quote not yet presented', 'لم يُعرض السعر بعد'], acceptance_missing: ['Waiting for acceptance', 'بانتظار القبول'],
    deposit_missing: ['Deposit not received', 'لم تُستلم الدفعة المقدمة'], holds_unconfirmed: ['Holds not confirmed', 'الحجوزات غير مؤكدة'], extra_scope_decision: ['Extra scope to decide', 'نطاق إضافي بانتظار القرار'],
    prep_missing: ['Critical preparation missing', 'تحضير حرج ناقص'], shoot_completion_missing: ['Shoot completion not recorded', 'لم يُسجل انتهاء التصوير'], first_cut_due: ['First cut due', 'النسخة الأولى مستحقة'],
    cut_awaiting_approval: ['Cut awaiting the client', 'النسخة بانتظار العميل'], rights_not_cleared: ['Usage rights not cleared', 'حقوق الاستخدام غير مؤكدة'], handoff_missing: ['Handoff not sent', 'لم يُسلّم بعد'] },
  quick: { all: ['All open', 'كل المفتوح'], mine: ['My productions', 'إنتاجاتي'], brief_incomplete: ['Brief incomplete', 'موجز غير مكتمل'], shoot_at_risk: ['Shoot at risk', 'تصوير معرّض للخطر'],
    cut_awaiting: ['Cut awaiting approval', 'نسخة بانتظار الموافقة'], extra_scope: ['Extra scope', 'نطاق إضافي'] },
  closed: { delivered: ['Delivered', 'مُسلّم'], closed: ['Closed', 'مغلق'], on_hold: ['On hold', 'متوقف'], cancelled: ['Cancelled', 'ملغى'] },
  cut: { in_review: ['In review', 'قيد المراجعة'], approved: ['Approved', 'معتمدة'], changes_requested: ['Changes requested', 'طُلبت تعديلات'], superseded: ['Superseded', 'استُبدلت'] },
  change: { proposed: ['Proposed', 'مقترح'], approved: ['Approved', 'معتمد'], waived: ['Waived (no charge)', 'معفى (بلا رسوم)'], declined: ['Declined', 'مرفوض'] },
  changeKind: { extra_revision: ['Extra revision round', 'جولة تعديل إضافية'], new_deliverable: ['New deliverable', 'مُخرَج جديد'], other: ['Other extra work', 'عمل إضافي آخر'] },
  hold: { held: ['Tentative', 'مبدئي'], confirmed: ['Confirmed', 'مؤكد'], released: ['Released', 'محرر'], expired: ['Expired', 'منتهٍ'] },
  clearance: { unknown: ['Not checked', 'لم يُتحقق'], pending: ['Pending', 'قيد المتابعة'], cleared: ['Cleared', 'مؤكدة'] },
  channel: { web: ['Website', 'الموقع'], social: ['Social media', 'التواصل الاجتماعي'], broadcast: ['Broadcast', 'البث'], print: ['Print', 'المطبوعات'], outdoor: ['Outdoor', 'الإعلانات الخارجية'], internal: ['Internal', 'داخلي'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], waiting: ['Waiting on customer', 'بانتظار العميل'], decision: ['Needs decision', 'تحتاج قراراً'],
    blocked: ['Blocked / failed', 'متعثرة / فشلت'], completed: ['Completed', 'مكتملة'] },
  task: { brief_incomplete: ['Brief still incomplete', 'الموجز ما زال ناقصاً'], deposit_missing: ['Deposit not received', 'الدفعة المقدمة لم تُستلم'], shoot_at_risk: ['Shoot at risk', 'تصوير معرّض للخطر'],
    cut_overdue: ['Client decision overdue', 'قرار العميل متأخر'], extra_scope_decision: ['Decide extra scope', 'قرار النطاق الإضافي'], hold_expiring: ['Hold expiring', 'حجز مبدئي ينتهي'],
    hold_conflict: ['Tentative holds clash', 'تعارض حجوزات مبدئية'], shoot_completion_missing: ['Record the shoot', 'سجّل انتهاء التصوير'], costs_not_final: ['Confirm the costs', 'أكّد التكاليف'],
    delivery_overdue: ['Delivery overdue', 'التسليم متأخر'], template_required: ['Template needed to send', 'يلزم قالب للإرسال'], send_failed: ['Send failed', 'فشل الإرسال'],
    rule_prep_request: ['Ask for client inputs', 'طلب مدخلات العميل'], rule_cut_approval: ['Chase the cut decision', 'متابعة قرار النسخة'], rule_delivery_balance: ['Handoff or balance due', 'تسليم أو رصيد مستحق'],
    rule_rights_expiry: ['Usage rights ending', 'حقوق الاستخدام تنتهي'], cut_in_review: ['Cut with the client', 'النسخة لدى العميل'], followup: ['Dated follow-up', 'متابعة بموعد'] },
  rule: { prep_request: ['Prep and brief inputs', 'مدخلات التحضير والموجز'], cut_approval: ['Current-cut approval', 'اعتماد النسخة الحالية'], delivery_balance: ['Delivery, payment and rights', 'التسليم والدفع والحقوق'] },
  draftKind: { follow_up: ['Message', 'رسالة'], prep_request: ['Prep request', 'طلب تحضير'], cut_approval: ['Cut approval chase', 'متابعة اعتماد النسخة'], delivery_balance: ['Delivery or balance', 'تسليم أو رصيد'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Queued to send', 'في قائمة الإرسال'], queued_template: ['Queued as template', 'في قائمة الإرسال بقالب'], provider_submitted: ['Sent to WhatsApp', 'أُرسلت إلى واتساب'],
    delivered: ['Delivered', 'وصلت'], read: ['Read', 'قُرئت'], blocked: ['Blocked (opted out)', 'محظورة (ألغى الاشتراك)'], template_required: ['Needs an approved template', 'تحتاج قالباً معتمداً'], failed: ['Failed', 'فشلت'], cancelled: ['Cancelled', 'أُلغيت'] },
  note: { cancelled: ['Cancelled (left out)', 'ملغى (مستبعد)'], open_overdue: ['Still open past due', 'مفتوح بعد الموعد'], due_moved: ['Due date moved', 'نُقل موعد التسليم'], pending: ['Pending decision', 'بانتظار القرار'],
    costs_not_final: ['Costs not confirmed', 'التكاليف غير مؤكدة'], critical_missing: ['Critical item missing', 'بند حرج ناقص'], tentative: ['Tentative holds', 'حجوزات مبدئية'], committed: ['Committed', 'ملتزم به'], actual: ['Actual', 'فعلي'] },
  segment: { production_type: ['Production type', 'نوع الإنتاج'], client_cohort: ['Client cohort', 'فئة العميل'], deliverable_format: ['Deliverable format', 'صيغة المُخرَج'], resource_category: ['Crew / resource category', 'فئة الطاقم أو المورد'] },
  cohort: { new: ['New client', 'عميل جديد'], repeat: ['Repeat client', 'عميل متكرر'] },
  evidence: { chat: ['In the chat', 'في المحادثة'], email: ['By email', 'بالبريد'], signed: ['Signed document', 'مستند موقّع'], verbal: ['In person or by phone', 'حضورياً أو هاتفياً'], review_link: ['On the review link', 'عبر رابط المراجعة'] },
  method: { bank_transfer: ['Bank transfer', 'تحويل بنكي'], cash: ['Cash', 'نقداً'], card: ['Card', 'بطاقة'], payment_link: ['Payment link', 'رابط دفع'], other: ['Other', 'أخرى'] },
};

/** The word for a stored code; unknown codes are shown as they are. */
export const label = (group, code, ar) => (L[group]?.[code] || [code, code])[ar ? 1 : 0];
/** Choices for a select, in display order. */
export const options = (group, ar) => Object.entries(L[group] || {}).map(([id, pair]) => ({ id, label: pair[ar ? 1 : 0] }));
/** Tones by meaning: blue the customer, yellow in progress, orange the record, green done, coral a problem. */
export const STATUS_TONE = { brief_incomplete: 'blue', quoted: 'blue', awaiting_acceptance: 'blue', booked: 'yellow', preproduction: 'yellow', shooting: 'yellow', editing: 'yellow',
  review: 'orange', accepted: 'orange', delivered: 'green', closed: 'green', on_hold: 'coral', cancelled: 'coral' };
export { BUCKET_TONE };
