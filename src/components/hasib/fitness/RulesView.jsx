import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
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
/** Settings → Follow-up rules for Fitness: the three rules (on, writing drafts by default) and the windows the KPIs use. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="fitness" argKey="fitnessSettings" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} taskLabel={['Opens a task for the team', 'تفتح مهمة للفريق']} description={['Hasib writes these messages by itself from the recorded facts. Each one waits for the manager’s approval before it is sent; records older than 30 days are not picked up.', 'يكتب حاسب هذه الرسائل بنفسه من الحقائق المسجلة، وتنتظر كل رسالة موافقة المدير قبل إرسالها، ولا تُلتقط السجلات الأقدم من ٣٠ يوماً.']}
    offsetLabel={rule => rule.id === 'attendance_gap' ? ['After', 'بعد'] : ['Before', 'قبل']} />;
}
