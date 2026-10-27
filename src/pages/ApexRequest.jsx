import React, { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { waLink } from '../lib/whatsapp';
import { APEX_NEED_MAX } from '../../config/apex.js';
import '../styles/legal.css';
import '../styles/audit.css';
import '../styles/apex.css';

// Apex (Ahmed, 2026-10-27): custom enterprise solutions by request. A company names the agent functions it
// needs; the request reaches Ahmed by email and in /owner/apex, and he scopes and quotes it. Same frame and
// form styles as the audit booking page; the WhatsApp button stays under the form.
const FUNCTIONS = [
  ['erp', 'box', 'ERP and Odoo connection', 'الربط مع Odoo وأنظمة ERP', 'Stock, orders, customers, draft quotes', 'المخزون والطلبات والعملاء ومسودات العروض'],
  ['branches', 'users', 'Branches and teams routing', 'توزيع العمل بين الفروع والفرق', 'One customer flow across branches and staff', 'تدفّق واحد للعملاء بين الفروع والموظفين'],
  ['workflows', 'bot', 'Custom agent workflows', 'وكلاء لمهام مخصّصة', 'An agent for a job you name', 'وكيل لمهمة تحدّدها أنت'],
  ['channels', 'phone', 'Voice and other channels', 'الصوت وقنوات أخرى', 'Phone, website chat and email', 'الهاتف ومحادثة الموقع والبريد'],
  ['other', 'plus', 'Something else', 'شيء آخر', 'Tell us below', 'اكتبه في الأسفل'],
];
const SIZES = ['1', '2-5', '6-20', '21+'];

const COPY = {
  en: {
    title: 'Request Apex',
    lead: 'Custom enterprise solutions: agents built for the functions your company names, connected to your systems, with your approvals. Tell us what you need; we scope it with you and send a quote.',
    company: 'Company', name: 'Your name', email: 'Work email', phone: 'Phone / WhatsApp (optional)',
    branches: 'Branches (optional)', staff: 'Staff who handle customers (optional)', choose: 'Choose',
    system: 'Your business system (optional)', systems: { odoo: 'Odoo', other_erp: 'Another ERP', none: 'No ERP yet' }, systemNote: 'Which one, and its version (optional)',
    functions: 'Which agent functions do you need?', need: 'What should the agents do?', needHint: 'The jobs, the systems involved, and who approves what.',
    send: 'Send my request', sending: 'Sending…', or: 'Or talk to us first', whatsapp: 'Ask about Apex on WhatsApp',
    done: 'Request received', doneLead: 'We’ll reply within one business day from ahmed@bznsflowai.com to set up a scoping call. There’s no price until we agree the scope with you.',
    home: 'Back to the home page', waMsg: 'Hi BznsFlow, I’d like to hear about Apex.',
    errors: { invalid_company: 'Enter your company name.', invalid_name: 'Enter your name.', invalid_email: 'Enter a valid email address.',
      invalid_functions: 'Choose at least one agent function.', invalid_need: 'Describe what the agents should do (a sentence or two).',
      too_many_requests: 'We already have your requests from today. We’ll be in touch.', rate_ip: 'Too many tries. Wait a minute and try again.',
      default: 'Could not send. Try again, or message us on WhatsApp.' },
  },
  ar: {
    title: 'اطلب أبيكس',
    lead: 'حلول مخصّصة للشركات: وكلاء نبنيهم للمهام التي تحدّدها شركتك، مرتبطون بأنظمتك، وبموافقتك. أخبرنا بما تحتاجه، ونحدّد النطاق معك ثم نرسل السعر.',
    company: 'الشركة', name: 'اسمك', email: 'بريد العمل', phone: 'الهاتف / واتساب (اختياري)',
    branches: 'عدد الفروع (اختياري)', staff: 'الموظفون الذين يتعاملون مع العملاء (اختياري)', choose: 'اختر',
    system: 'نظام إدارة أعمالك (اختياري)', systems: { odoo: 'Odoo', other_erp: 'نظام ERP آخر', none: 'لا يوجد نظام ERP بعد' }, systemNote: 'ما هو، وما إصداره؟ (اختياري)',
    functions: 'ما مهام الوكلاء التي تحتاجها؟', need: 'ماذا يجب أن يفعل الوكلاء؟', needHint: 'المهام، والأنظمة المعنية، ومن يوافق على ماذا.',
    send: 'أرسل طلبي', sending: 'جارٍ الإرسال…', or: 'أو تحدّث معنا أولًا', whatsapp: 'اسأل عن أبيكس على واتساب',
    done: 'وصلنا طلبك', doneLead: 'سنرد خلال يوم عمل واحد من ahmed@bznsflowai.com لترتيب مكالمة لتحديد النطاق. لا يوجد سعر قبل أن نتفق على النطاق معك.',
    home: 'العودة إلى الصفحة الرئيسية', waMsg: 'مرحباً BznsFlow، أريد أن أعرف عن أبيكس.',
    errors: { invalid_company: 'أدخل اسم الشركة.', invalid_name: 'أدخل اسمك.', invalid_email: 'أدخل بريدًا إلكترونيًا صحيحًا.',
      invalid_functions: 'اختر مهمة واحدة على الأقل.', invalid_need: 'صف ما يجب أن يفعله الوكلاء (جملة أو جملتان).',
      too_many_requests: 'وصلتنا طلباتك اليوم. سنتواصل معك.', rate_ip: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.',
      default: 'تعذّر الإرسال. حاول مجددًا أو راسلنا على واتساب.' },
  },
};

const ENDPOINT = '/api/lead?op=apex';

export default function ApexRequest({ lang = 'ar' }) {
  const ar = lang === 'ar', c = COPY[ar ? 'ar' : 'en'];
  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', branches: '', staff: '', system: '', systemNote: '', need: '', website: '' });
  const [functions, setFunctions] = useState([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const set = key => event => { setForm(value => ({ ...value, [key]: event.target.value })); setError(''); };
  const toggle = id => { setFunctions(list => list.includes(id) ? list.filter(f => f !== id) : [...list, id]); setError(''); };
  const ready = form.company.trim() && form.name.trim() && form.email.trim() && functions.length && form.need.trim().length >= 10;

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, functions, lang }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw Object.assign(new Error('send'), { reason: body.reason });
      setSent(true);
    } catch (e) { setError(c.errors[e.reason] || c.errors.default); }
    finally { setBusy(false); }
  };
  const whatsapp = <a className="btn btn-ghost apex-whatsapp" href={waLink(c.waMsg)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /><span>{c.whatsapp}</span></a>;

  return (
    <main className="legal-shell audit-shell" id="main-content" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <header className="legal-nav">
        <a className="legal-brand" href={ar ? '/' : '/en'}><img src="/logo.png" alt="BznsFlow" width="36" height="36" /><span>BznsFlow</span></a>
        <a className="legal-lang" href={ar ? '/en/apex' : '/apex'} lang={ar ? 'en' : 'ar'}><Icon name="globe" size={15} /><span>{ar ? 'English' : 'العربية'}</span></a>
      </header>
      <article className="audit-card">
        {sent ? (
          <section className="audit-done" aria-live="polite">
            <p className="audit-done-mark"><Icon name="check" size={18} /> {c.done}</p>
            <h1>{form.company.trim()}</h1>
            <p>{c.doneLead}</p>
            <div className="apex-done-actions">{whatsapp}<a className="btn btn-ghost" href={ar ? '/' : '/en'}>{c.home}</a></div>
          </section>
        ) : <>
          <h1 className="audit-title">{c.title}</h1>
          <p className="audit-lead">{c.lead}</p>
          <form className="audit-form" onSubmit={submit} noValidate>
            <fieldset className="apex-functions">
              <legend className="audit-step">{c.functions}</legend>
              {FUNCTIONS.map(([id, icon, en, arabic, hintEn, hintAr]) => (
                <label key={id} className="apex-function">
                  <input type="checkbox" checked={functions.includes(id)} onChange={() => toggle(id)} />
                  <Icon name={icon} size={20} className="apex-function-icon" />
                  <span><strong>{ar ? arabic : en}</strong><small>{ar ? hintAr : hintEn}</small></span>
                </label>
              ))}
            </fieldset>
            <label>{c.need}<small className="apex-hint">{c.needHint}</small><textarea required rows={5} maxLength={APEX_NEED_MAX} value={form.need} onChange={set('need')} /></label>
            <div className="apex-pair">
              <label>{c.company}<input required autoComplete="organization" maxLength={120} value={form.company} onChange={set('company')} /></label>
              <label>{c.name}<input required autoComplete="name" maxLength={80} value={form.name} onChange={set('name')} /></label>
              <label>{c.email}<input required type="email" autoComplete="email" dir="ltr" maxLength={254} value={form.email} onChange={set('email')} /></label>
              <label>{c.phone}<input type="tel" autoComplete="tel" dir="ltr" maxLength={20} value={form.phone} onChange={set('phone')} /></label>
              <label>{c.branches}<select value={form.branches} onChange={set('branches')}><option value="">{c.choose}</option>{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
              <label>{c.staff}<select value={form.staff} onChange={set('staff')}><option value="">{c.choose}</option>{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
              <label>{c.system}<select value={form.system} onChange={set('system')}><option value="">{c.choose}</option>{Object.entries(c.systems).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
              <label>{c.systemNote}<input maxLength={200} value={form.systemNote} onChange={set('systemNote')} /></label>
            </div>
            {/* Left empty by people; bots fill it. */}
            <label className="audit-hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
            {error && <p className="audit-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy || !ready}>{busy ? c.sending : c.send}</button>
          </form>
          <div className="apex-or"><p>{c.or}</p>{whatsapp}</div>
        </>}
      </article>
    </main>
  );
}
