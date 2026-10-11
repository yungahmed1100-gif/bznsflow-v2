import React, { useEffect, useState } from 'react';
import { PageHeader } from '../DashboardVisuals';
import { label } from './labels.js';

const RULE_HELP = {
  visit_confirmation: ['Writes a reminder this long before a booked visit that is not confirmed yet. Confirming, moving or cancelling the visit withdraws it. It never names a treatment.',
    'تكتب تذكيراً قبل الزيارة المحجوزة غير المؤكدة بهذه المدة. التأكيد أو النقل أو الإلغاء يسحبها، ولا تذكر أي خدمة.'],
  missed_recovery: ['Writes one invitation to rebook this long after a visit is recorded as missed. Rebooking, a decline or a hold withdraws it. Never urgent, never clinical.',
    'تكتب دعوة واحدة لإعادة الحجز بعد هذه المدة من تسجيل الزيارة فائتة. إعادة الحجز أو الرفض أو الإيقاف يسحبها. بلا استعجال وبلا كلام طبي.'],
  recall: ['Writes a reminder this long before the clinician’s recall date, and again 3 days before. Changing the date, clearing it or booking a visit withdraws it. Hasib never sets the date.',
    'تكتب تذكيراً قبل موعد المراجعة الذي حدده الطبيب بهذه المدة، ومرة أخرى قبل ٣ أيام. تغيير الموعد أو إزالته أو حجز زيارة يسحبها. لا يحدد حاسب الموعد أبداً.'],
  balance_due: ['Writes a private balance reminder this long after a visit balance passes its due date. Paying, a dispute or a refund withdraws it.',
    'تكتب تذكيراً خاصاً بالرصيد بعد هذه المدة من تجاوز رصيد الزيارة موعد استحقاقه. الدفع أو النزاع أو الاسترداد يسحبها.'],
};
const AFTER = new Set(['missed_recovery', 'balance_due']);
const WINDOWS = [
  ['visitMinutes', 'Default visit length (minutes)', 'مدة الزيارة الافتراضية (دقائق)', 5, 480],
  ['lateCancelHours', 'A cancellation is late inside (hours)', 'الإلغاء متأخر خلال (ساعات)', 1, 168],
  ['balanceDueDays', 'Balances are due after (days)', 'الرصيد مستحق بعد (أيام)', 0, 90],
  ['recallWindowDays', 'Recall counts as completed within (days)', 'تُحتسب المراجعة مكتملة خلال (أيام)', 7, 180],
  ['chairDayMinutes', 'Bookable minutes per chair per day', 'الدقائق القابلة للحجز لكل كرسي يومياً', 60, 1440],
  ['openDaysPerWeek', 'Open days per week', 'أيام العمل أسبوعياً', 1, 7],
];
const UNITS = [[1, 'minutes', 'دقائق'], [60, 'hours', 'ساعات'], [1440, 'days', 'أيام']];
const unitFor = minutes => minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;

/** Settings → Follow-up rules for a dental clinic: the four rules (on, writing drafts by default) and the clinic's windows. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const initial = settings?.dental;
  const [form, setForm] = useState(null), [saved, setSaved] = useState(false);
  useEffect(() => { if (initial) setForm({ ...initial, rules: initial.rules.map(r => ({ ...r, unit: unitFor(r.offsetMinutes), amount: r.offsetMinutes / unitFor(r.offsetMinutes) })) }); }, [initial]);
  if (!form) return <p className="ld-state" role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>;
  const setRule = (id, patch) => setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const submit = async e => {
    e.preventDefault(); setSaved(false);
    const dentalSettings = { ...Object.fromEntries(WINDOWS.map(([key]) => [key, Number(form[key])])),
      rules: form.rules.map(r => ({ id: r.id, enabled: r.enabled, mode: r.mode, offsetMinutes: Math.round(Number(r.amount) * r.unit) })) };
    if (await onSave({ dentalSettings })) setSaved(true);
  };
  return <form className="hb-rules" onSubmit={submit}>
    <PageHeader icon="repeat" title={tr('Follow-up rules', 'قواعد المتابعة')} description={tr('Hasib writes these messages by itself from the recorded facts. Each one waits for the manager’s approval before it is sent; records older than 30 days are not picked up.', 'يكتب حاسب هذه الرسائل بنفسه من الحقائق المسجلة، وتنتظر كل رسالة موافقة المدير قبل إرسالها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.')} />
    {form.rules.map(rule => <fieldset key={rule.id} className="hb-panel hb-rule" data-enabled={rule.enabled ? '' : undefined}>
      <legend>{label('rule', rule.id, ar)}</legend>
      <p className="ld-help">{RULE_HELP[rule.id][ar ? 1 : 0]}</p>
      <label className="ld-check"><input type="checkbox" checked={rule.enabled} onChange={e => setRule(rule.id, { enabled: e.target.checked })} /> {tr('Rule is on', 'القاعدة مفعّلة')}</label>
      <div className="hb-rule-fields">
        <label className="ld-field">{AFTER.has(rule.id) ? tr('After', 'بعد') : tr('Before', 'قبل')}
          <input type="number" min="1" step="1" required value={rule.amount} onChange={e => setRule(rule.id, { amount: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit', 'الوحدة')}<select value={rule.unit} onChange={e => setRule(rule.id, { unit: Number(e.target.value) })}>{UNITS.map(([n, en, arabic]) => <option key={n} value={n}>{ar ? arabic : en}</option>)}</select></label>
        <label className="ld-field">{tr('What it does', 'ماذا تفعل')}<select value={rule.mode} onChange={e => setRule(rule.id, { mode: e.target.value })}>
          <option value="draft">{tr('Writes a message for the manager to approve', 'تكتب رسالة يعتمدها المدير')}</option>
          <option value="task">{tr('Opens a task for the team', 'تفتح مهمة للفريق')}</option>
        </select></label>
      </div>
    </fieldset>)}
    <fieldset className="hb-panel">
      <legend>{tr('Clinic windows', 'نوافذ العيادة')}</legend>
      <p className="ld-help">{tr('Insights name these values next to each measure.', 'تذكر المؤشرات هذه القيم بجانب كل مقياس.')}</p>
      <div className="hb-rule-fields">
        {WINDOWS.map(([key, en, arabic, min, max]) => <label key={key} className="ld-field">{ar ? arabic : en}<input type="number" required min={min} max={max} step="1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>)}
      </div>
    </fieldset>
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      {saved && <span className="ld-help" role="status">{tr('Saved. Rules apply from the next check.', 'تم الحفظ. تُطبَّق القواعد من الفحص التالي.')}</span>}
    </div>
  </form>;
}
