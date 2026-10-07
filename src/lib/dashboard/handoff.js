const reasons = {
  customer_requested: ['Customer asked for a person', 'طلب العميل التحدث إلى شخص'],
  team_takeover: ['Taken over by the team', 'استلم الفريق المحادثة'],
  clinical_boundary: ['Request needs the clinical team', 'الطلب يحتاج إلى الفريق الطبي'],
  opportunity_review: ['Opportunity needs review', 'الفرصة تحتاج إلى مراجعة'],
  needs_review: ['Answer needs a team review', 'الإجابة تحتاج إلى مراجعة الفريق'],
  native_reply: ['Replied from WhatsApp', 'تم الرد من واتساب'],
  human_attention: ['Human attention requested', 'تحتاج إلى متابعة الفريق'],
  negotiation: ['Customer is negotiating price', 'العميل يتفاوض على السعر'],
  abuse: ['Abusive message', 'رسالة مسيئة'],
  advice_boundary: ['Legal or financial advice requested', 'طلب استشارة قانونية أو مالية'],
  unsupported_media: ['Photo, voice note or file sent', 'أرسل العميل صورة أو رسالة صوتية أو ملفاً'],
  too_long: ['Long message needs reading', 'رسالة طويلة تحتاج إلى قراءة'],
  reply_limit: ['Many messages in a short time', 'رسائل كثيرة في وقت قصير'],
  rate_limit: ['Reply held by the sending limit', 'الرد متوقف بسبب حد الإرسال'],
};
export const handoffReason = (reason, ar) => (reasons[reason] || reasons.human_attention)[ar ? 1 : 0];
export const handoffState = (state, ar) => ({ open: ['Waiting for team', 'بانتظار الفريق'], handling: ['Being handled', 'قيد المتابعة'], resolved: ['Resolved · Layla paused', 'تم الحل · ليلى متوقفة'], returned: ['Returned to Layla', 'أُعيدت إلى ليلى'] }[state] || ['Layla can reply', 'يمكن لليلى الرد'])[ar ? 1 : 0];
