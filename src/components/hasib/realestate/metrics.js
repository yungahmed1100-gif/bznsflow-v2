// What each Real Estate KPI is called and how it is calculated, in the owner's words.
// The window, SLA and cancellation values come from Settings, so a definition always names them.
const D = 86400000, H = 3600000;

export const METRICS = {
  qualified_to_viewing: {
    en: 'Qualified-to-viewing conversion', ar: 'التحويل من مؤهل إلى معاينة',
    def: (s, ar) => ar ? `الصفقات المؤهلة التي حضرت معاينة خلال ${s.viewingWindowDays} يوماً من تأهيلها ÷ الصفقات المؤهلة التي اكتملت نافذتها. لا تُحتسب الصفقات المؤهلة حديثاً حتى تكتمل نافذتها.`
      : `Qualified deals with an attended viewing within ${s.viewingWindowDays} days of qualifying ÷ qualified deals whose ${s.viewingWindowDays}-day window has passed. Recently qualified deals wait until their window ends.`,
    owner: ['Sales lead · weekly', 'مسؤول المبيعات · أسبوعياً'],
  },
  viewing_attendance: {
    en: 'Viewing attendance', ar: 'حضور المعاينات',
    def: (s, ar) => ar ? `المعاينات المحضورة ÷ المعاينات المستحقة في الفترة (محضورة أو فائتة أو أُلغيت قبل أقل من ${s.lateCancelHours} ساعة). الإلغاء المبكر لا يُحتسب ويظهر منفصلاً.`
      : `Attended ÷ viewings due in the period that were attended, missed or cancelled less than ${s.lateCancelHours} hours ahead. A cancellation in good time is left out and shown separately.`,
    owner: ['Agent manager · daily', 'مدير الوكلاء · يومياً'],
  },
  unanswered_qualified: {
    en: 'Unanswered qualified inquiries', ar: 'استفسارات مؤهلة بلا رد',
    def: (s, ar) => ar ? `الصفقات المؤهلة المفتوحة التي لم يُرد على آخر رسالة من العميل فيها خلال ${s.responseSlaMinutes} دقيقة. يُقاس بالوقت الفعلي، لا بساعات العمل.`
      : `Open qualified deals whose customer’s latest message has had no reply for more than ${s.responseSlaMinutes} minutes. Measured in clock time, not business hours.`,
    owner: ['Team lead · daily', 'قائد الفريق · يومياً'],
  },
  commission_overdue: {
    en: 'Commission overdue', ar: 'عمولة متأخرة',
    def: (s, ar) => ar ? 'مجموع أرصدة العمولة غير المدفوعة التي تجاوزت تاريخ استحقاقها المسجّل. العمولة بلا تاريخ استحقاق تظهر منفصلة.'
      : 'Unpaid commission balances past their recorded due date. Commission without a due date is shown separately, never counted as zero.',
    owner: ['Owner · daily', 'المالك · يومياً'],
  },
  qualified_to_close: {
    en: 'Qualified-to-close conversion', ar: 'التحويل من مؤهل إلى إغلاق',
    def: (s, ar) => ar ? `الصفقات المؤهلة التي رُبحت خلال ${s.closeWindowDaysRent} يوماً للإيجار أو ${s.closeWindowDaysSale} يوماً للبيع ÷ الصفقات المؤهلة التي اكتملت نافذتها.`
      : `Qualified deals won within ${s.closeWindowDaysRent} days (rent) or ${s.closeWindowDaysSale} days (sale) ÷ qualified deals whose window has passed.`,
    owner: ['Owner · monthly', 'المالك · شهرياً'],
  },
  time_to_viewing: {
    en: 'Time to viewing', ar: 'الوقت حتى المعاينة',
    def: (s, ar) => ar ? 'الوسيط وP90 للوقت من التأهيل حتى أول معاينة محضورة، للصفقات المؤهلة في الفترة. الصفقات التي لم تُعاين بعد تظهر بعمرها.'
      : 'Median and 90th percentile from qualifying to the first attended viewing, for deals qualified in the period. Deals still without a viewing show their age separately.',
    owner: ['Sales lead · weekly', 'مسؤول المبيعات · أسبوعياً'],
  },
  listing_freshness: {
    en: 'Listing freshness', ar: 'حداثة الإعلانات',
    def: (s, ar) => ar ? `الإعلانات المتاحة التي تم التحقق منها خلال ${s.listingFreshnessDays} يوماً ÷ الإعلانات المتاحة. لا تُقترح الإعلانات القديمة على العملاء.`
      : `Available listings verified in the last ${s.listingFreshnessDays} days ÷ available listings. Stale listings are never suggested to customers.`,
    owner: ['Listing owner · daily', 'مسؤول الإعلانات · يومياً'],
  },
  offer_backlog: {
    en: 'Offer decision backlog', ar: 'عروض تنتظر القرار',
    def: (s, ar) => ar ? 'العروض الحية التي تجاوزت موعد القرار المسجّل، مع قيمتها وعمرها. قيمة العرض ليست دخلاً. العروض بلا موعد قرار تظهر منفصلة.'
      : 'Live offers past their recorded decision time, with their value and age. An offer’s value is not income. Offers without a decision time are shown separately.',
    owner: ['Agent manager · daily', 'مدير الوكلاء · يومياً'],
  },
};

/** A duration in the largest unit that reads well. */
export function duration(ms, ar) {
  if (ms == null) return null;
  if (ms >= 2 * D) return ar ? `${Math.round(ms / D * 10) / 10} يوم` : `${Math.round(ms / D * 10) / 10} days`;
  if (ms >= H) return ar ? `${Math.round(ms / H * 10) / 10} ساعة` : `${Math.round(ms / H * 10) / 10} h`;
  return ar ? `${Math.max(1, Math.round(ms / 60000))} دقيقة` : `${Math.max(1, Math.round(ms / 60000))} min`;
}
