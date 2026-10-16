import React from 'react';
import { RulesForm } from '../workspace/RulesForm.jsx';
import { label } from './labels.js';

const RULE_HELP = {
  ready_for_collection: ['Sends this long after an order for pickup is marked ready, with the balance due. Delivery orders are not included.', 'تُرسل بعد تحديد طلب الاستلام جاهزاً بهذه المدة، مع المبلغ المتبقي. لا تشمل طلبات التوصيل.'],
  back_in_stock: ['Sends this long after a product a customer asked for is in stock again, to that customer only, once per request.', 'تُرسل بعد عودة منتج طلبه العميل إلى المخزون بهذه المدة، لذلك العميل فقط، ومرة واحدة لكل طلب.'],
  order_unconfirmed: ['Opens a task this long after Layla took an order she could not confirm. It never messages the customer.', 'تفتح مهمة بعد هذه المدة من طلب أخذته ليلى ولم تستطع تأكيده. لا تراسل العميل أبداً.'],
  repair_ready: ['Sends this long after a repair is marked ready, with the device and what is left to pay.', 'تُرسل بعد تحديد الصيانة جاهزة بهذه المدة، مع الجهاز والمبلغ المتبقي.'],
  repair_quote_reminder: ['Writes this long after a repair quote was given and still waits for the customer’s approval.', 'تُكتب بعد إعطاء عرض الصيانة بهذه المدة إذا بقي بانتظار موافقة العميل.'],
  overdue_repair: ['Opens a task this long after a repair passes its promised date. It never messages the customer.', 'تفتح مهمة بعد تجاوز الصيانة موعدها بهذه المدة. لا تراسل العميل أبداً.'],
};
const WINDOWS = [['readyUncollectedHours', 'Something ready waits before it is followed up (hours)', 'مدة انتظار الجاهز قبل متابعته (ساعات)', 1, 720]];

/** Settings → Follow-up rules for a store: three (retail) or four (phone store) rules, their mode and timing. */
export function RulesView({ ar, h, packId, settings, busy, onSave }) {
  const tech = packId === 'retail-tech';
  return <RulesForm ar={ar} h={h} settings={settings} busy={busy} onSave={onSave} settingsKey={tech ? 'retailTech' : 'retail'} argKey={tech ? 'retailTechSettings' : 'retailSettings'} ruleLabel={id => label('rule', id, ar)}
    ruleHelp={RULE_HELP} windows={WINDOWS} modeOrder={['auto', 'draft', 'task']} taskLabel={['Opens a task for the team', 'تفتح مهمة للفريق']}
    description={['Each rule sends its message by itself (built only from the records), writes a draft you approve, or opens a task. Automatic messages go out only inside WhatsApp’s 24-hour window, at most three a day per customer, and never while you handle the chat.', 'كل قاعدة إما تُرسل رسالتها تلقائياً (من السجلات فقط)، أو تكتب مسودة تعتمدها، أو تفتح مهمة. لا تُرسل الرسائل التلقائية إلا خلال نافذة واتساب ٢٤ ساعة، وبحد أقصى ثلاث رسائل يومياً لكل عميل، ولا تُرسل أثناء تعاملك مع المحادثة.']}
    offsetLabel={() => ['After', 'بعد']}
    ruleNote={[tech ? 'One attempt per event. Repair quotes go to you through Adiba; the customer’s yes approves the quote they were sent.' : 'One attempt per event.', tech ? 'محاولة واحدة لكل حدث. تصلك عروض الصيانة عبر أديبة، وموافقة العميل تعتمد العرض الذي أُرسل له.' : 'محاولة واحدة لكل حدث.']}
    legend={['Follow-up windows', 'نوافذ المتابعة']} />;
}
