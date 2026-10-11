import React, { useEffect, useState } from 'react';
import { PageHeader } from '../DashboardVisuals';

const UNITS = [[1, 'minutes', 'دقائق'], [60, 'hours', 'ساعات'], [1440, 'days', 'أيام']];
const unitFor = minutes => minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1;
const MODES = { draft: ['Writes a message for the manager to approve', 'تكتب رسالة يعتمدها المدير'] };

/**
 * Settings → Follow-up rules for a six-tab sector: each rule's switch, timing and mode, then the
 * windows the KPIs use. The sector supplies its words and windows; the form and its save are shared.
 * @param {object} p
 * @param {string} p.settingsKey where the sector's settings sit in the overview (e.g. 'fitness')
 * @param {string} p.argKey the settings_update argument they are saved under (e.g. 'fitnessSettings')
 * @param {(id:string) => string} p.ruleLabel a rule's name
 * @param {Record<string,[string,string]>} p.ruleHelp EN/AR help per rule
 * @param {Array<[string,string,string,number,number]>} p.windows [key, EN, AR, min, max]
 * @param {[string,string]} p.description EN/AR page description
 * @param {(rule:object) => [string,string]} p.offsetLabel the timing field's EN/AR label for a rule
 * @param {[string,string]} p.taskLabel EN/AR words for the "opens a task" mode
 * @param {string[]} [p.modeOrder] the order the two modes are offered in
 * @param {[string,string]} [p.ruleNote] EN/AR note under every rule
 * @param {[string,string]} [p.legend] EN/AR legend of the windows section
 * @param {object} [p.extra] a sector's extra fields: { init(settings, initial), fields(form, setForm, tr), inner(form), outer(form) }
 */
export function RulesForm({ ar, h, settings, busy, onSave, settingsKey, argKey, ruleLabel, ruleHelp, windows, description, offsetLabel, taskLabel,
  modeOrder = ['draft', 'task'], ruleNote, legend = ['Measurement windows', 'نوافذ القياس'], extra = {} }) {
  const tr = (en, arabic) => (ar ? arabic : en), pick = pair => pair[ar ? 1 : 0];
  const initial = settings?.[settingsKey];
  const extraInit = extra.init ? extra.init(settings, initial) : {};
  const [form, setForm] = useState(null), [saved, setSaved] = useState(false);
  useEffect(() => { if (initial) setForm({ ...initial, ...extraInit, rules: initial.rules.map(r => ({ ...r, unit: unitFor(r.offsetMinutes), amount: r.offsetMinutes / unitFor(r.offsetMinutes) })) }); }, [initial, ...Object.values(extraInit)]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!form) return <p className="ld-state" role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>;
  const setRule = (id, patch) => setForm(f => ({ ...f, rules: f.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const submit = async e => {
    e.preventDefault(); setSaved(false);
    const values = { ...Object.fromEntries(windows.map(([key]) => [key, Number(form[key])])), ...(extra.inner ? extra.inner(form) : {}),
      rules: form.rules.map(r => ({ id: r.id, enabled: r.enabled, mode: r.mode, offsetMinutes: Math.round(Number(r.amount) * r.unit) })) };
    if (await onSave({ [argKey]: values, ...(extra.outer ? extra.outer(form) : {}) })) setSaved(true);
  };
  const modes = { ...MODES, task: taskLabel };
  return <form className="hb-rules" onSubmit={submit}>
    <PageHeader icon="repeat" title={tr('Follow-up rules', 'قواعد المتابعة')} description={pick(description)} />
    {form.rules.map(rule => <fieldset key={rule.id} className="hb-panel hb-rule" data-enabled={rule.enabled ? '' : undefined}>
      <legend>{ruleLabel(rule.id)}</legend>
      <p className="ld-help">{pick(ruleHelp[rule.id])}</p>
      <label className="ld-check"><input type="checkbox" checked={rule.enabled} onChange={e => setRule(rule.id, { enabled: e.target.checked })} /> {tr('Rule is on', 'القاعدة مفعّلة')}</label>
      <div className="hb-rule-fields">
        <label className="ld-field">{pick(offsetLabel(rule))}
          <input type="number" min="1" step="1" required value={rule.amount} onChange={e => setRule(rule.id, { amount: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit', 'الوحدة')}<select value={rule.unit} onChange={e => setRule(rule.id, { unit: Number(e.target.value) })}>{UNITS.map(([n, en, arabic]) => <option key={n} value={n}>{ar ? arabic : en}</option>)}</select></label>
        <label className="ld-field">{tr('What it does', 'ماذا تفعل')}<select value={rule.mode} onChange={e => setRule(rule.id, { mode: e.target.value })}>
          {modeOrder.map(mode => <option key={mode} value={mode}>{pick(modes[mode])}</option>)}
        </select></label>
      </div>
      {ruleNote && <p className="ld-help">{pick(ruleNote)}</p>}
    </fieldset>)}
    <fieldset className="hb-panel">
      <legend>{pick(legend)}</legend>
      <p className="ld-help">{tr('Insights name these values next to each measure.', 'تذكر المؤشرات هذه القيم بجانب كل مقياس.')}</p>
      <div className="hb-rule-fields">
        {windows.map(([key, en, arabic, min, max]) => <label key={key} className="ld-field">{ar ? arabic : en}<input type="number" required min={min} max={max} step="1" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></label>)}
        {extra.fields && extra.fields(form, setForm, tr)}
      </div>
    </fieldset>
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      {saved && <span className="ld-help" role="status">{tr('Saved. Rules apply from the next check.', 'تم الحفظ. تُطبَّق القواعد من الفحص التالي.')}</span>}
    </div>
  </form>;
}
