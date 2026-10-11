import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
import { label } from './labels.js';

const RULE_HELP = {
  prep_request: ['Opens this long before a booked shoot while client inputs (assets, talent releases) are still missing, as one request for all of them. Stops when they are verified, the plan changes or the production is cancelled.',
    'تُفتح قبل التصوير المحجوز بهذه المدة إذا كانت مدخلات العميل (الملفات، موافقات الظهور) ما زالت ناقصة، في طلب واحد لها جميعاً. تتوقف عند التحقق منها أو تغيير الخطة أو إلغاء الإنتاج.'],
  cut_approval: ['Opens this long before the current cut’s decision is due. A new version replaces it; a decision, feedback or hold ends it. Never for an obsolete cut.',
    'تُفتح قبل موعد قرار النسخة الحالية بهذه المدة. النسخة الجديدة تستبدلها، والقرار أو الملاحظات أو التوقف ينهيها. لا تتابع نسخة قديمة أبداً.'],
  delivery_balance: ['Opens this long after acceptance while the handoff is missing, or after delivery while a balance is owed. Before usage rights end it opens an internal task. It never asserts licensing to the customer.',
    'تُفتح بعد الاعتماد بهذه المدة إذا لم يتم التسليم، أو بعد التسليم إذا بقي رصيد مستحق. قبل انتهاء حقوق الاستخدام تفتح مهمة داخلية. لا تؤكد الترخيص للعميل أبداً.'],
};
const WINDOWS = [
  ['quoteWindowDays', 'Quote-to-booked window (days)', 'نافذة التحويل من عرض إلى حجز (أيام)', 1, 365],
  ['revisionWindowDays', 'Revision cohort window (days)', 'نافذة فوج التعديلات (أيام)', 1, 365],
  ['prepCutoffHours', 'Readiness checkpoint before a shoot (hours)', 'نقطة الجاهزية قبل التصوير (ساعات)', 1, 720],
  ['reviewResponseHours', 'Client decision due after a cut (hours)', 'موعد قرار العميل بعد النسخة (ساعات)', 1, 720],
  ['revisionAllowance', 'Revision rounds included by default', 'جولات التعديل المشمولة افتراضياً', 0, 20],
  ['depositPercent', 'Deposit (% of the quote)', 'الدفعة المقدمة (٪ من العرض)', 0, 100],
  ['resourceHoursPerDay', 'Available hours per resource per day', 'الساعات المتاحة لكل مورد يومياً', 1, 24],
  ['holdHours', 'A tentative hold lasts (hours)', 'مدة الحجز المبدئي (ساعات)', 1, 720],
];
/** Settings → Follow-up rules for Media: the three rules, their mode and timing, and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="media" argKey="mediaSettings" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} modeOrder={['task', 'draft']} taskLabel={['Opens a task for the producer', 'تفتح مهمة للمنتج']}
    description={['Each rule opens a task, or writes a draft the manager approves before it is sent. Rules stay off until you switch them on; records older than 30 days are not picked up.', 'كل قاعدة تفتح مهمة أو تكتب مسودة يعتمدها المدير قبل إرسالها. تبقى القواعد متوقفة حتى تفعّلها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.']}
    offsetLabel={rule => rule.id === 'delivery_balance' ? ['After', 'بعد'] : ['Before', 'قبل']}
    ruleNote={['One attempt per event. Assigned to the production’s producer, or the manager when unassigned.', 'محاولة واحدة لكل حدث. تُسند لمنتج العمل، أو للمدير إن لم يُسند.']}
    legend={['Measurement windows and production defaults', 'نوافذ القياس وإعدادات الإنتاج']}
    extra={{ init: (s, initial) => ({ extraRoundPrice: (initial?.extraRoundPriceMinor || 0) / 1000 }), inner: form => ({ extraRoundPriceMinor: Math.round(Number(form.extraRoundPrice) * 1000) }),
      fields: (form, setForm, tr) => <label className="ld-field">{tr('Price of an extra revision round (OMR)', 'سعر جولة تعديل إضافية (ر.ع.)')}<input type="number" required min="0" step="0.001" value={form.extraRoundPrice} onChange={e => setForm(f => ({ ...f, extraRoundPrice: e.target.value }))} /></label> }} />;
}
