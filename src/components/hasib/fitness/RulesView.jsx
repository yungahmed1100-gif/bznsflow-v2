import React, { useEffect, useState } from 'react';
import { PageHeader } from '../DashboardVisuals';
import { label } from './labels.js';

const RULE_HELP = {
  trial_reminder: ['Writes a reminder this long before a booked trial class. Stops on attendance, cancellation or a moved class. It never makes health claims.',
    'تكتب تذكيراً قبل الحصة التجريبية المحجوزة بهذه المدة. تتوقف عند الحضور أو الإلغاء أو تغيير الموعد، ولا تذكر أي ادعاءات صحية.'],
  attendance_gap: ['Writes one supportive invitation this long after an active member crosses the gap below. A visit, a freeze, a reply or an opt-out withdraws it. Never shaming, never a diagnosis.',
    'تكتب دعوة لطيفة واحدة بعد هذه المدة من تجاوز العضو النشط فترة الانقطاع أدناه. الزيارة أو التجميد أو الرد أو إلغاء الاشتراك تسحبها. بلا لوم ولا تشخيص.'],
  renewal: ['Writes a renewal reminder this long before the membership ends (a freeze moves the end). Renewing, cancelling or freezing withdraws it. Nothing is charged automatically.',
    'تكتب تذكيراً بالتجديد قبل انتهاء العضوية بهذه المدة (التجميد يؤخر الانتهاء). التجديد أو الإلغاء أو التجميد يسحبها. لا يُخصم أي مبلغ تلقائياً.'],
};
const WINDOWS = [
  ['conversionWindowDays', 'Trial conversion window (days)', 'نافذة التحويل بعد التجربة (أيام)', 1, 90],
  ['gapDays', 'Attendance gap (days without a visit)', 'الانقطاع (أيام بلا زيارة)', 1, 90],
  ['minObservationDays', 'New members are observed for (days)', 'مدة متابعة العضو الجديد (أيام)', 0, 90],
  ['renewalNoticeDays', '“Expiring” starts this many days before the end', '«ينتهي قريباً» قبل الانتهاء بـ (أيام)', 1, 90],
];
const UNITS = [[1, 'minutes', 'دقائق'], [60, 'hours', 'ساعات'], [1440, 'days', 'أيام']];
const unitFor = minutes => minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;

/** Settings → Follow-up rules for Fitness: the three rules (on, writing drafts by default) and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const initial = settings?.fitness;
  const [form, setForm] = useState(null), [saved, setSaved] = useState(false);
  useEffect(() => { if (initial) setForm({ ...initial, rules: initial.rules.map(r => ({ ...r, unit: unitFor(r.offsetMinutes), amount: r.offsetMinutes / unitFor(r.offsetMinutes) })) }); }, [initial]);
  if (!form) return <p className="ld-state" role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>;
  const setRule = (id, patch) => setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const submit = async e => {
    e.preventDefault(); setSaved(false);
    const fitnessSettings = { ...Object.fromEntries(WINDOWS.map(([key]) => [key, Number(form[key])])),
      rules: form.rules.map(r => ({ id: r.id, enabled: r.enabled, mode: r.mode, offsetMinutes: Math.round(Number(r.amount) * r.unit) })) };
    if (await onSave({ fitnessSettings })) setSaved(true);
  };
  return <form className="hb-rules" onSubmit={submit}>
    <PageHeader icon="repeat" title={tr('Follow-up rules', 'قواعد المتابعة')} description={tr('Hasib writes these messages by itself from the recorded facts. Each one waits for the manager’s approval before it is sent; records older than 30 days are not picked up.', 'يكتب حاسب هذه الرسائل بنفسه من الحقائق المسجلة، وتنتظر كل رسالة موافقة المدير قبل إرسالها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.')} />
    {form.rules.map(rule => <fieldset key={rule.id} className="hb-panel hb-rule" data-enabled={rule.enabled ? '' : undefined}>
      <legend>{label('rule', rule.id, ar)}</legend>
      <p className="ld-help">{RULE_HELP[rule.id][ar ? 1 : 0]}</p>
      <label className="ld-check"><input type="checkbox" checked={rule.enabled} onChange={e => setRule(rule.id, { enabled: e.target.checked })} /> {tr('Rule is on', 'القاعدة مفعّلة')}</label>
      <div className="hb-rule-fields">
        <label className="ld-field">{rule.id === 'attendance_gap' ? tr('After', 'بعد') : tr('Before', 'قبل')}
          <input type="number" min="1" step="1" required value={rule.amount} onChange={e => setRule(rule.id, { amount: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit', 'الوحدة')}<select value={rule.unit} onChange={e => setRule(rule.id, { unit: Number(e.target.value) })}>{UNITS.map(([n, en, arabic]) => <option key={n} value={n}>{ar ? arabic : en}</option>)}</select></label>
        <label className="ld-field">{tr('What it does', 'ماذا تفعل')}<select value={rule.mode} onChange={e => setRule(rule.id, { mode: e.target.value })}>
          <option value="draft">{tr('Writes a message for the manager to approve', 'تكتب رسالة يعتمدها المدير')}</option>
          <option value="task">{tr('Opens a task for the team', 'تفتح مهمة للفريق')}</option>
        </select></label>
      </div>
    </fieldset>)}
    <fieldset className="hb-panel">
      <legend>{tr('Measurement windows', 'نوافذ القياس')}</legend>
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
