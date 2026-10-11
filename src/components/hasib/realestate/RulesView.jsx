import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
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
/** Settings → Follow-up rules: the three rules, their mode and timing, and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="realEstate" argKey="realEstate" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} modeOrder={['task', 'draft']} taskLabel={['Opens a task for the deal’s agent', 'تفتح مهمة لوكيل الصفقة']}
    description={['Each rule opens a task, or writes a draft the manager approves before it is sent. Rules stay off until you switch them on; records older than 30 days are not picked up.', 'كل قاعدة تفتح مهمة أو تكتب مسودة يعتمدها المدير قبل إرسالها. تبقى القواعد متوقفة حتى تفعّلها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.']}
    offsetLabel={rule => rule.id === 'viewing_confirmation' ? ['Before the viewing', 'قبل المعاينة'] : ['After', 'بعد']}
    ruleNote={['One attempt per event. Assigned to the deal’s agent, or the manager when unassigned.', 'محاولة واحدة لكل حدث. تُسند لوكيل الصفقة، أو للمدير إن لم تُسند.']}
    extra={{ init: s => ({ listingFreshnessDays: s.listingFreshnessDays ?? 30 }), outer: form => ({ listingFreshnessDays: Number(form.listingFreshnessDays) }),
      fields: (form, setForm, tr) => <label className="ld-field">{tr('A listing is fresh for (days after verifying)', 'يبقى الإعلان حديثاً لمدة (أيام بعد التحقق)')}<input type="number" required min="1" max="3650" step="1" value={form.listingFreshnessDays} onChange={e => setForm(f => ({ ...f, listingFreshnessDays: e.target.value }))} /></label> }} />;
}
