import React from 'react';
import { label, options } from './labels.js';

const TITLES = {
  invite: ['Invite a producer', 'دعوة منتج'], brief: ['Production brief', 'موجز الإنتاج'], quote: ['Issue the quote', 'إصدار عرض السعر'], accept: ['Record the client’s acceptance', 'تسجيل قبول العميل'],
  payment: ['Record a payment', 'تسجيل دفعة'], cut: ['Send a cut for review', 'إرسال نسخة للمراجعة'], decision: ['Record the client’s decision', 'تسجيل قرار العميل'],
  change: ['Propose extra scope', 'اقتراح نطاق إضافي'], change_decide: ['Decide the extra scope', 'قرار النطاق الإضافي'], hold: ['Hold crew or equipment', 'حجز طاقم أو معدات'],
  resource: ['Crew or equipment', 'طاقم أو معدات'], cost: ['Record a direct cost', 'تسجيل تكلفة مباشرة'], handoff: ['Final handoff', 'التسليم النهائي'],
  cancel: ['Cancel the production', 'إلغاء الإنتاج'], draft: ['Draft a message to the client', 'مسودة رسالة للعميل'], followup: ['Add a dated follow-up', 'إضافة متابعة بموعد'],
};
const EVIDENCE = ['chat', 'email', 'signed', 'verbal', 'review_link'];
const METHODS = ['bank_transfer', 'cash', 'card', 'payment_link', 'other'];
const CHANNELS = ['web', 'social', 'broadcast', 'print', 'outdoor', 'internal'];

/** The one Media form on screen, for whichever record is being added or changed. */
export function MediaForm({ form, values, setValues, ar, h, s, busy, data, manager, actorAccountId, onSubmit, onCancel }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const set = name => e => setValues(v => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const field = (name, text, type = 'text', required = true, extra = {}) => <label className="ld-field">{text}<input name={name} required={required} type={type} value={values[name] ?? ''} onChange={set(name)} {...extra} /></label>;
  const area = (name, text, required = true, max = 2000) => <label className="ld-field">{text}<textarea name={name} required={required} maxLength={max} value={values[name] ?? ''} onChange={set(name)} /></label>;
  const select = (name, text, choices, required = true) => <label className="ld-field">{text}<select name={name} required={required} value={values[name] ?? ''} onChange={set(name)}>
    <option value="">{tr('Choose…', 'اختر…')}</option>{choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>;
  const pick = (group, ids) => ids.map(id => ({ id, label: label(group, id, ar) }));
  const producers = manager ? (data.team?.members || []).filter(m => m.status === 'active' && m.accountId).map(m => ({ id: m.accountId, label: m.email })) : [{ id: actorAccountId, label: tr('Me', 'أنا') }];
  const contacts = (data.contacts?.items || []).map(c => ({ id: c.id, label: c.name || c.phone || tr('Customer', 'عميل') }));
  const resources = (data.resources?.items || []).filter(r => r.active).map(r => ({ id: r.id, label: `${r.name} · ${label('category', r.category, ar)}` }));
  const toggleChannel = id => setValues(v => ({ ...v, channels: (v.channels || []).includes(id) ? v.channels.filter(c => c !== id) : [...(v.channels || []), id] }));
  const [en, arabic] = TITLES[form] || ['Record details', 'تسجيل التفاصيل'];
  return <form className="hb-panel hb-action-fields" onSubmit={onSubmit} aria-label={ar ? arabic : en} data-form={form}>
    <h2>{ar ? arabic : en}</h2>
    {values.subject && <p className="ld-help"><bdi>{values.subject}</bdi></p>}
    {form === 'invite' && field('email', tr('Producer’s email', 'بريد المنتج'), 'email')}
    {form === 'brief' && <>
      {!values.productionId && select('contactId', tr('Client', 'العميل'), contacts)}
      {field('title', tr('Production title', 'عنوان الإنتاج'))}
      {!values.locked && select('productionType', tr('Production type', 'نوع الإنتاج'), options('type', ar))}
      {area('purpose', tr('Purpose (what it is for, in the client’s words)', 'الغرض (بكلمات العميل)'), false, 240)}
      {!values.locked && <fieldset className="hb-fieldset"><legend>{tr('Deliverable', 'المُخرَج')}</legend><div className="hb-rule-fields">
        {select('format', tr('Format', 'الصيغة'), options('format', ar))}
        {field('quantity', tr('Quantity', 'العدد'), 'number', true, { min: 1, max: 100, step: 1 })}
        {field('durationSeconds', tr('Length (seconds, optional)', 'المدة (ثوانٍ، اختياري)'), 'number', false, { min: 1, max: 86400, step: 1 })}
        {select('language', tr('Language', 'اللغة'), [{ id: 'ar', label: tr('Arabic', 'العربية') }, { id: 'en', label: tr('English', 'الإنجليزية') }, { id: 'ar_en', label: tr('Arabic and English', 'العربية والإنجليزية') }])}
      </div></fieldset>}
      {values.locked && <p className="ld-help">{tr('Scope and shoot dates are locked once the quote is accepted. Propose extra scope instead.', 'يُقفل النطاق ومواعيد التصوير بعد قبول العرض. اقترح نطاقاً إضافياً بدلاً من ذلك.')}</p>}
      {!values.locked && <>{field('shootStartsAt', tr('Shoot starts', 'بداية التصوير'), 'datetime-local', false)}{field('shootEndsAt', tr('Shoot ends', 'نهاية التصوير'), 'datetime-local', false)}</>}
      {field('location', tr('Location', 'الموقع'), 'text', false, { maxLength: 160 })}
      {field('deliveryDueAt', tr('Final delivery due', 'موعد التسليم النهائي'), 'datetime-local', false)}
      {field('firstCutDueAt', tr('First cut due (optional)', 'موعد النسخة الأولى (اختياري)'), 'datetime-local', false)}
      {!values.locked && field('revisionAllowance', tr('Revision rounds included', 'جولات التعديل المشمولة'), 'number', false, { min: 0, max: 20, step: 1 })}
      {select('producerId', tr('Producer', 'المنتج'), producers, false)}
      <fieldset className="hb-fieldset"><legend>{tr('Usage rights', 'حقوق الاستخدام')}</legend>
        <div className="hb-check-row">{CHANNELS.map(c => <label key={c} className="ld-check"><input type="checkbox" checked={(values.channels || []).includes(c)} onChange={() => toggleChannel(c)} /> {label('channel', c, ar)}</label>)}</div>
        <div className="hb-rule-fields">
          {field('territory', tr('Territory', 'النطاق الجغرافي'), 'text', false, { maxLength: 80 })}
          {field('termEndsAt', tr('Usage ends (optional)', 'تنتهي الحقوق (اختياري)'), 'date', false)}
          {select('clearance', tr('Clearance', 'التحقق من الحقوق'), options('clearance', ar))}
        </div></fieldset>
      {field('nextAction', tr('Next step (optional)', 'الخطوة التالية (اختياري)'), 'text', false, { maxLength: 200 })}
    </>}
    {form === 'quote' && <>
      {field('quote', tr('Quote total (OMR)', 'إجمالي العرض (ر.ع.)'), 'number', true, { min: 0.001, step: 0.001 })}
      {field('deposit', tr('Deposit (OMR, blank uses Settings)', 'الدفعة المقدمة (ر.ع.، فارغ = حسب الإعدادات)'), 'number', false, { min: 0, step: 0.001 })}
    </>}
    {form === 'accept' && <>
      <p className="ld-help">{tr(`This records acceptance of quote version ${values.quoteVersion}. A later quote needs its own acceptance.`, `يسجل هذا قبول العرض رقم ${values.quoteVersion}. أي عرض لاحق يحتاج قبوله الخاص.`)}</p>
      {field('acceptedBy', tr('Accepted by (name)', 'قبله (الاسم)'), 'text', true, { maxLength: 120 })}
      {select('evidenceSource', tr('Where they accepted', 'أين تم القبول'), pick('evidence', EVIDENCE))}
    </>}
    {form === 'payment' && <>
      {field('amount', tr('Amount (OMR)', 'المبلغ (ر.ع.)'), 'number', true, { step: 0.001 })}
      {select('method', tr('Method', 'الطريقة'), pick('method', METHODS))}
      {(values.changeOrders || []).length > 0 && select('changeOrderId', tr('Pays for', 'مقابل'), [{ id: '', label: tr('The production', 'الإنتاج') }, ...values.changeOrders.map(c => ({ id: c.id, label: c.description }))], false)}
      {field('reference', tr('Reference (optional)', 'المرجع (اختياري)'), 'text', false, { maxLength: 80 })}
    </>}
    {form === 'cut' && <>
      {field('label', tr('Version label (e.g. v2)', 'اسم النسخة (مثلاً v2)'), 'text', false, { maxLength: 40 })}
      {field('assetRef', tr('Review link (https)', 'رابط المراجعة (https)'), 'url', true, { pattern: 'https://.*', maxLength: 500 })}
      {field('approverName', tr('Who approves it for the client', 'من يعتمدها عن العميل'), 'text', true, { maxLength: 120 })}
      {field('decisionDueAt', tr('Decision due (blank uses Settings)', 'موعد القرار (فارغ = حسب الإعدادات)'), 'datetime-local', false)}
    </>}
    {form === 'decision' && <>
      {select('decision', tr('Decision on this exact version', 'القرار على هذه النسخة بالضبط'), [{ id: 'approved', label: tr('Approved', 'معتمدة') }, { id: 'changes_requested', label: tr('Changes requested', 'طُلبت تعديلات') }])}
      {field('approverName', tr('Decided by (must be the named approver)', 'صاحب القرار (يجب أن يكون المعتمد المسمى)'), 'text', true, { maxLength: 120 })}
      {select('evidenceSource', tr('Where they decided', 'أين اتُخذ القرار'), pick('evidence', EVIDENCE))}
      {area('feedback', tr('Consolidated feedback', 'الملاحظات المجمعة'), values.decision === 'changes_requested')}
      {values.roundsLeft === 0 && values.decision === 'changes_requested' && <p className="hb-warn" role="status">{tr('No included rounds are left: this request becomes priced extra scope for the manager to decide.', 'لم تبقَ جولات مشمولة: يصبح هذا الطلب نطاقاً إضافياً مسعّراً يقرره المدير.')}</p>}
    </>}
    {form === 'change' && <>
      {select('kind', tr('Kind', 'النوع'), [{ id: 'new_deliverable', label: label('changeKind', 'new_deliverable', ar) }, { id: 'other', label: label('changeKind', 'other', ar) }])}
      {area('description', tr('What the client asked for', 'ما طلبه العميل'), true, 500)}
      {field('price', tr('Price (OMR)', 'السعر (ر.ع.)'), 'number', true, { min: 0, step: 0.001 })}
      {values.kind === 'new_deliverable' && <div className="hb-rule-fields">{select('format', tr('Format', 'الصيغة'), options('format', ar))}{field('quantity', tr('Quantity', 'العدد'), 'number', true, { min: 1, max: 100, step: 1 })}</div>}
    </>}
    {form === 'change_decide' && <>
      {select('decision', tr('Decision', 'القرار'), [{ id: 'approved', label: tr('Approved by the client (charged)', 'وافق العميل (برسوم)') }, { id: 'waived', label: tr('Do it without charge', 'تنفيذ دون رسوم') }, { id: 'declined', label: tr('Declined: the request is withdrawn', 'مرفوض: سُحب الطلب') }])}
      {values.decision === 'approved' && field('customerApproval', tr('Client approval (who and where)', 'موافقة العميل (من وأين)'), 'text', true, { maxLength: 120 })}
    </>}
    {form === 'hold' && <>
      {select('mediaResourceId', tr('Crew or equipment', 'الطاقم أو المعدات'), resources)}
      {field('startsAt', tr('From', 'من'), 'datetime-local')}{field('endsAt', tr('Until', 'حتى'), 'datetime-local')}
      <p className="ld-help">{tr('A hold is tentative until it is confirmed, and expires after the time set in Settings.', 'الحجز مبدئي حتى يُؤكد، وينتهي بعد المدة المحددة في الإعدادات.')}</p>
    </>}
    {form === 'resource' && <>
      {field('name', tr('Name', 'الاسم'), 'text', true, { maxLength: 80 })}
      {select('category', tr('Category', 'الفئة'), options('category', ar).filter(o => o.id !== 'not_applicable'))}
      {field('rate', tr('Internal cost per day (OMR, optional)', 'التكلفة الداخلية يومياً (ر.ع.، اختياري)'), 'number', false, { min: 0, step: 0.001 })}
      {values.mediaResourceId && <label className="ld-check"><input type="checkbox" checked={values.active !== false} onChange={e => setValues(v => ({ ...v, active: e.target.checked }))} /> {tr('Active', 'نشط')}</label>}
    </>}
    {form === 'cost' && <>
      {select('category', tr('Category', 'الفئة'), options('cost', ar))}
      {field('label', tr('What it was', 'البند'), 'text', true, { maxLength: 120 })}
      {field('amount', tr('Amount (OMR, before VAT)', 'المبلغ (ر.ع.، قبل الضريبة)'), 'number', true, { min: 0.001, step: 0.001 })}
      {select('costKind', tr('Actual or committed', 'فعلي أو ملتزم به'), [{ id: 'actual', label: label('note', 'actual', ar) }, { id: 'committed', label: label('note', 'committed', ar) }])}
      {field('hours', tr('Hours (optional)', 'الساعات (اختياري)'), 'number', false, { min: 0, step: 1 })}
      <label className="ld-check"><input type="checkbox" checked={values.extraScope === true} onChange={set('extraScope')} /> {tr('This is for work beyond the agreed scope', 'هذا لعمل خارج النطاق المتفق عليه')}</label>
      {(values.changeOrders || []).length > 0 && select('changeOrderId', tr('Change order', 'أمر التغيير'), [{ id: '', label: tr('None', 'لا شيء') }, ...values.changeOrders.map(c => ({ id: c.id, label: `${c.description} · ${label('change', c.status, ar)}` }))], false)}
    </>}
    {form === 'handoff' && <>
      {field('link', tr('Final delivery link (https)', 'رابط التسليم النهائي (https)'), 'url', true, { pattern: 'https://.*', maxLength: 500 })}
      <p className="ld-help">{tr('Delivery needs the accepted cut and, where usage channels are set, cleared rights.', 'يحتاج التسليم النسخة المعتمدة، وحقوقاً مؤكدة إن حُددت قنوات الاستخدام.')}</p>
    </>}
    {form === 'cancel' && area('reason', tr('Why it is cancelled', 'سبب الإلغاء'), true, 200)}
    {form === 'draft' && <>{area('text', tr('Message', 'الرسالة'), true, 4000)}{field('templateId', tr('Approved template id (for outside the 24-hour window)', 'معرّف قالب معتمد (لخارج نافذة ٢٤ ساعة)'), 'text', false, { maxLength: 80 })}</>}
    {form === 'followup' && <>{field('reason', tr('What to follow up', 'ما يجب متابعته'), 'text', true, { maxLength: 160 })}{field('dueAt', tr('When', 'متى'), 'datetime-local')}</>}
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      <button type="button" className="ld-button ld-quiet" onClick={onCancel}>{s.t('cancel')}</button>
    </div>
  </form>;
}
