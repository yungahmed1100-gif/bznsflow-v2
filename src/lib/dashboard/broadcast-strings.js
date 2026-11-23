// Broadcast wording that the main dashboard copy spreads in: why a broadcast stopped, what Meta's
// common failure codes mean, and resending to the people a broadcast did not reach.
export const BROADCAST_STRINGS = {
  en: {
    campReason_payment_method_required: 'Stopped: Meta needs a working payment method on your Messaging account.',
    campReason_connection_not_ready: 'Stopped: the WhatsApp connection needs checking.',
    campReason_template_unavailable: 'Stopped: this template no longer exists in WhatsApp Manager.',
    campReason_template_paused: 'Stopped: Meta paused this template.',
    campReason_template_disabled: 'Stopped: Meta disabled this template.',
    campReason_template_policy: 'Stopped: Meta refused this template under its policies.',
    campReason_template_not_approved: 'Stopped: this template is no longer approved.',
    campReason_broadcast_paused: 'Stopped: broadcast sending is switched off.',
    campReason_broadcast_unavailable: 'Stopped: broadcast sending is switched off.',
    campReason_messaging_limit_unknown: 'Stopped: Meta didn’t confirm your sending limit. Try again later.',
    campReason_start_checks_failed: 'Stopped: the checks before sending didn’t pass. Try again.',
    campReason_mcp_connection_revoked: 'Stopped: the AI connection that scheduled this broadcast was removed.',
    campReason_rollout_restricted: 'Stopped: sending isn’t open for this account yet.',
    metaError_131042: 'Meta payment issue',
    metaError_131026: 'Can’t receive WhatsApp messages',
    metaError_131049: 'Meta limited marketing messages to this person',
    metaError_131047: 'More than 24 hours since they last wrote',
    resendFailed: 'Resend to {count} who didn’t get it',
    resendTitle: 'Resend broadcast',
    resendIntro:
      'This sends “{name}” again, only to the people it didn’t reach. Anyone who already got it is left out.',
    resendPaymentNote:
      'This broadcast stopped on a Meta payment issue. Fix the payment method first, or these messages will fail again.',
    resendOverLimit: 'That’s more than WhatsApp allows for this number today ({cap} left). Try again tomorrow.',
    resendChip: 'Resend',
    reason_contact_changed: 'Number changed since the broadcast',
    feesCheck: 'Check payment method again',
    feesNotFound:
      'Meta doesn’t show a payment method on your Messaging account yet. Add one in Meta Billing & payments, then check again.',
    feesFound:
      'Meta shows a payment method on your Messaging account. You can resend to the people the broadcast didn’t reach.',
  },
  ar: {
    campReason_payment_method_required: 'توقفت: تحتاج Meta إلى وسيلة دفع صالحة في حساب المراسلة.',
    campReason_connection_not_ready: 'توقفت: اتصال واتساب يحتاج إلى فحص.',
    campReason_template_unavailable: 'توقفت: هذا القالب لم يعد موجوداً في مدير واتساب.',
    campReason_template_paused: 'توقفت: أوقفت Meta هذا القالب مؤقتاً.',
    campReason_template_disabled: 'توقفت: عطّلت Meta هذا القالب.',
    campReason_template_policy: 'توقفت: رفضت Meta هذا القالب بموجب سياساتها.',
    campReason_template_not_approved: 'توقفت: هذا القالب لم يعد معتمداً.',
    campReason_broadcast_paused: 'توقفت: إرسال الرسائل الجماعية متوقف.',
    campReason_broadcast_unavailable: 'توقفت: إرسال الرسائل الجماعية متوقف.',
    campReason_messaging_limit_unknown: 'توقفت: لم تؤكد Meta حد الإرسال لديك. حاول لاحقاً.',
    campReason_start_checks_failed: 'توقفت: لم تنجح الفحوص قبل الإرسال. حاول مجدداً.',
    campReason_mcp_connection_revoked: 'توقفت: أُزيل اتصال الذكاء الاصطناعي الذي جدول هذه الرسالة.',
    campReason_rollout_restricted: 'توقفت: الإرسال غير متاح لهذا الحساب بعد.',
    metaError_131042: 'مشكلة دفع لدى Meta',
    metaError_131026: 'لا يستقبل رسائل واتساب',
    metaError_131049: 'حدّت Meta الرسائل التسويقية لهذا الشخص',
    metaError_131047: 'مرّت أكثر من ٢٤ ساعة منذ آخر رسالة منه',
    resendFailed: 'إعادة الإرسال إلى {count} لم تصلهم',
    resendTitle: 'إعادة إرسال الرسالة الجماعية',
    resendIntro: 'نرسل «{name}» مرة أخرى إلى من لم تصلهم فقط. من استلمها سابقاً لن تُرسل إليه.',
    resendPaymentNote:
      'توقفت هذه الرسالة بسبب مشكلة دفع لدى Meta. أصلح وسيلة الدفع أولاً، وإلا ستفشل هذه الرسائل مجدداً.',
    resendOverLimit: 'العدد أكبر مما يسمح به واتساب لهذا الرقم اليوم (المتبقي {cap}). حاول غداً.',
    resendChip: 'إعادة إرسال',
    reason_contact_changed: 'تغيّر الرقم بعد الرسالة',
    feesCheck: 'تحقّق من وسيلة الدفع مجدداً',
    feesNotFound:
      'لا تُظهر Meta وسيلة دفع في حساب المراسلة بعد. أضفها في «الفوترة والمدفوعات» في Meta، ثم تحقّق مجدداً.',
    feesFound: 'تُظهر Meta وسيلة دفع في حساب المراسلة. يمكنك إعادة الإرسال إلى من لم تصلهم الرسالة.',
  },
};
/** Refusals of the resend action, merged into the dashboard's reasons. */
export const BROADCAST_REASONS = {
  en: {
    campaign_not_resendable: 'This broadcast can’t be resent until it has finished or stopped.',
    meta_connection_unavailable: 'Couldn’t reach Meta to check. Try again in a minute.',
    campaign_not_payment_stopped: 'This broadcast wasn’t stopped for a payment problem.',
  },
  ar: {
    campaign_not_resendable: 'لا يمكن إعادة إرسال هذه الرسالة قبل أن تكتمل أو تتوقف.',
    meta_connection_unavailable: 'تعذّر الوصول إلى Meta للتحقق. حاول بعد دقيقة.',
    campaign_not_payment_stopped: 'لم تتوقف هذه الرسالة الجماعية بسبب مشكلة في الدفع.',
  },
};
