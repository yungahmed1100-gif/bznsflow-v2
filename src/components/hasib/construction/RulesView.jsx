import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
import { label } from './labels.js';

const RULE_HELP = {
  certified_balance_due: ['Sends this long after a certified payment’s due date while a balance is outstanding, stating the certificate and the balance recorded.', 'تُرسل بعد تاريخ استحقاق الدفعة المعتمدة بهذه المدة إذا بقي رصيد، وتذكر الشهادة والرصيد المسجل.'],
  variation_decision: ['Writes this long after a variation was submitted while the client has not decided. The cost effect is never included.', 'تُكتب بعد تقديم أمر التغيير بهذه المدة إذا لم يقرر العميل. لا تتضمن أثر التكلفة أبداً.'],
  approval_blocker: ['Opens a task this long after a variation was submitted and is still waiting.', 'تفتح مهمة بعد تقديم أمر التغيير بهذه المدة إذا بقي بانتظار القرار.'],
  milestone_dependency: ['Opens a task this long before a milestone’s planned finish while it is not complete.', 'تفتح مهمة قبل موعد إنجاز المرحلة المخطط بهذه المدة إذا لم تكتمل.'],
};
const WINDOWS = [
  ['approvalWaitDays', 'A submitted variation counts as overdue after (days)', 'يُعد أمر التغيير المقدم متأخراً بعد (أيام)', 1, 90],
  ['materialsLeadDays', 'Flag materials this long before they are needed (days)', 'نبّه للمواد قبل الحاجة إليها بهذه المدة (أيام)', 0, 60],
];

/** Settings → Follow-up rules for construction: four rules, their mode and timing, and two windows. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="construction" argKey="constructionSettings" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} modeOrder={['auto', 'draft', 'task']} taskLabel={['Opens a task for the project manager', 'تفتح مهمة لمدير المشروع']}
    description={['Each rule sends its message by itself (built only from the records), writes a draft you approve, or opens a task. Automatic messages go out only inside WhatsApp’s 24-hour window, at most three a day per client, and never while you handle the chat.', 'كل قاعدة إما تُرسل رسالتها تلقائياً (من السجلات فقط)، أو تكتب مسودة تعتمدها، أو تفتح مهمة. لا تُرسل الرسائل التلقائية إلا خلال نافذة واتساب ٢٤ ساعة، وبحد أقصى ثلاث رسائل يومياً لكل عميل، ولا تُرسل أثناء تعاملك مع المحادثة.']}
    offsetLabel={rule => rule.id === 'milestone_dependency' ? ['Before', 'قبل'] : ['After', 'بعد']}
    ruleNote={['One attempt per event. Tasks go to the project’s manager.', 'محاولة واحدة لكل حدث. تُسند المهام لمدير المشروع.']}
    legend={['Follow-up windows', 'نوافذ المتابعة']} />;
}
