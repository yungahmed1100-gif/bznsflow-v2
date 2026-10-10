// Plain English and Arabic for every Real Estate code the server sends.
const L = {
  stage: { new: ['New', 'جديدة'], contacted: ['Contacted', 'تم التواصل'], qualified: ['Qualified', 'مؤهلة'], viewing: ['Viewing', 'معاينة'], offer: ['Offer', 'عرض'], won: ['Won', 'رابحة'], lost: ['Lost', 'خاسرة'] },
  need: { buy: ['Buy', 'شراء'], rent: ['Rent', 'إيجار'], sell: ['Sell', 'بيع'], invest: ['Invest', 'استثمار'] },
  viewing: { requested: ['Requested', 'مطلوبة'], confirmed: ['Confirmed', 'مؤكدة'], completed: ['Completed', 'مكتملة'], missed: ['Missed', 'فائتة'], cancelled: ['Cancelled', 'ملغاة'] },
  offer: { draft: ['Waiting for approval', 'بانتظار الموافقة'], approved: ['Approved', 'معتمد'], presented: ['Presented', 'مقدَّم'], countered: ['Countered', 'عرض مضاد'], accepted: ['Accepted', 'مقبول'], rejected: ['Rejected', 'مرفوض'], withdrawn: ['Withdrawn', 'مسحوب'] },
  draft: { draft: ['Waiting for approval', 'بانتظار الموافقة'], queued: ['Sending', 'قيد الإرسال'], queued_template: ['Sending as template', 'يُرسل كقالب'], provider_submitted: ['Sent', 'أُرسلت'],
    template_required: ['Needs an approved template', 'يحتاج قالباً معتمداً'], blocked: ['Not sent (customer opted out)', 'لم تُرسل (ألغى العميل الاشتراك)'], failed: ['Failed to send', 'تعذّر الإرسال'],
    delivered: ['Delivered', 'تم التسليم'], read: ['Read', 'تمت القراءة'], cancelled: ['Cancelled (no longer needed)', 'أُلغيت (لم تعد لازمة)'] },
  draftKind: { follow_up: ['Follow-up', 'متابعة'], viewing_confirmation: ['Viewing confirmation', 'تأكيد معاينة'], offer: ['Offer message', 'رسالة عرض'] },
  availability: { available: ['Available', 'متاح'], reserved: ['Reserved', 'محجوز'], unavailable: ['Sold or let', 'مباع أو مؤجر'] },
  authority: { confirmed: ['Authority to market confirmed', 'صلاحية التسويق مؤكدة'], pending: ['Authority pending', 'الصلاحية معلقة'], expired: ['Authority expired', 'انتهت الصلاحية'] },
  transaction: { sale: ['Sale', 'بيع'], rent: ['Rent', 'إيجار'] },
  propertyType: { apartment: ['apartment', 'شقة'], flat: ['flat', 'شقة'], villa: ['villa', 'فيلا'], townhouse: ['townhouse', 'تاون هاوس'], land: ['land', 'أرض'], office: ['office', 'مكتب'], shop: ['shop', 'محل'], warehouse: ['warehouse', 'مستودع'], building: ['building', 'مبنى'] },
  finance: { cash: ['Cash buyer', 'دفع نقدي'], approved: ['Finance approved', 'التمويل موافق عليه'], ready: ['Finance ready', 'التمويل جاهز'], in_progress: ['Finance in progress', 'التمويل قيد الإجراء'], unknown: ['Not known yet', 'غير معروف بعد'] },
  decision: { ready: ['Decides alone', 'صاحب القرار'], consulting: ['Consulting others', 'يستشير آخرين'], unknown: ['Not known yet', 'غير معروف بعد'] },
  match: { suggested: ['Suggested', 'مقترح'], interested: ['Interested', 'مهتم'], rejected: ['Not interested', 'غير مهتم'] },
  check: { identity: ['Customer identity', 'هوية العميل'], authority: ['Authority to sell or let', 'صلاحية البيع أو التأجير'], financing: ['Financing', 'التمويل'], agreement: ['Signed agreement', 'الاتفاقية الموقعة'], completion: ['Completion and handover', 'الإتمام والتسليم'] },
  checkStatus: { pending: ['Pending', 'معلق'], confirmed: ['Confirmed', 'مؤكد'], not_applicable: ['Not applicable', 'لا ينطبق'] },
  commission: { due: ['Due', 'مستحقة'], paid: ['Paid', 'مدفوعة'] },
  task: { first_response_overdue: ['First reply is late', 'تأخّر الرد الأول'], second_attempt_overdue: ['Second reply is late', 'تأخّرت المحاولة الثانية'], stale_listing: ['Listing needs verifying', 'الإعلان يحتاج تحققاً'],
    viewing_outcome_missing: ['Viewing has no outcome', 'معاينة بلا نتيجة'], offer_unanswered: ['Offer waiting for an answer', 'عرض بانتظار الرد'], no_verified_match: ['No verified listing matches', 'لا يوجد إعلان موثّق مطابق'],
    template_required: ['Message needs an approved template', 'الرسالة تحتاج قالباً معتمداً'], send_failed: ['A reply failed to send', 'تعذّر إرسال رد'],
    rule_missing_requirements: ['Ask for the missing requirements', 'اطلب المتطلبات الناقصة'], rule_viewing_confirmation: ['Confirm the viewing', 'أكّد المعاينة'], rule_post_viewing_decision: ['Ask how the viewing went', 'اسأل عن رأيه في المعاينة'], followup: ['Follow-up', 'متابعة'] },
  rule: { missing_requirements: ['Missing requirements', 'متطلبات ناقصة'], viewing_confirmation: ['Viewing confirmation', 'تأكيد المعاينة'], post_viewing_decision: ['Decision after a viewing', 'القرار بعد المعاينة'] },
  bucket: { today: ['Today', 'اليوم'], overdue: ['Overdue', 'متأخرة'], scheduled: ['Scheduled', 'مجدولة'], approval: ['Needs approval', 'تحتاج موافقة'], blocked: ['Blocked or failed', 'متوقفة أو فشلت'], completed: ['Completed', 'مكتملة'] },
  quick: { all: ['All open', 'كل المفتوحة'], mine: ['My deals', 'صفقاتي'], unassigned: ['Unassigned', 'غير مُسندة'], awaiting: ['Awaiting response', 'بانتظار الرد'], viewing_due: ['Viewing due', 'معاينة قريبة'] },
  segment: { need: ['Rental vs sale', 'إيجار أو بيع'], property_type: ['Property type', 'نوع العقار'], source: ['Lead source', 'مصدر العميل'], agent: ['Assigned agent', 'الوكيل المسؤول'] },
  segmentKey: { rent: ['Rental', 'إيجار'], sale: ['Sale', 'بيع'], unassigned: ['Unassigned', 'غير مُسندة'], unknown: ['Not recorded', 'غير مسجّل'], whatsapp: ['WhatsApp', 'واتساب'], instagram: ['Instagram', 'إنستغرام'], manual: ['Added by the team', 'أضافه الفريق'] },
  note: { timely_cancel: ['Cancelled in good time', 'أُلغيت مبكراً'], late_cancel: ['Cancelled late', 'أُلغيت متأخرة'], outcome_missing: ['Outcome not recorded', 'النتيجة غير مسجّلة'], completed: ['Attended', 'حضر'], missed: ['Missed', 'فاتت'],
    no_due_date: ['No due date', 'بلا تاريخ استحقاق'], no_decision_date: ['No decision date', 'بلا موعد قرار'], open: ['No viewing yet', 'لا معاينة بعد'] },
};

/** `label('stage', 'won', ar)` → "Won" / "رابحة"; unknown codes fall back to the code itself. */
export const label = (group, code, ar) => (L[group]?.[code]?.[ar ? 1 : 0]) || code || '—';
export const options = (group, ar, codes = Object.keys(L[group])) => codes.map(id => ({ id, label: label(group, id, ar) }));

export const OPEN_STAGES = ['new', 'contacted', 'qualified', 'viewing', 'offer'];
export const CHECKS = ['identity', 'authority', 'financing', 'agreement', 'completion'];
export const LOST_REASONS = [['bought_elsewhere', 'Bought or rented elsewhere', 'اشترى أو استأجر من جهة أخرى'], ['budget', 'Budget does not fit', 'الميزانية غير مناسبة'],
  ['no_response', 'Customer stopped responding', 'توقّف العميل عن الرد'], ['not_ready', 'Not ready to move', 'غير مستعد للانتقال'], ['other', 'Other', 'أخرى']];
// Where each viewing and offer may go next (mirrors convex/hasib/realEstateState.js).
export const VIEWING_NEXT = { requested: ['confirmed', 'completed', 'missed', 'cancelled'], confirmed: ['completed', 'missed', 'cancelled'] };
export const OFFER_NEXT = { approved: ['presented', 'withdrawn'], presented: ['countered', 'accepted', 'rejected', 'withdrawn'], countered: ['countered', 'presented', 'accepted', 'rejected', 'withdrawn'] };
/** Steps that end something, which ask for confirmation first. */
export const FINAL_STEPS = new Set(['accepted', 'rejected', 'withdrawn', 'cancelled', 'missed']);
