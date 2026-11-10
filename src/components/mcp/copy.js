// Labels, messages and small helpers for the AI connections page (Arabic and English).
export const DOMAINS = {
  brain: ["BznsBrain", "BznsBrain"],
  business: ["Business", "النشاط"],
  catalog: ["Catalog", "الكتالوج"],
  dashboard: ["Workspace", "مساحة العمل"],
  files: ["Files", "الملفات"],
  hasib: ["Hasib", "حاسب"],
  instagram: ["Instagram", "Instagram"],
  knowledge: ["Knowledge", "المعرفة"],
  messaging: ["Messaging", "المراسلة"],
  onboarding: ["Onboarding", "الإعداد"],
  requests: ["Requests", "الطلبات"],
  setup: ["Setup", "الإعداد"],
  workspace: ["Workspace", "مساحة العمل"],
  tools: ["Tools", "الأدوات"],
  website: ["Website", "الموقع"],
  email: ["Email", "البريد"],
  billing: ["Billing", "الفوترة"],
};
export const DAY_MS = 86400000;
export const RENEW_SOON_DAYS = 5;
export const isActive = (c) => !c.revokedAt && c.expiresAt > Date.now();
export const sameSet = (a = [], b = []) =>
  a.length === b.length && a.every((v) => b.includes(v));

export const AREAS = {
  conversations: ["Conversations and Layla", "المحادثات وليلى"],
  customers: ["Customers", "العملاء"],
  business: ["Business knowledge and catalog", "معلومات النشاط والكتالوج"],
  marketing: ["Marketing", "التسويق"],
  operations: ["Hasib and Adiba", "حاسب وأديبة"],
  team: ["Team", "الفريق"],
  files: ["File transfers", "نقل الملفات"],
};
export const RESULT_LABELS = {
  pending: ["Pending", "قيد التنفيذ"],
  completed: ["Completed", "مكتمل"],
  failed: ["Failed", "تعذّر التنفيذ"],
  outcome_unknown: ["Outcome unknown", "النتيجة غير مؤكّدة"],
  approval_required: ["Awaiting approval", "بانتظار الموافقة"],
  approved: ["Approved", "تمت الموافقة"],
  rejected: ["Rejected", "مرفوض"],
  ready: ["Ready", "جاهز"],
  cancelled: ["Cancelled", "ملغى"],
  submitted: ["Submitted", "تم الإرسال إلى المزوّد"],
  policy_changed: ["Permissions updated", "تم تحديث الصلاحيات"],
  revoked: ["Disconnected", "تم قطع الاتصال"],
  approval_expired: ["Approval expired", "انتهت مهلة الموافقة"],
  invalid_arguments: ["Refused: invalid request", "مرفوض: طلب غير صالح"],
  tool_not_allowed: ["Refused: not permitted", "مرفوض: غير مسموح"],
  rate_limited: ["Refused: too many calls", "مرفوض: طلبات كثيرة"],
  approval_rejected: ["Refused: you rejected it", "مرفوض: رفضته"],
  request_cancelled: ["Refused: request cancelled", "مرفوض: الطلب ملغى"],
};
export const RESULT_TONES = {
  completed: "green",
  approved: "green",
  policy_changed: "green",
  pending: "yellow",
  approval_required: "yellow",
  ready: "yellow",
  submitted: "yellow",
  cancelled: "neutral",
  revoked: "neutral",
};
export function activityName(tool, ar) {
  if (tool === "connection") return ar ? "الاتصال" : "Connection";
  const [, domain = "", ...rest] = tool.split("_");
  const area = DOMAINS[domain]?.[ar ? 1 : 0] || domain;
  return { area, action: rest.join(" ") };
}
export const DONE = {
  policy: ["Permissions saved.", "تم حفظ الصلاحيات."],
  approve: [
    "Approved. Ask your assistant to retry the same request now.",
    "تمت الموافقة. اطلب من مساعدك إعادة المحاولة بالطلب نفسه الآن.",
  ],
  reject: ["Rejected. Nothing was changed.", "تم الرفض. لم يتغيّر شيء."],
  revoke: ["Disconnected. The assistant can no longer reach your workspace.", "تم قطع الاتصال. لم يعد بإمكان المساعد الوصول إلى مساحة عملك."],
};
export const CATEGORIES = {
  messages: ["Messages and campaigns", "الرسائل والحملات"],
  finance: ["Prices and financial approvals", "الأسعار والموافقات المالية"],
  bulk: ["Deletion and bulk changes", "الحذف والتعديلات الجماعية"],
  exports: ["Data exports", "تصدير البيانات"],
  team: ["Team access", "صلاحيات الفريق"],
  publish: ["Publishing, automation and channels", "النشر والأتمتة والقنوات"],
};
export const ERRORS = {
  authorization_changed: [
    "The connection request changed. Reload and review the new request before continuing.",
    "تغيّر طلب الاتصال. أعد التحميل وراجع الطلب الجديد قبل المتابعة.",
  ],
  authorization_expired: [
    "This connection request expired. Start a new connection from your AI assistant.",
    "انتهت صلاحية طلب الاتصال. ابدأ اتصالًا جديدًا من مساعدك.",
  ],
  fresh_sign_in_required: [
    "Verify your account again to change permissions or connect an assistant.",
    "تحقّق من حسابك مجددًا لتغيير الصلاحيات أو ربط المساعد.",
  ],
  access_required: [
    "AI connections come with every BznsFlow plan. Your account doesn’t have an active plan yet.",
    "اتصالات الذكاء الاصطناعي متاحة مع جميع باقات BznsFlow. لا توجد باقة فعّالة في حسابك بعد.",
  ],
  manager_required: [
    "Only the business owner can manage AI connections.",
    "يمكن لمالك النشاط فقط إدارة اتصالات الذكاء الاصطناعي.",
  ],
  setup_required: [
    "Complete your business setup before connecting an assistant.",
    "أكمل إعداد نشاطك قبل ربط المساعد.",
  ],
  approval_stale: [
    "The business record changed. Ask your assistant to prepare a new request.",
    "تغيّر سجل النشاط. اطلب من مساعدك إعداد طلب جديد.",
  ],
  approval_expired: [
    "This approval expired. Ask your assistant to prepare a new request.",
    "انتهت صلاحية الطلب. اطلب من مساعدك إعداد طلب جديد.",
  ],
  mcp_disabled: [
    "AI connections are not enabled yet.",
    "اتصالات الذكاء الاصطناعي غير مفعّلة بعد.",
  ],
  mcp_oauth_not_configured: [
    "The connection service is not ready yet.",
    "خدمة الاتصال غير جاهزة بعد.",
  ],
  connection_limit: [
    "You already have 10 active connections. Disconnect one before adding another.",
    "لديك ١٠ اتصالات فعّالة. اقطع أحدها قبل إضافة اتصال جديد.",
  ],
  approval_limit: [
    "Too many requests are waiting. Approve or reject some first.",
    "هناك طلبات كثيرة بانتظارك. وافق على بعضها أو ارفضها أولًا.",
  ],
  approval_not_found: [
    "This approval was already handled or has expired.",
    "تمت معالجة هذا الطلب أو انتهت صلاحيته.",
  ],
  connection_revoked: [
    "This connection is no longer active. Reconnect from your assistant.",
    "هذا الاتصال لم يعد فعّالًا. أعد الربط من مساعدك.",
  ],
  connection_not_found: [
    "This connection was not found. Reload the page.",
    "لم يُعثر على هذا الاتصال. أعد تحميل الصفحة.",
  ],
  reauthorization_required: [
    "To allow changes, reconnect from your assistant and grant change access.",
    "للسماح بالتعديلات، أعد الربط من مساعدك وامنح صلاحية التعديل.",
  ],
  access_changed: [
    "Your plan or permissions no longer include this action.",
    "لم تعد باقتك أو صلاحياتك تشمل هذا الإجراء.",
  ],
  rate_limited: [
    "Too many attempts. Wait a minute and try again.",
    "محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.",
  ],
  csrf: [
    "Your page session expired. Reload the page and try again.",
    "انتهت جلسة الصفحة. أعد تحميلها وحاول مجددًا.",
  ],
  sign_in_required: [
    "Sign in again to continue.",
    "سجّل الدخول مجددًا للمتابعة.",
  ],
  unavailable: [
    "BznsFlow could not be reached. Check your connection and try again.",
    "تعذّر الوصول إلى BznsFlow. تحقّق من الاتصال وحاول مجددًا.",
  ],
  mcp_pilot_only: [
    "AI connections are temporarily limited. Please try again later.",
    "اتصالات الذكاء الاصطناعي محدودة مؤقتًا. حاول مرة أخرى لاحقًا.",
  ],
};
