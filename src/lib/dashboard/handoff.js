const reasons = {
  customer_requested: ['Customer asked for a person', 'طلب العميل التحدث إلى شخص'],
  team_takeover: ['Taken over by the team', 'استلم الفريق المحادثة'],
  clinical_boundary: ['Request needs the clinical team', 'الطلب يحتاج إلى الفريق الطبي'],
  opportunity_review: ['Opportunity needs review', 'الفرصة تحتاج إلى مراجعة'],
  needs_review: ['Answer needs a team review', 'الإجابة تحتاج إلى مراجعة الفريق'],
  native_reply: ['Replied from WhatsApp', 'تم الرد من واتساب'],
  human_attention: ['Human attention requested', 'تحتاج إلى متابعة الفريق'],
};
export const handoffReason = (reason, ar) => (reasons[reason] || reasons.human_attention)[ar ? 1 : 0];
export const handoffState = (state, ar) => ({ open: ['Waiting for team', 'بانتظار الفريق'], handling: ['Being handled', 'قيد المتابعة'], resolved: ['Resolved · Layla paused', 'تم الحل · ليلى متوقفة'], returned: ['Returned to Layla', 'أُعيدت إلى ليلى'] }[state] || ['Layla can reply', 'يمكن لليلى الرد'])[ar ? 1 : 0];
