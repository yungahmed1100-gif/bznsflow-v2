import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
import { label } from './labels.js';

const RULE_HELP = {
  ready_for_collection: ['Sends this long after a vehicle is marked ready, which needs a recorded quality check, with the balance due. Never before the check.', 'تُرسل بعد تحديد المركبة جاهزة بهذه المدة، ولا يكون ذلك إلا بعد فحص جودة مسجل، مع المبلغ المتبقي. لا تُرسل قبل الفحص أبداً.'],
  estimate_reminder: ['Writes this long after an estimate was issued and still waits for the customer’s decision. Only ever the current estimate.', 'تُكتب بعد إصدار عرض السعر بهذه المدة إذا بقي بانتظار قرار العميل. للعرض الحالي فقط.'],
  service_due: ['Writes this long before a vehicle’s recorded next service date, unless it is already in the workshop.', 'تُكتب قبل موعد الصيانة القادم المسجل للمركبة بهذه المدة، إلا إذا كانت في الورشة.'],
  promise_risk: ['Opens a task this long before the promised time while the vehicle is not ready. It never messages the customer.', 'تفتح مهمة قبل الموعد الموعود بهذه المدة إذا لم تكن المركبة جاهزة. لا تراسل العميل أبداً.'],
};
const WINDOWS = [
  ['approvalWaitHours', 'An estimate waits before it is followed up (hours)', 'مدة انتظار عرض السعر قبل متابعته (ساعات)', 1, 720],
  ['readyUncollectedHours', 'A ready vehicle waits before it is followed up (hours)', 'مدة انتظار المركبة الجاهزة قبل متابعتها (ساعات)', 1, 720],
];

/** Settings → Follow-up rules for the workshop: four rules, their mode and timing, and Hasib's estimate limit. */
export function RulesView({ ar, h, settings, busy, onSave }) {
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey="automotive" argKey="automotiveSettings" ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} modeOrder={['auto', 'draft', 'task']} taskLabel={['Opens a task for the service advisor', 'تفتح مهمة لمستشار الخدمة']}
    description={['Each rule sends its message by itself (built only from the records), writes a draft you approve, or opens a task. Automatic messages go out only inside WhatsApp’s 24-hour window, at most three a day per customer, and never while you handle the chat.', 'كل قاعدة إما تُرسل رسالتها تلقائياً (من السجلات فقط)، أو تكتب مسودة تعتمدها، أو تفتح مهمة. لا تُرسل الرسائل التلقائية إلا خلال نافذة واتساب ٢٤ ساعة، وبحد أقصى ثلاث رسائل يومياً لكل عميل، ولا تُرسل أثناء تعاملك مع المحادثة.']}
    offsetLabel={rule => ['service_due', 'promise_risk'].includes(rule.id) ? ['Before', 'قبل'] : ['After', 'بعد']}
    ruleNote={['One attempt per event. Tasks go to the work order’s service advisor.', 'محاولة واحدة لكل حدث. تُسند المهام لمستشار الخدمة في أمر العمل.']}
    legend={['Follow-up windows', 'نوافذ المتابعة']}
    extra={{ init: (s, initial) => ({ autoQuoteLimit: (initial?.autoQuoteLimitMinor || 0) / 1000 }),
      inner: form => ({ autoQuoteLimitMinor: Math.round(Number(form.autoQuoteLimit) * 1000) }),
      fields: (form, setForm, tr) => <label className="ld-field">{tr('Hasib sends an estimate by himself up to (OMR, 0 = off)', 'يرسل حاسب عرض السعر تلقائياً حتى (ر.ع، ٠ = متوقف)')}<input type="number" required min="0" step="0.001" value={form.autoQuoteLimit} onChange={e => setForm(f => ({ ...f, autoQuoteLimit: e.target.value }))} />
        <small>{tr('Only when every line is priced from your service list or a part’s fixed price. A price typed by an advisor always comes to you first, through Adiba.', 'فقط عندما يكون كل بند مسعّراً من قائمة خدماتك أو من سعر القطعة الثابت. السعر الذي يكتبه المستشار يصلك أولاً دائماً عبر أديبة.')}</small></label> }} />;
}
