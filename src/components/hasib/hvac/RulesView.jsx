import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
import { label } from './labels.js';

const RULE_HELP = {
  visit_reminder: [
    'Sends a reminder with the booked window this long before a visit. Moving or cancelling the visit withdraws it and a moved visit gets its own. Only facts: the job number and the window.',
    'ترسل تذكيراً بنافذة الزيارة قبلها بهذه المدة. نقل الزيارة أو إلغاؤها يسحبها، والزيارة المنقولة تحصل على تذكيرها. حقائق فقط: رقم العمل والنافذة.',
  ],
  job_complete: [
    'Tells the customer the job is complete, with the recorded balance, this long after it is marked completed.',
    'تخبر العميل باكتمال العمل مع الرصيد المسجل بعد هذه المدة من تسجيل الاكتمال.',
  ],
  estimate_followup: [
    'Writes a follow-up this long after an estimate is sent, and again at day 7. A reply, a decision, a new version or the estimate expiring withdraws it.',
    'تكتب متابعة بعد إرسال التسعيرة بهذه المدة، ومرة أخرى في اليوم السابع. الرد أو القرار أو نسخة جديدة أو انتهاء التسعيرة يسحبها.',
  ],
  service_due: [
    'Writes a reminder this long before the service date the technician set, and for contract visits nobody has booked. A job for the unit withdraws it. Hasib never sets the date.',
    'تكتب تذكيراً قبل موعد الصيانة الذي حدده الفني بهذه المدة، ولزيارات العقود غير المحجوزة. فتح عمل للوحدة يسحبها. لا يحدد حاسب الموعد أبداً.',
  ],
  amc_renewal: [
    'Writes a renewal message this long before a contract ends, and again 7 days before. Renewing or cancelling withdraws it. Always waits for you unless you switch it to Auto.',
    'تكتب رسالة تجديد قبل انتهاء العقد بهذه المدة، ومرة أخرى قبل ٧ أيام. التجديد أو الإلغاء يسحبها.',
  ],
  balance_due: [
    'Writes a private balance reminder this long after a job is completed or a contract activated with money still owed. Paying withdraws it.',
    'تكتب تذكيراً خاصاً بالرصيد بعد هذه المدة من اكتمال العمل أو تفعيل العقد مع وجود مبلغ مستحق. الدفع يسحبها.',
  ],
  parts_delay: [
    'Opens a task for the team this long after the parts’ expected date (or after the job started waiting). Nothing is sent to the customer by itself.',
    'تفتح مهمة للفريق بعد هذه المدة من الموعد المتوقع للقطع (أو من بدء الانتظار). لا يُرسل شيء للعميل تلقائياً.',
  ],
  visit_unrecorded: [
    'Opens a task for the technician this long after a visit window ends with no arrival recorded. Recording the arrival closes it.',
    'تفتح مهمة للفني بعد انتهاء نافذة الزيارة بهذه المدة دون تسجيل وصول. تسجيل الوصول يغلقها.',
  ],
};
const AFTER = new Set(['job_complete', 'estimate_followup', 'balance_due', 'parts_delay', 'visit_unrecorded']);
const WINDOWS = [
  [
    'arrivalGraceMinutes',
    'Arrival counts as on time up to (minutes after the window)',
    'يُحتسب الوصول في الموعد حتى (دقائق بعد النافذة)',
    0,
    240,
  ],
  [
    'repeatWindowDays',
    'A return for the same unit counts as a repeat within (days)',
    'تُحتسب العودة لنفس الوحدة تكراراً خلال (أيام)',
    7,
    90,
  ],
  ['estimateWindowDays', 'Estimates stay valid for (days)', 'تبقى التسعيرات صالحة لمدة (أيام)', 1, 60],
  ['bookingWindowDays', 'A request counts as booked within (days)', 'يُحتسب الطلب محجوزاً خلال (أيام)', 1, 30],
  ['renewalHorizonDays', 'Show renewals due within (days)', 'إظهار التجديدات المستحقة خلال (أيام)', 7, 120],
  [
    'renewalGraceDays',
    'A renewal still counts within (days after the end)',
    'يُحتسب التجديد خلال (أيام بعد الانتهاء)',
    0,
    60,
  ],
  [
    'amcVisitLeadDays',
    'Open contract visits as jobs (days before due)',
    'فتح زيارات العقود كأعمال (أيام قبل الموعد)',
    1,
    60,
  ],
];
// Hasib's estimate limit (entered in OMR) and the areas the business serves (one per line).
const EXTRA = {
  init: (s, initial) => ({
    autoQuoteLimit: (initial?.autoQuoteLimitMinor || 0) / 1000,
    areas: (initial?.serviceAreas || []).join('\n'),
  }),
  inner: form => ({
    autoQuoteLimitMinor: Math.round(Number(form.autoQuoteLimit) * 1000),
    serviceAreas: String(form.areas || '')
      .split(/\n|,|،/)
      .map(a => a.trim())
      .filter(Boolean)
      .slice(0, 30),
  }),
  fields: (form, setForm, tr) => (
    <>
      <label className="ld-field">
        {tr(
          'Hasib sends a catalog-priced estimate by himself up to (OMR, 0 = off)',
          'يرسل حاسب التسعيرة بأسعار الكتالوج تلقائياً حتى (ر.ع، ٠ = متوقف)',
        )}
        <input
          type="number"
          required
          min="0"
          step="0.001"
          name="autoQuoteLimit"
          value={form.autoQuoteLimit}
          onChange={e => setForm(f => ({ ...f, autoQuoteLimit: e.target.value }))}
        />
        <small>
          {tr(
            'Only when every line is a fixed catalog price. A typed price always comes to you first, through Adiba.',
            'فقط عندما يكون كل بند بسعر ثابت من الكتالوج. السعر المكتوب يصلك أولاً دائماً عبر أديبة.',
          )}
        </small>
      </label>
      <label className="ld-field">
        {tr(
          'Areas you serve (one per line; empty = everywhere)',
          'المناطق التي تخدمها (واحدة في كل سطر؛ فارغ = كل المناطق)',
        )}
        <textarea
          name="areas"
          rows={3}
          value={form.areas}
          onChange={e => setForm(f => ({ ...f, areas: e.target.value }))}
        />
        <small>
          {tr(
            'A request from elsewhere is flagged for the team, never declined.',
            'الطلب من منطقة أخرى يُنبَّه عليه للفريق ولا يُرفض.',
          )}
        </small>
      </label>
    </>
  ),
};
/** Settings → Follow-up rules for an AC business: eight rules (facts send themselves, decisions wait, risks are tasks) and the business's windows. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return (
    <RulesForm
      ar={ar}
      h={h}
      settings={settings}
      busy={busy}
      onSave={onSave}
      settingsKey="hvac"
      argKey="hvacSettings"
      ruleLabel={id => label('rule', id, ar)}
      modeOrder={['auto', 'draft', 'task']}
      extra={EXTRA}
      ruleHelp={RULE_HELP}
      windows={WINDOWS}
      taskLabel={['Opens a task for the team', 'تفتح مهمة للفريق']}
      description={[
        'Hasib writes these messages by itself from the recorded facts. Rules set to Auto send on their own inside WhatsApp’s 24-hour window (at most 3 a day per customer, never while your team handles the chat); the rest wait for your approval. Records older than 30 days are not picked up.',
        'يكتب حاسب هذه الرسائل بنفسه من الحقائق المسجلة. القواعد المضبوطة على «تلقائي» تُرسل وحدها داخل نافذة واتساب ٢٤ ساعة (٣ رسائل يومياً لكل عميل كحد أقصى، ولا تُرسل أثناء تولي فريقك المحادثة)؛ والبقية تنتظر موافقتك. لا تُلتقط السجلات الأقدم من ٣٠ يوماً.',
      ]}
      offsetLabel={rule => (AFTER.has(rule.id) ? ['After', 'بعد'] : ['Before', 'قبل'])}
      legend={['Business windows', 'نوافذ العمل']}
    />
  );
}
