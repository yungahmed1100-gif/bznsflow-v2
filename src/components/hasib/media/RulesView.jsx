import React, { useEffect, useState } from 'react';
import { PageHeader } from '../DashboardVisuals';
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
const UNITS = [[1, 'minutes', 'دقائق'], [60, 'hours', 'ساعات'], [1440, 'days', 'أيام']];
const unitFor = minutes => minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;

/** Settings → Follow-up rules for Media: the three rules, their mode and timing, and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const initial = settings?.media;
  const [form, setForm] = useState(null), [saved, setSaved] = useState(false);
  useEffect(() => { if (initial) setForm({ ...initial, extraRoundPrice: (initial.extraRoundPriceMinor || 0) / 1000, rules: initial.rules.map(r => ({ ...r, unit: unitFor(r.offsetMinutes), amount: r.offsetMinutes / unitFor(r.offsetMinutes) })) }); }, [initial]);
  if (!form) return <p className="ld-state" role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>;
  const setRule = (id, patch) => setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const submit = async e => {
    e.preventDefault(); setSaved(false);
    const mediaSettings = { ...Object.fromEntries(WINDOWS.map(([key]) => [key, Number(form[key])])), extraRoundPriceMinor: Math.round(Number(form.extraRoundPrice) * 1000),
      rules: form.rules.map(r => ({ id: r.id, enabled: r.enabled, mode: r.mode, offsetMinutes: Math.round(Number(r.amount) * r.unit) })) };
    if (await onSave({ mediaSettings })) setSaved(true);
  };
  return <form className="hb-rules" onSubmit={submit}>
    <PageHeader icon="repeat" title={tr('Follow-up rules', 'قواعد المتابعة')} description={tr('Each rule opens a task, or writes a draft the manager approves before it is sent. Rules stay off until you switch them on; records older than 30 days are not picked up.', 'كل قاعدة تفتح مهمة أو تكتب مسودة يعتمدها المدير قبل إرسالها. تبقى القواعد متوقفة حتى تفعّلها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.')} />
    {form.rules.map(rule => <fieldset key={rule.id} className="hb-panel hb-rule" data-enabled={rule.enabled ? '' : undefined}>
      <legend>{label('rule', rule.id, ar)}</legend>
      <p className="ld-help">{RULE_HELP[rule.id][ar ? 1 : 0]}</p>
      <label className="ld-check"><input type="checkbox" checked={rule.enabled} onChange={e => setRule(rule.id, { enabled: e.target.checked })} /> {tr('Rule is on', 'القاعدة مفعّلة')}</label>
      <div className="hb-rule-fields">
        <label className="ld-field">{rule.id === 'delivery_balance' ? tr('After', 'بعد') : tr('Before', 'قبل')}
          <input type="number" min="1" step="1" required value={rule.amount} onChange={e => setRule(rule.id, { amount: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit', 'الوحدة')}<select value={rule.unit} onChange={e => setRule(rule.id, { unit: Number(e.target.value) })}>{UNITS.map(([n, en, arabic]) => <option key={n} value={n}>{ar ? arabic : en}</option>)}</select></label>
        <label className="ld-field">{tr('What it does', 'ماذا تفعل')}<select value={rule.mode} onChange={e => setRule(rule.id, { mode: e.target.value })}>
          <option value="task">{tr('Opens a task for the producer', 'تفتح مهمة للمنتج')}</option>
          <option value="draft">{tr('Writes a message for the manager to approve', 'تكتب رسالة يعتمدها المدير')}</option>
        </select></label>
      </div>
      <p className="ld-help">{tr('One attempt per event. Assigned to the production’s producer, or the manager when unassigned.', 'محاولة واحدة لكل حدث. تُسند لمنتج العمل، أو للمدير إن لم يُسند.')}</p>
    </fieldset>)}
    <fieldset className="hb-panel">
      <legend>{tr('Measurement windows and production defaults', 'نوافذ القياس وإعدادات الإنتاج')}</legend>
      <p className="ld-help">{tr('Insights name these values next to each measure.', 'تذكر المؤشرات هذه القيم بجانب كل مقياس.')}</p>
      <div className="hb-rule-fields">
        {WINDOWS.map(([key, en, arabic, min, max]) => <label key={key} className="ld-field">{ar ? arabic : en}<input type="number" required min={min} max={max} step="1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>)}
        <label className="ld-field">{tr('Price of an extra revision round (OMR)', 'سعر جولة تعديل إضافية (ر.ع.)')}<input type="number" required min="0" step="0.001" value={form.extraRoundPrice} onChange={e => setForm(f => ({ ...f, extraRoundPrice: e.target.value }))} /></label>
      </div>
    </fieldset>
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      {saved && <span className="ld-help" role="status">{tr('Saved. Rules apply from the next check.', 'تم الحفظ. تُطبَّق القواعد من الفحص التالي.')}</span>}
    </div>
  </form>;
}
