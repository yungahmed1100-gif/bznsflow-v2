import React from 'react';
import { label, options } from './labels.js';

const TITLES = {
  invite: ['Invite a technician or service advisor', 'دعوة فني أو موظف خدمة'], job: ['New job', 'عمل جديد'], editJob: ['Edit job', 'تعديل العمل'], visit: ['Book a visit', 'حجز زيارة'],
  reschedule: ['Move the visit', 'نقل الزيارة'], visitCancel: ['Cancel the visit', 'إلغاء الزيارة'], visitDone: ['Visit outcome', 'نتيجة الزيارة'], estimate: ['New estimate version', 'نسخة تسعيرة جديدة'],
  approval: ['Record the customer’s yes', 'تسجيل موافقة العميل'], parts: ['Waiting for parts', 'بانتظار القطع'], cancelJob: ['Cancel the job', 'إلغاء العمل'], checklist: ['Checks and findings', 'الفحوص والملاحظات'],
  unit: ['AC unit', 'وحدة تكييف'], service: ['Next service date from the technician', 'موعد الصيانة القادم من الفني'], contract: ['Maintenance contract', 'عقد صيانة'],
  activate: ['Activate the contract', 'تفعيل العقد'], contractCancel: ['Cancel the contract', 'إلغاء العقد'], costs: ['Job costs', 'تكاليف العمل'], payment: ['Record a payment', 'تسجيل دفعة'], expense: ['Add expense', 'إضافة مصروف'],
};
const SOURCES = ['staff', 'phone', 'walk_in', 'layla'];

/** The one AC form on screen, for whichever record is being added or changed. */
export function HvacForm({ form, values, setValues, ar, h, busy, data, onSubmit, onCancel }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const set = name => e => setValues(v => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const field = (name, text, type = 'text', required = true, extra = {}) => <label className="ld-field">{text}<input name={name} required={required} type={type} value={values[name] ?? ''} onChange={set(name)} {...extra} /></label>;
  const select = (name, text, choices, required = true) => <label className="ld-field">{text}<select name={name} required={required} value={values[name] ?? ''} onChange={set(name)}>
    <option value="">{tr('Choose…', 'اختر…')}</option>{choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>;
  const contacts = (data.contacts?.items || []).map(c => ({ id: c.id, label: c.name || c.phone || tr('Customer', 'عميل') }));
  const technicians = (data.technicians || []).map(t => ({ id: t.accountId, label: t.name }));
  const services = (data.items?.items || []).filter(i => i.kind === 'service');
  const units = (data.units?.items || []).filter(u => !values.contactId || String(u.contactId) === String(values.contactId));
  const unitBoxes = () => units.length > 0 && <fieldset className="hb-check-list"><legend>{tr('Units', 'الوحدات')}</legend>{units.map(u => <label key={u.id} className="ld-check">
    <input type="checkbox" name="unitIds" value={u.id} checked={(values.unitIds || []).includes(u.id)}
      onChange={e => setValues(v => ({ ...v, unitIds: e.target.checked ? [...(v.unitIds || []), u.id] : (v.unitIds || []).filter(x => x !== u.id) }))} />
    <bdi>{u.label}</bdi> · {label('unitType', u.unitType, ar)}</label>)}</fieldset>;
  const lines = values.lines || [{ kind: 'service', name: '', variantId: '', qty: 1, price: '' }];
  const setLine = (i, patch) => setValues(v => ({ ...v, lines: lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));
  const pickService = (i, variantId) => {
    const item = services.find(s => s.variants?.[0]?.id === variantId), variant = item?.variants?.[0];
    setLine(i, variantId && item ? { variantId, kind: 'service', name: item.nameEn || item.nameAr, price: variant.priceMinor ? String(variant.priceMinor / 1000) : '' } : { variantId: '' });
  };
  const checks = values.checks || [{ text: '', result: 'pass' }];
  const costs = values.costs || [{ kind: 'parts', label: '', amount: '' }];
  const [en, arabic] = TITLES[form === 'job' && values.jobId ? 'editJob' : form === 'visit' && values.visitId ? 'reschedule' : form] || ['Record details', 'تسجيل التفاصيل'];
  return <form className="hb-panel hb-action-fields" onSubmit={onSubmit} aria-label={ar ? arabic : en} data-form={form}>
    <h2>{ar ? arabic : en}</h2>
    {values.subject && <p className="ld-help"><bdi>{values.subject}</bdi></p>}
    {form === 'invite' && <div className="hb-rule-fields">{field('email', tr('Email', 'البريد الإلكتروني'), 'email')}
      {select('operationalRole', tr('Role', 'الدور'), [{ id: 'technician', label: tr('Technician (own visits only, no prices)', 'فني (زياراته فقط، بلا أسعار)') }, { id: 'service_advisor', label: tr('Service advisor (jobs, schedule, estimates)', 'موظف خدمة (الأعمال والجدول والتسعيرات)') }])}</div>}
    {form === 'job' && <>
      {!values.jobId && select('contactId', tr('Customer', 'العميل'), contacts)}
      <div className="hb-rule-fields">
        {select('jobType', tr('Job type', 'نوع العمل'), options('jobType', ar).filter(o => o.id !== 'amc_visit'))}
        {select('reportedSymptom', tr('What the customer reported (optional)', 'ما ذكره العميل (اختياري)'), options('symptom', ar), false)}
        {field('area', tr('Area', 'المنطقة'), 'text', false, { maxLength: 60, placeholder: tr('e.g. Al Khuwair', 'مثال: الخوير') })}
        {!values.jobId && select('source', tr('Came in through', 'طريقة الطلب'), SOURCES.map(id => ({ id, label: label('source', id, ar) })), false)}
      </div>
      {unitBoxes()}
      <label className="ld-check"><input type="checkbox" name="urgent" checked={!!values.urgent} onChange={set('urgent')} /> {tr('Urgent (e.g. not cooling in the heat)', 'عاجل (مثلاً لا يبرد في الحر)')}</label>
      <p className="ld-help">{tr('What the customer said is kept as a fixed choice, never a diagnosis. The technician records the findings on site.', 'يُحفظ ما قاله العميل كاختيار ثابت، وليس تشخيصاً. يسجل الفني الملاحظات في الموقع.')}</p>
    </>}
    {form === 'visit' && <div className="hb-rule-fields">
      {select('technicianAccountId', tr('Technician', 'الفني'), technicians)}
      {field('date', tr('Day', 'اليوم'), 'date')}
      {field('from', tr('Window from', 'النافذة من'), 'time')}
      {field('to', tr('Window to', 'النافذة إلى'), 'time')}
      <p className="ld-help hb-span">{tr('A technician can’t be in two windows at once. The customer gets a reminder a day before, by itself.', 'لا يمكن أن يكون الفني في نافذتين معاً. يصل العميل تذكير قبل يوم تلقائياً.')}</p>
    </div>}
    {form === 'visitCancel' && field('reason', tr('Why (optional)', 'السبب (اختياري)'), 'text', false, { maxLength: 60 })}
    {form === 'visitDone' && select('outcome', tr('How the visit ended', 'كيف انتهت الزيارة'), options('outcome', ar))}
    {form === 'estimate' && <>
      {lines.map((l, i) => <div key={i} className="hb-rule-fields" data-line={i}>
        <label className="ld-field">{tr('From the catalog', 'من الكتالوج')}<select value={l.variantId || ''} onChange={e => pickService(i, e.target.value)}>
          <option value="">{tr('Typed line', 'بند مكتوب')}</option>{services.map(s => <option key={s.id} value={s.variants?.[0]?.id}>{(ar ? s.nameAr || s.nameEn : s.nameEn || s.nameAr)}{s.variants?.[0]?.priceMinor ? ` · ${h.money(s.variants[0].priceMinor)}` : ''}</option>)}</select></label>
        <label className="ld-field">{tr('Line', 'البند')}<input required maxLength={120} value={l.name} onChange={e => setLine(i, { name: e.target.value, variantId: '' })} /></label>
        <label className="ld-field">{tr('Kind', 'النوع')}<select value={l.kind} onChange={e => setLine(i, { kind: e.target.value })}>{options('line', ar).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="ld-field">{tr('Qty', 'الكمية')}<input type="number" min="1" max="1000" step="1" required value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} /></label>
        <label className="ld-field">{tr('Unit price (OMR)', 'سعر الوحدة (ر.ع.)')}<input type="number" min="0" step="0.001" required value={l.price} onChange={e => setLine(i, { price: e.target.value, variantId: '' })} /></label>
      </div>)}
      {lines.length < 30 && <button type="button" className="ld-button ld-quiet" onClick={() => setValues(v => ({ ...v, lines: [...lines, { kind: 'part', name: '', variantId: '', qty: 1, price: '' }] }))}>{tr('Add a line', 'إضافة بند')}</button>}
      <p className="ld-help">{tr('Catalog prices let Hasib send the estimate by himself within your limit; a typed price always waits for you. Each new version needs the customer’s own yes.', 'أسعار الكتالوج تتيح لحاسب إرسال التسعيرة بنفسه ضمن حدك؛ السعر المكتوب ينتظرك دائماً. كل نسخة جديدة تحتاج موافقة العميل الخاصة بها.')}</p>
    </>}
    {form === 'approval' && <div className="hb-rule-fields">
      {field('approvedBy', tr('Who said yes', 'من وافق'), 'text', true, { maxLength: 100 })}
      {select('evidenceSource', tr('How', 'كيف'), options('evidence', ar))}
    </div>}
    {form === 'parts' && <div className="hb-rule-fields">
      {field('partsLabel', tr('What part', 'القطعة'), 'text', true, { maxLength: 80, placeholder: tr('e.g. Fan motor', 'مثال: موتور مروحة') })}
      {field('expectedOn', tr('Expected on (optional)', 'المتوقع في (اختياري)'), 'date', false)}
    </div>}
    {form === 'cancelJob' && select('reason', tr('Why it is cancelled', 'سبب الإلغاء'), options('cancel', ar))}
    {form === 'checklist' && <>
      {checks.map((c, i) => <div key={i} className="hb-rule-fields" data-check={i}>
        <label className="ld-field">{tr('Check', 'الفحص')}<input maxLength={120} value={c.text} onChange={e => setValues(v => ({ ...v, checks: checks.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))} /></label>
        <label className="ld-field">{tr('Result', 'النتيجة')}<select value={c.result} onChange={e => setValues(v => ({ ...v, checks: checks.map((x, j) => j === i ? { ...x, result: e.target.value } : x) }))}>
          {options('check', ar).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      </div>)}
      {checks.length < 20 && <button type="button" className="ld-button ld-quiet" onClick={() => setValues(v => ({ ...v, checks: [...checks, { text: '', result: 'pass' }] }))}>{tr('Add a check', 'إضافة فحص')}</button>}
      <label className="ld-field">{tr('Findings (the technician’s words)', 'الملاحظات (بكلمات الفني)')}<textarea maxLength={500} rows={3} value={values.findings ?? ''} onChange={set('findings')} /></label>
    </>}
    {form === 'unit' && <>
      {!values.unitId && select('contactId', tr('Customer', 'العميل'), contacts)}
      <div className="hb-rule-fields">
        {field('label', tr('Name it', 'اسم الوحدة'), 'text', true, { maxLength: 60, placeholder: tr('e.g. Majlis split', 'مثال: سبليت المجلس') })}
        {select('unitType', tr('Type', 'النوع'), options('unitType', ar))}
        {field('brand', tr('Brand (optional)', 'الماركة (اختياري)'), 'text', false, { maxLength: 40 })}
        {field('capacityBtu', tr('Capacity BTU (optional)', 'السعة BTU (اختياري)'), 'number', false, { min: 1000, max: 1000000, step: 1000 })}
        {field('area', tr('Area (optional)', 'المنطقة (اختياري)'), 'text', false, { maxLength: 60 })}
      </div>
    </>}
    {form === 'service' && <>
      {!values.clear && field('serviceOn', tr('Next service date the technician recommends', 'موعد الصيانة القادم الذي يوصي به الفني'), 'date')}
      {values.hasDate && <label className="ld-check"><input type="checkbox" name="clear" checked={!!values.clear} onChange={set('clear')} /> {tr('Remove the date', 'إزالة الموعد')}</label>}
      <p className="ld-help">{tr('Only the technician’s date. Hasib never invents an interval; a reminder is drafted a week before and stops once a job is opened for the unit.', 'تاريخ الفني فقط. لا يخترع حاسب أي مدة؛ تُكتب رسالة تذكير قبل أسبوع وتتوقف عند فتح عمل للوحدة.')}</p>
    </>}
    {form === 'contract' && <>
      {!values.contractId && select('contactId', tr('Customer', 'العميل'), contacts)}
      {unitBoxes()}
      <div className="hb-rule-fields">
        {field('visitsPerYear', tr('Visits a year', 'عدد الزيارات سنوياً'), 'number', true, { min: 1, max: 12, step: 1 })}
        {field('price', tr('Price for the term (OMR)', 'السعر للمدة (ر.ع.)'), 'number', true, { min: 0, step: 0.001 })}
        {field('startsOn', tr('Starts', 'يبدأ'), 'date')}
        {field('endsOn', tr('Ends (default: one year)', 'ينتهي (افتراضياً بعد سنة)'), 'date', false)}
      </div>
      <p className="ld-help">{tr('Visits are spread evenly through the term. Hasib opens each one as a job two weeks before it is due, and drafts the renewal for you 30 and 7 days before the end.', 'تتوزع الزيارات بالتساوي على المدة. يفتح حاسب كل زيارة كعمل قبل موعدها بأسبوعين، ويكتب لك رسالة التجديد قبل ٣٠ و٧ أيام من الانتهاء.')}</p>
    </>}
    {form === 'activate' && <>{select('evidenceSource', tr('How the customer agreed', 'كيف وافق العميل'), options('evidence', ar))}
      <p className="ld-help">{tr('Activating charges the contract and links its units.', 'التفعيل يُصدر فاتورة العقد ويربط وحداته.')}</p></>}
    {form === 'contractCancel' && select('reason', tr('Why it is cancelled', 'سبب الإلغاء'), options('contractCancel', ar))}
    {form === 'costs' && <>
      {costs.map((c, i) => <div key={i} className="hb-rule-fields" data-cost={i}>
        <label className="ld-field">{tr('Kind', 'النوع')}<select value={c.kind} onChange={e => setValues(v => ({ ...v, costs: costs.map((x, j) => j === i ? { ...x, kind: e.target.value } : x) }))}>
          {options('cost', ar).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label className="ld-field">{tr('What', 'البيان')}<input maxLength={80} value={c.label} onChange={e => setValues(v => ({ ...v, costs: costs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} /></label>
        <label className="ld-field">{tr('Amount (OMR)', 'المبلغ (ر.ع.)')}<input type="number" min="0" step="0.001" value={c.amount} onChange={e => setValues(v => ({ ...v, costs: costs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))} /></label>
      </div>)}
      {costs.length < 20 && <button type="button" className="ld-button ld-quiet" onClick={() => setValues(v => ({ ...v, costs: [...costs, { kind: 'parts', label: '', amount: '' }] }))}>{tr('Add a cost', 'إضافة تكلفة')}</button>}
      <label className="ld-check"><input type="checkbox" name="costsComplete" checked={!!values.costsComplete} onChange={set('costsComplete')} /> {tr('These are all the job’s costs', 'هذه كل تكاليف العمل')}</label>
    </>}
    {form === 'payment' && <div className="hb-rule-fields">
      {field('amount', tr('Amount (OMR)', 'المبلغ (ر.ع.)'), 'number', true, { min: 0.001, step: 0.001 })}
      {select('method', tr('Method', 'الطريقة'), options('method', ar))}
      {field('reference', tr('Reference (optional)', 'المرجع (اختياري)'), 'text', false, { maxLength: 80 })}
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
