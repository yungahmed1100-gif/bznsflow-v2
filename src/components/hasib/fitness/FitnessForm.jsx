import React from 'react';
import { label, options } from './labels.js';

const TITLES = {
  invite: ['Invite a coach or front-desk member', 'دعوة مدرب أو موظف استقبال'], membership: ['Add membership', 'إضافة عضوية'], plan: ['Plan', 'الخطة'], class: ['Class', 'الحصة'],
  cancel_class: ['Cancel the class', 'إلغاء الحصة'], book: ['Book a place', 'حجز مكان'], payment: ['Record a payment', 'تسجيل دفعة'], freeze: ['Freeze the membership', 'تجميد العضوية'],
  cancel: ['Cancel the membership', 'إلغاء العضوية'], renew: ['Renew the membership', 'تجديد العضوية'],
};
const TRIAL_SOURCES = ['walk_in', 'instagram', 'whatsapp', 'referral', 'partner', 'search'];

/** The one Fitness form on screen, for whichever record is being added or changed. */
export function FitnessForm({ form, values, setValues, ar, h, busy, data, onSubmit, onCancel }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const set = name => e => setValues(v => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const field = (name, text, type = 'text', required = true, extra = {}) => <label className="ld-field">{text}<input name={name} required={required} type={type} value={values[name] ?? ''} onChange={set(name)} {...extra} /></label>;
  const select = (name, text, choices, required = true) => <label className="ld-field">{text}<select name={name} required={required} value={values[name] ?? ''} onChange={set(name)}>
    <option value="">{tr('Choose…', 'اختر…')}</option>{choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>;
  const contacts = (data.contacts?.items || []).map(c => ({ id: c.id, label: c.name || c.phone || tr('Customer', 'عميل') }));
  const plans = (data.plans?.items || []).filter(p => p.active).map(p => ({ id: p.id, label: `${p.name} · ${label('planKind', p.kind, ar)}${p.priceMinor != null ? ` · ${h.money(p.priceMinor)}` : ''}` }));
  const [en, arabic] = TITLES[form] || ['Record details', 'تسجيل التفاصيل'];
  return <form className="hb-panel hb-action-fields" onSubmit={onSubmit} aria-label={ar ? arabic : en} data-form={form}>
    <h2>{ar ? arabic : en}</h2>
    {values.subject && <p className="ld-help"><bdi>{values.subject}</bdi></p>}
    {form === 'invite' && field('email', tr('Email', 'البريد الإلكتروني'), 'email')}
    {form === 'membership' && <>
      {select('contactId', tr('Member', 'العضو'), contacts)}
      {select('planId', tr('Plan', 'الخطة'), plans)}
      <p className="ld-help">{tr('It starts by itself once its payment is recorded in full. A free plan starts now.', 'تبدأ تلقائياً عند تسجيل دفعتها كاملة. الخطة المجانية تبدأ الآن.')}</p>
    </>}
    {form === 'plan' && <>
      {field('name', tr('Plan name', 'اسم الخطة'), 'text', true, { maxLength: 80 })}
      {select('kind', tr('Kind', 'النوع'), options('planKind', ar))}
      <div className="hb-rule-fields">
        {field('termDays', tr('Term (days)', 'المدة (أيام)'), 'number', true, { min: 1, max: 730, step: 1 })}
        {select('billingMonths', tr('Billed', 'الفوترة'), options('billing', ar))}
        {field('price', tr('Price (OMR)', 'السعر (ر.ع.)'), 'number', true, { min: 0, step: 0.001 })}
        {values.kind === 'class_pack' && field('credits', tr('Classes included', 'الحصص المشمولة'), 'number', true, { min: 1, max: 500, step: 1 })}
        {field('freezeMaxDays', tr('Freeze allowed (days per term)', 'التجميد المسموح (أيام لكل مدة)'), 'number', true, { min: 0, max: 180, step: 1 })}
        {field('graceDays', tr('Grace after the end (days)', 'السماح بعد الانتهاء (أيام)'), 'number', true, { min: 0, max: 60, step: 1 })}
      </div>
      {values.planId && <label className="ld-check"><input type="checkbox" name="active" checked={values.active !== false} onChange={set('active')} /> {tr('Offered to new members', 'متاحة للأعضاء الجدد')}</label>}
    </>}
    {form === 'class' && <>
      {field('title', tr('Class name', 'اسم الحصة'), 'text', true, { maxLength: 80 })}
      <div className="hb-rule-fields">
        {field('classType', tr('Class type (e.g. hiit, yoga)', 'نوع الحصة (مثل hiit أو yoga)'), 'text', true, { maxLength: 40 })}
        {field('startsAt', tr('Starts', 'يبدأ'), 'datetime-local')}
        {field('minutes', tr('Length (minutes)', 'المدة (دقائق)'), 'number', true, { min: 15, max: 240, step: 5 })}
        {field('capacity', tr('Places', 'الأماكن'), 'number', true, { min: 1, max: 200, step: 1 })}
        {field('coachName', tr('Coach (optional)', 'المدرب (اختياري)'), 'text', false, { maxLength: 80 })}
      </div>
    </>}
    {form === 'cancel_class' && <>{field('reason', tr('Why it is cancelled', 'سبب الإلغاء'), 'text', true, { maxLength: 200 })}
      <p className="ld-help">{tr('Every booking is released. Members keep their credits.', 'تُلغى كل الحجوزات ويحتفظ الأعضاء برصيدهم.')}</p></>}
    {form === 'book' && <>
      {select('contactId', tr('Customer', 'العميل'), contacts)}
      <label className="ld-check"><input type="checkbox" name="trial" checked={!!values.trial} onChange={set('trial')} /> {tr('First-time trial (no membership yet)', 'حصة تجريبية أولى (بلا عضوية بعد)')}</label>
      {values.trial && select('source', tr('How they found us', 'كيف عرفوا عنا'), TRIAL_SOURCES.map(id => ({ id, label: label('source', id, ar) })), false)}
      <p className="ld-help">{tr('A full class puts them on the waitlist; a freed place goes to the first person still entitled.', 'إذا امتلأت الحصة يُضاف إلى قائمة الانتظار، ويذهب المكان المتاح لأول شخص ما زال مستحقاً.')}</p>
    </>}
    {form === 'payment' && <div className="hb-rule-fields">
      {field('amount', tr('Amount (OMR)', 'المبلغ (ر.ع.)'), 'number', true, { min: 0.001, step: 0.001 })}
      {select('method', tr('Method', 'الطريقة'), options('method', ar))}
      {field('reference', tr('Reference (optional)', 'المرجع (اختياري)'), 'text', false, { maxLength: 80 })}
    </div>}
    {form === 'freeze' && <div className="hb-rule-fields">
      {field('days', tr('Days', 'الأيام'), 'number', true, { min: 1, max: 180, step: 1 })}
      {field('startsAt', tr('From (optional, default now)', 'من (اختياري، الآن افتراضياً)'), 'datetime-local', false)}
      {field('reason', tr('Reason (optional)', 'السبب (اختياري)'), 'text', false, { maxLength: 200 })}
    </div>}
    {form === 'freeze' && <p className="ld-help">{tr('The end date moves by the same number of days; classes booked inside the freeze are released to the waitlist.', 'يتأخر تاريخ الانتهاء بعدد الأيام نفسه، وتُحرَّر الحصص المحجوزة خلال التجميد لقائمة الانتظار.')}</p>}
    {form === 'cancel' && field('reason', tr('Why it is cancelled', 'سبب الإلغاء'), 'text', true, { maxLength: 200 })}
    {form === 'renew' && <>{select('planId', tr('Plan', 'الخطة'), plans, false)}
      <p className="ld-help">{tr('The renewal starts when the current term ends, once it is paid. It counts as a renewal, not a new member.', 'يبدأ التجديد عند انتهاء المدة الحالية بعد دفعه، ويُحتسب تجديداً لا عضواً جديداً.')}</p></>}
    <div className="ld-actions">
      <button className="ld-button ld-primary" disabled={busy}>{busy ? h.t('saving') : h.t('save')}</button>
      <button type="button" className="ld-button ld-quiet" onClick={onCancel}>{ar ? 'إلغاء' : 'Cancel'}</button>
    </div>
  </form>;
}
