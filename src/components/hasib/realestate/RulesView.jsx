import React, { useEffect, useState } from 'react';
import { PageHeader } from '../DashboardVisuals';
import { label } from './labels.js';

const RULE_HELP = {
  missing_requirements: ['Opens when a new deal still lacks its budget, area, type, timing, finance or decision maker this long after it arrived. Stops when it is qualified or closed, or the customer replies.',
    'تُفتح عندما تظل صفقة جديدة بلا ميزانية أو منطقة أو نوع أو موعد أو تمويل أو صاحب قرار بعد هذه المدة من وصولها. تتوقف عند تأهيلها أو إغلاقها أو رد العميل.'],
  viewing_confirmation: ['Opens this long before a requested or confirmed viewing. A rescheduled viewing replaces its reminder; a cancelled one ends it; nothing fires after the start.',
    'تُفتح قبل المعاينة المطلوبة أو المؤكدة بهذه المدة. إعادة الجدولة تستبدل التذكير، والإلغاء ينهيه، ولا شيء بعد بدء المعاينة.'],
  post_viewing_decision: ['Opens this long after an attended viewing with no offer and no reply. Stops on a reply, an offer or the deal closing. It never states availability.',
    'تُفتح بعد هذه المدة من معاينة محضورة بلا عرض ولا رد. تتوقف عند الرد أو تقديم عرض أو إغلاق الصفقة. لا تذكر التوفر أبداً.'],
};
const WINDOWS = [
  ['viewingWindowDays', 'Qualified-to-viewing window (days)', 'نافذة التحويل إلى معاينة (أيام)', 1, 365],
  ['closeWindowDaysRent', 'Qualified-to-close window for rentals (days)', 'نافذة الإغلاق للإيجار (أيام)', 1, 730],
  ['closeWindowDaysSale', 'Qualified-to-close window for sales (days)', 'نافذة الإغلاق للبيع (أيام)', 1, 730],
  ['lateCancelHours', 'A cancellation is late within (hours of the viewing)', 'الإلغاء متأخر إذا كان قبل المعاينة بأقل من (ساعات)', 0, 168],
  ['responseSlaMinutes', 'Reply to a qualified customer within (minutes)', 'الرد على العميل المؤهل خلال (دقائق)', 5, 10080],
  ['commissionTermsDays', 'Commission is due after closing (days)', 'تستحق العمولة بعد الإغلاق بـ (أيام)', 0, 365],
];
const UNITS = [[1, 'minutes', 'دقائق'], [60, 'hours', 'ساعات'], [1440, 'days', 'أيام']];
const unitFor = minutes => minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;

/** Settings → Follow-up rules: the three rules, their mode and timing, and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const initial = settings?.realEstate;
  const [form, setForm] = useState(null), [saved, setSaved] = useState(false);
  useEffect(() => { if (initial) setForm({ ...initial, listingFreshnessDays: settings.listingFreshnessDays ?? 30, rules: initial.rules.map(r => ({ ...r, unit: unitFor(r.offsetMinutes), amount: r.offsetMinutes / unitFor(r.offsetMinutes) })) }); }, [initial, settings?.listingFreshnessDays]);
  if (!form) return <p className="ld-state" role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>;
  const setRule = (id, patch) => setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const submit = async e => {
    e.preventDefault(); setSaved(false);
    const realEstate = { ...Object.fromEntries(WINDOWS.map(([key]) => [key, Number(form[key])])),
      rules: form.rules.map(r => ({ id: r.id, enabled: r.enabled, mode: r.mode, offsetMinutes: Math.round(Number(r.amount) * r.unit) })) };
    if (await onSave({ realEstate, listingFreshnessDays: Number(form.listingFreshnessDays) })) setSaved(true);
  };
  return <form className="hb-rules" onSubmit={submit}>
    <PageHeader icon="repeat" title={tr('Follow-up rules', 'قواعد المتابعة')} description={tr('Each rule opens a task, or writes a draft the manager approves before it is sent. Rules stay off until you switch them on; records older than 30 days are not picked up.', 'كل قاعدة تفتح مهمة أو تكتب مسودة يعتمدها المدير قبل إرسالها. تبقى القواعد متوقفة حتى تفعّلها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.')} />
    {form.rules.map(rule => <fieldset key={rule.id} className="hb-panel hb-rule" data-enabled={rule.enabled ? '' : undefined}>
      <legend>{label('rule', rule.id, ar)}</legend>
      <p className="ld-help">{RULE_HELP[rule.id][ar ? 1 : 0]}</p>
      <label className="ld-check"><input type="checkbox" checked={rule.enabled} onChange={e => setRule(rule.id, { enabled: e.target.checked })} /> {tr('Rule is on', 'القاعدة مفعّلة')}</label>
      <div className="hb-rule-fields">
        <label className="ld-field">{rule.id === 'viewing_confirmation' ? tr('Before the viewing', 'قبل المعاينة') : tr('After', 'بعد')}
          <input type="number" min="1" step="1" required value={rule.amount} onChange={e => setRule(rule.id, { amount: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit', 'الوحدة')}<select value={rule.unit} onChange={e => setRule(rule.id, { unit: Number(e.target.value) })}>{UNITS.map(([n, en, arabic]) => <option key={n} value={n}>{ar ? arabic : en}</option>)}</select></label>
        <label className="ld-field">{tr('What it does', 'ماذا تفعل')}<select value={rule.mode} onChange={e => setRule(rule.id, { mode: e.target.value })}>
          <option value="task">{tr('Opens a task for the deal’s agent', 'تفتح مهمة لوكيل الصفقة')}</option>
          <option value="draft">{tr('Writes a message for the manager to approve', 'تكتب رسالة يعتمدها المدير')}</option>
        </select></label>
      </div>
      <p className="ld-help">{tr('One attempt per event. Assigned to the deal’s agent, or the manager when unassigned.', 'محاولة واحدة لكل حدث. تُسند لوكيل الصفقة، أو للمدير إن لم تُسند.')}</p>
    </fieldset>)}
    <fieldset className="hb-panel">
      <legend>{tr('Measurement windows', 'نوافذ القياس')}</legend>
      <p className="ld-help">{tr('Insights name these values next to each measure.', 'تذكر المؤشرات هذه القيم بجانب كل مقياس.')}</p>
      <div className="hb-rule-fields">
        {WINDOWS.map(([key, en, arabic, min, max]) => <label key={key} className="ld-field">{ar ? arabic : en}<input type="number" required min={min} max={max} step="1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>)}
        <label className="ld-field">{tr('A listing is fresh for (days after verifying)', 'يبقى الإعلان حديثاً لمدة (أيام بعد التحقق)')}<input type="number" required min="1" max="3650" step="1" value={form.listingFreshnessDays} onChange={e => setForm(f => ({ ...f, listingFreshnessDays: e.target.value }))} /></label>
      </div>
    </fieldset>
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      {saved && <span className="ld-help" role="status">{tr('Saved. Rules apply from the next check.', 'تم الحفظ. تُطبَّق القواعد من الفحص التالي.')}</span>}
    </div>
  </form>;
}
