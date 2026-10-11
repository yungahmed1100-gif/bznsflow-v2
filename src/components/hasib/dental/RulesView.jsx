import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
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
/** Settings → Follow-up rules for a dental clinic: the four rules (on, writing drafts by default) and the clinic's windows. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="dental" argKey="dentalSettings" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} taskLabel={['Opens a task for the team', 'تفتح مهمة للفريق']} description={['Hasib writes these messages by itself from the recorded facts. Each one waits for the manager’s approval before it is sent; records older than 30 days are not picked up.', 'يكتب حاسب هذه الرسائل بنفسه من الحقائق المسجلة، وتنتظر كل رسالة موافقة المدير قبل إرسالها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.']}
    offsetLabel={rule => AFTER.has(rule.id) ? ['After', 'بعد'] : ['Before', 'قبل']} legend={['Clinic windows', 'نوافذ العيادة']} />;
}
