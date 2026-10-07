// Owner-facing text for bzns.md checks and save outcomes, in both languages.

const SECTION_LABELS = {
  about: ['About us', 'من نحن'],
  offer: ['What we offer', 'خدماتنا'],
  hours: ['Hours', 'ساعات العمل'],
  location: ['Location', 'الموقع'],
  handoff: ['When to hand over to the team', 'متى تحوّل ليلى للفريق'],
  contact: ['Team contact for customers who ask for a person', 'جهة اتصال الفريق لمن يطلب التحدث مع شخص'],
  faq: ['FAQ', 'الأسئلة الشائعة'],
  areas: ['Areas we cover', 'المناطق التي نغطيها'],
  meta: ['the name and sector lines at the top', 'سطري الاسم والقطاع في الأعلى'],
};

/** @param {string} key @param {'en'|'ar'} lang */
export const sectionLabel = (key, lang = 'en') => SECTION_LABELS[key]?.[lang === 'ar' ? 1 : 0] || key;

const MESSAGES = {
  bzns_too_long: ['Your document is longer than 10,000 characters. Shorten it before publishing.', 'المستند أطول من ١٠٬٠٠٠ حرف. اختصره قبل النشر.'],
  bzns_invalid_characters: ['Remove the hidden control characters (usually from copying text).', 'احذف الرموز المخفية (غالباً من النسخ واللصق).'],
  bzns_name_required: ['Add your business name on the "name:" line at the top.', 'أضف اسم نشاطك في سطر "name:" في الأعلى.'],
  bzns_name_too_long: ['Keep your business name under 100 characters.', 'اجعل اسم النشاط أقل من ١٠٠ حرف.'],
  bzns_sector_required: ['Add your sector on the "sector:" line at the top.', 'أضف مجال نشاطك في سطر "sector:" في الأعلى.'],
  bzns_offer_required: ['Add a "What we offer" section that lists your services or products.', 'أضف قسم "خدماتنا" واذكر فيه خدماتك أو منتجاتك.'],
  bzns_too_many_sections: ['Use at most 40 sections. Merge related ones.', 'استخدم ٤٠ قسماً كحد أقصى. ادمج الأقسام المتشابهة.'],
  bzns_placeholder: ['Replace every [bracket] in {section} with your real details, or delete the line.', 'استبدل كل [قوسين] في {section} بمعلوماتك الحقيقية أو احذف السطر.'],
  bzns_html: ['Remove HTML tags from {section}. Plain text and markdown only.', 'احذف وسوم HTML من {section}. نص عادي وتنسيق markdown فقط.'],
  bzns_money: ['Remove prices or fees from {section}. Layla reads prices from Services & Prices or your Hasib stock.', 'احذف الأسعار أو الرسوم من {section}. تقرأ ليلى الأسعار من الخدمات والأسعار أو من مخزون حاسب.'],
  bzns_contact_too_long: ['Keep {section} to one short line (120 characters at most), for example a phone number and a name.', 'اجعل {section} سطراً قصيراً واحداً (١٢٠ حرفاً كحد أقصى)، مثل رقم هاتف واسم.'],
  bzns_conflict: ['This document changed in another tab. Reload the page to get the latest version before saving.', 'تغيّر هذا المستند في نافذة أخرى. أعد تحميل الصفحة للحصول على آخر نسخة قبل الحفظ.'],
  bzns_invalid: ['Fix the items listed below, then publish again.', 'صحّح البنود المذكورة أدناه ثم انشر مرة أخرى.'],
  operation_conflict: ['A WhatsApp connection step is still finishing. Try publishing again in a minute.', 'ما زالت خطوة ربط واتساب قيد الإنهاء. حاول النشر بعد دقيقة.'],
  session_expired: ['Your setup session expired. Reload the page.', 'انتهت جلسة الإعداد. أعد تحميل الصفحة.'],
  unavailable: ['We could not save right now. Your text is still here; try again.', 'تعذّر الحفظ الآن. نصّك ما زال هنا؛ حاول مرة أخرى.'],
};

/**
 * @param {{ code: string, section?: string, heading?: string }|string} error
 * @param {'en'|'ar'} lang
 */
export function bznsMessage(error, lang = 'en') {
  const { code, section, heading } = typeof error === 'string' ? { code: error } : error;
  const text = (MESSAGES[code] || MESSAGES.unavailable)[lang === 'ar' ? 1 : 0];
  const where = heading ? `"${heading}"` : sectionLabel(section, lang);
  return text.replace('{section}', where || (lang === 'ar' ? 'المستند' : 'the document'));
}

const GROUPED = {
  bzns_placeholder: ['Replace the [brackets] with your real details, or delete those lines, in: {sections}.', 'استبدل ما بين [القوسين] بمعلوماتك الحقيقية أو احذف تلك الأسطر في: {sections}.'],
  bzns_html: ['Remove HTML tags in: {sections}.', 'احذف وسوم HTML في: {sections}.'],
  bzns_money: ['Remove prices or fees in: {sections}. Layla reads prices from Services & Prices or your Hasib stock.', 'احذف الأسعار أو الرسوم في: {sections}. تقرأ ليلى الأسعار من الخدمات والأسعار أو من مخزون حاسب.'],
};

/**
 * One line per problem type, so a fresh template shows a short list rather than one line per section.
 * @param {Array<{ code: string, section?: string, heading?: string }>} errors
 * @param {'en'|'ar'} lang
 * @returns {string[]}
 */
export function bznsMessages(errors, lang = 'en') {
  const ar = lang === 'ar', lines = [], groups = new Map();
  for (const error of errors) {
    if (!GROUPED[error.code]) { lines.push(bznsMessage(error, lang)); continue; }
    const where = error.heading || sectionLabel(error.section, lang);
    groups.set(error.code, [...(groups.get(error.code) || []), where]);
  }
  for (const [code, places] of groups) {
    lines.push(GROUPED[code][ar ? 1 : 0].replace('{sections}', [...new Set(places)].join(ar ? '، ' : ', ')));
  }
  return lines;
}
