import React from 'react';
import { label, options } from './labels.js';

const TITLES = {
  invite: ['Invite a receptionist or dentist', 'دعوة موظف استقبال أو طبيب'], resource: ['Provider or chair', 'مقدم خدمة أو كرسي'], visit: ['Add visit', 'إضافة زيارة'],
  reschedule: ['Move the visit', 'نقل الزيارة'], cancel: ['Cancel the visit', 'إلغاء الزيارة'], charge: ['Record charges', 'تسجيل الرسوم'], payment: ['Record a payment', 'تسجيل دفعة'],
  recall: ['Recall date from the clinician', 'موعد المراجعة من الطبيب'], supply: ['Supply count', 'عدد المستلزم'], expense: ['Add expense', 'إضافة مصروف'],
};
const SOURCES = ['staff', 'phone', 'walk_in', 'referral', 'layla'];

/** The one dental form on screen, for whichever record is being added or changed. No notes field: nothing clinical is typed here. */
export function DentalForm({ form, values, setValues, ar, h, busy, data, onSubmit, onCancel }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const set = name => e => setValues(v => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const field = (name, text, type = 'text', required = true, extra = {}) => <label className="ld-field">{text}<input name={name} required={required} type={type} value={values[name] ?? ''} onChange={set(name)} {...extra} /></label>;
  const select = (name, text, choices, required = true) => <label className="ld-field">{text}<select name={name} required={required} value={values[name] ?? ''} onChange={set(name)}>
    <option value="">{tr('Choose…', 'اختر…')}</option>{choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>;
  const contacts = (data.contacts?.items || []).map(c => ({ id: c.id, label: c.name || c.phone || tr('Patient', 'مريض') }));
  const resources = data.resources?.items || [];
  const providers = resources.filter(r => r.kind === 'provider' && r.active).map(r => ({ id: r.id, label: r.name }));
  const chairs = resources.filter(r => r.kind === 'chair' && r.active).map(r => ({ id: r.id, label: r.name }));
  const treatments = (data.items?.items || []).filter(i => i.kind === 'service');
  const treatmentChoices = treatments.map(i => ({ id: i.id, label: ar ? i.nameAr || i.nameEn : i.nameEn || i.nameAr }));
  const lines = values.lines || [{ variantId: '', qty: 1, price: '' }];
  const setLine = (i, patch) => setValues(v => ({ ...v, lines: lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));
  const [en, arabic] = TITLES[form] || ['Record details', 'تسجيل التفاصيل'];
  return <form className="hb-panel hb-action-fields" onSubmit={onSubmit} aria-label={ar ? arabic : en} data-form={form}>
    <h2>{ar ? arabic : en}</h2>
    {values.subject && <p className="ld-help"><bdi>{values.subject}</bdi></p>}
    {form === 'invite' && field('email', tr('Email', 'البريد الإلكتروني'), 'email')}
    {form === 'resource' && <>
      {!values.resourceId && select('kind', tr('Kind', 'النوع'), options('kind', ar))}
      {field('name', tr('Name', 'الاسم'), 'text', true, { maxLength: 80 })}
      {values.resourceId && <label className="ld-check"><input type="checkbox" name="active" checked={values.active !== false} onChange={set('active')} /> {tr('Takes bookings', 'يقبل الحجوزات')}</label>}
    </>}
    {form === 'visit' && <>
      {select('contactId', tr('Patient', 'المريض'), contacts)}
      <div className="hb-rule-fields">
        {field('startsAt', tr('Starts', 'يبدأ'), 'datetime-local')}
        {field('minutes', tr('Length (minutes)', 'المدة (دقائق)'), 'number', false, { min: 5, max: 480, step: 5, placeholder: String(data.summary?.settings?.visitMinutes || 30) })}
        {select('providerId', tr('Provider', 'مقدم الخدمة'), providers)}
        {chairs.length > 0 && select('chairId', tr('Chair (optional)', 'الكرسي (اختياري)'), chairs, false)}
        {treatmentChoices.length > 0 && select('serviceItemId', tr('Service (optional)', 'الخدمة (اختياري)'), treatmentChoices, false)}
        {select('source', tr('Booked through', 'طريقة الحجز'), SOURCES.map(id => ({ id, label: label('source', id, ar) })), false)}
      </div>
      <label className="ld-check"><input type="checkbox" name="forMinor" checked={!!values.forMinor} onChange={set('forMinor')} /> {tr('The patient is a minor (messages go to the guardian)', 'المريض قاصر (تُرسل الرسائل لولي الأمر)')}</label>
      {values.forMinor && select('guardianContactId', tr('Guardian', 'ولي الأمر'), contacts.filter(c => c.id !== values.contactId))}
      {!providers.length && <p className="hb-warn" role="status">{tr('Add a provider in Services first.', 'أضف مقدم خدمة في الخدمات أولاً.')}</p>}
      <p className="ld-help">{tr('Clashes for the provider, the chair or the patient are refused. The confirmation reminder is written by itself a day before.', 'يُرفض التعارض مع الطبيب أو الكرسي أو المريض. يُكتب تذكير التأكيد تلقائياً قبل يوم.')}</p>
    </>}
    {form === 'reschedule' && <div className="hb-rule-fields">
      {field('startsAt', tr('New time', 'الوقت الجديد'), 'datetime-local')}
      {select('providerId', tr('Provider', 'مقدم الخدمة'), providers, false)}
    </div>}
    {form === 'cancel' && <>{select('reason', tr('Why it is cancelled', 'سبب الإلغاء'), options('cancel', ar))}
      <p className="ld-help">{tr('Cancelling inside the clinic’s cutoff counts as a late cancellation; that is kept even if settings change later.', 'الإلغاء داخل مهلة العيادة يُحتسب إلغاءً متأخراً، ويبقى كذلك حتى لو تغيرت الإعدادات لاحقاً.')}</p></>}
    {form === 'charge' && <>
      {lines.map((l, i) => <div key={i} className="hb-rule-fields" data-line={i}>
        <label className="ld-field">{tr('Treatment', 'الخدمة')}<select required value={l.variantId} onChange={e => setLine(i, { variantId: e.target.value })}>
          <option value="">{tr('Choose…', 'اختر…')}</option>{treatments.map(t => <option key={t.id} value={t.variants?.[0]?.id}>{(ar ? t.nameAr || t.nameEn : t.nameEn || t.nameAr)}{t.variants?.[0]?.priceMinor ? ` · ${h.money(t.variants[0].priceMinor)}` : ''}</option>)}</select></label>
        <label className="ld-field">{tr('Qty', 'الكمية')}<input type="number" min="1" max="20" step="1" required value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} /></label>
        <label className="ld-field">{tr('Price (OMR, if not the list price)', 'السعر (ر.ع.، إن اختلف عن السعر المعتمد)')}<input type="number" min="0" step="0.001" value={l.price} onChange={e => setLine(i, { price: e.target.value })} /></label>
      </div>)}
      {lines.length < 20 && <button type="button" className="ld-button ld-quiet" onClick={() => setValues(v => ({ ...v, lines: [...lines, { variantId: '', qty: 1, price: '' }] }))}>{tr('Add a line', 'إضافة بند')}</button>}
      <p className="ld-help">{tr('Treatments come from Layla’s catalog. The balance is due after the clinic’s payment terms; a reminder is drafted only if it is still open then.', 'الخدمات من كتالوج ليلى. الرصيد مستحق بعد مهلة الدفع في العيادة، ولا يُكتب تذكير إلا إن بقي مفتوحاً.')}</p>
    </>}
    {form === 'payment' && <div className="hb-rule-fields">
      {field('amount', tr('Amount (OMR)', 'المبلغ (ر.ع.)'), 'number', true, { min: 0.001, step: 0.001 })}
      {select('method', tr('Method', 'الطريقة'), options('method', ar))}
      {field('reference', tr('Reference (optional)', 'المرجع (اختياري)'), 'text', false, { maxLength: 80 })}
    </div>}
    {form === 'recall' && <>
      {!values.clear && field('recallDate', tr('Recall date set by the clinician', 'موعد المراجعة الذي حدده الطبيب'), 'date')}
      {values.hasRecall && <label className="ld-check"><input type="checkbox" name="clear" checked={!!values.clear} onChange={set('clear')} /> {tr('Remove the recall date', 'إزالة موعد المراجعة')}</label>}
      <p className="ld-help">{tr('Only the date the clinician gave. Hasib never suggests an interval; reminders are written 14 and 3 days before and stop once a visit is booked.', 'التاريخ الذي حدده الطبيب فقط. لا يقترح حاسب أي مدة؛ تُكتب التذكيرات قبل ١٤ و٣ أيام وتتوقف عند حجز زيارة.')}</p>
    </>}
    {form === 'supply' && <div className="hb-rule-fields">
      <label className="ld-field">{tr('Change', 'التغيير')}<select required value={values.direction || 'in'} onChange={set('direction')}>
        <option value="in">{tr('Received (add)', 'استلام (إضافة)')}</option><option value="out">{tr('Used or discarded (subtract)', 'مستهلك أو تالف (خصم)')}</option></select></label>
      {field('qty', tr('Quantity', 'الكمية'), 'number', true, { min: 1, step: 1 })}
    </div>}
    {form === 'expense' && <div className="hb-rule-fields">
      {select('category', tr('Category', 'الفئة'), (data.expenseCategories || []).map(c => ({ id: c.key, label: ar ? c.ar : c.en })))}
      {field('amount', tr('Amount (OMR)', 'المبلغ (ر.ع.)'), 'number', true, { min: 0.001, step: 0.001 })}
      {field('paidOn', tr('Paid on', 'تاريخ الدفع'), 'date')}
      {select('method', tr('Method', 'الطريقة'), options('method', ar))}
      {field('vendor', tr('Paid to (optional)', 'المستفيد (اختياري)'), 'text', false, { maxLength: 80 })}
    </div>}
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      <button type="button" className="ld-button ld-quiet" onClick={onCancel}>{ar ? 'إلغاء' : 'Cancel'}</button>
    </div>
  </form>;
}
