import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APEX_STATUSES } from '../../config/apex.js';
import '../styles/owner.css';

const STATUS = { new: ['New', 'جديد'], contacted: ['Contacted', 'تم التواصل'], scoped: ['Scoped and quoted', 'حُدّد النطاق وأُرسل السعر'], closed: ['Closed', 'مغلق'] };
const FUNCTIONS = { erp: ['ERP / Odoo connection', 'الربط مع Odoo وERP'], branches: ['Branches and teams routing', 'توزيع العمل بين الفروع والفرق'],
  workflows: ['Custom agent workflows', 'وكلاء لمهام مخصّصة'], channels: ['Voice and other channels', 'الصوت وقنوات أخرى'], other: ['Something else', 'شيء آخر'] };
const SYSTEMS = { odoo: ['Odoo', 'Odoo'], other_erp: ['Another ERP', 'نظام ERP آخر'], none: ['No ERP yet', 'لا يوجد ERP'] };

/**
 * Ahmed's Apex queue (2026-10-27): every request from /apex, newest first. Each one moves
 * new → contacted → scoped and quoted → closed, with an internal note. Nothing here reaches the company.
 */
export default function ApexAdmin({ lang = 'en' }) {
  const ar = lang === 'ar', prefix = ar ? '' : '/en', tr = (en, arabic) => (ar ? arabic : en);
  const [csrf, setCsrf] = useState('');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(tr('Loading the requests…', 'جارٍ تحميل الطلبات…'));
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const session = await fetch('/api/auth-session', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json());
    setCsrf(session?.csrfToken || '');
    if (!session?.account) { setData(null); setStatus(tr('Sign in with the administrator account.', 'سجّل الدخول بحساب المدير.')); return; }
    const response = await fetch('/api/access-admin?op=apex', { credentials: 'same-origin', cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) { setData(null); setStatus(body.reason === 'admin_required' ? tr('This account cannot see the requests.', 'هذا الحساب لا يملك الوصول إلى الطلبات.') : tr('Could not load the requests.', 'تعذّر تحميل الطلبات.')); return; }
    setData(body);
    setStatus(body.requests.length ? '' : tr('No Apex requests yet.', 'لا توجد طلبات أبيكس بعد.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load().catch(() => setStatus(tr('Could not load the requests.', 'تعذّر تحميل الطلبات.'))); }, [load]);

  const update = async (requestId, body) => {
    setBusy(requestId); setStatus(tr('Saving…', 'جارٍ الحفظ…'));
    try {
      const response = await fetch('/api/access-admin?op=apex', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ requestId, ...body }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.reason || 'apex_unavailable');
      await load();
      setStatus(tr('Saved.', 'تم الحفظ.'));
    } catch { setStatus(tr('Could not save. Try again.', 'تعذّر الحفظ. حاول مجددًا.')); }
    finally { setBusy(''); }
  };

  return <main className="owner-home owner-websites owner-apex" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <nav aria-label={tr('Administration links', 'روابط الإدارة')}>
      <Link className="owner-brand" to={prefix || '/'}><img src="/logo.png" alt="" width="32" height="32" />BznsFlow</Link>
      <Link to={`${ar ? '/en' : ''}/owner/apex`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</Link>
    </nav>
    <header className="owner-heading">
      <p><Link to={`${prefix}/owner`}>{tr('Admin dashboard', 'لوحة الإدارة')}</Link></p>
      <h1>{tr('Apex requests', 'طلبات أبيكس')}</h1>
      <p>{tr('Custom enterprise requests from /apex, newest first. Reply within one business day; quote only after scoping.', 'طلبات الشركات من صفحة أبيكس، الأحدث أولًا. الرد خلال يوم عمل؛ السعر بعد تحديد النطاق فقط.')}</p>
    </header>
    {data?.requests.map(r => <ApexRow key={r.id} r={r} tr={tr} ar={ar} busy={busy === r.id} onUpdate={body => update(r.id, body)} />)}
    <p className="owner-status" role="status" aria-live="polite">{status}</p>
    {!data && <Link className="owner-primary" to={`${prefix}/signin`}>{tr('Sign in', 'تسجيل الدخول')}</Link>}
  </main>;
}

function ApexRow({ r, tr, ar, busy, onUpdate }) {
  const [note, setNote] = useState(r.adminNote);
  const when = new Intl.DateTimeFormat(ar ? 'ar-OM-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }).format(new Date(r.createdAt));
  const next = APEX_STATUSES[APEX_STATUSES.indexOf(r.status) + 1];
  return (
    <section className="owner-website owner-apex-request" data-status={r.status} aria-labelledby={`apex-${r.id}`}>
      <div className="owner-website-head">
        <h2 id={`apex-${r.id}`} dir="auto">{r.company}</h2>
        <span className="owner-website-stage">{tr(...STATUS[r.status])}</span>
        <span className="owner-website-due">{tr('Sent', 'أُرسل')} {when}</span>
      </div>
      <dl className="owner-website-facts">
        <div><dt>{tr('Contact', 'جهة التواصل')}</dt><dd><span dir="auto">{r.name}</span> · <a href={`mailto:${r.email}`} dir="ltr">{r.email}</a>{r.phone ? <> · <span dir="ltr">{r.phone}</span></> : null}</dd></div>
        <div><dt>{tr('Functions', 'المهام')}</dt><dd>{r.functions.map(f => tr(...(FUNCTIONS[f] || [f, f]))).join(' · ')}</dd></div>
        {(r.branches || r.staff) && <div><dt>{tr('Size', 'الحجم')}</dt><dd>{[r.branches && tr(`${r.branches} branches`, `${r.branches} فروع`), r.staff && tr(`${r.staff} staff`, `${r.staff} موظفين`)].filter(Boolean).join(' · ')}</dd></div>}
        {(r.system || r.systemNote) && <div><dt>{tr('Systems', 'الأنظمة')}</dt><dd dir="auto">{[r.system && tr(...SYSTEMS[r.system]), r.systemNote].filter(Boolean).join(' — ')}</dd></div>}
        <div><dt>{tr('What the agents should do', 'ماذا يجب أن يفعل الوكلاء')}</dt><dd dir="auto" className="owner-apex-need">{r.need}</dd></div>
      </dl>
      <div className="owner-website-actions">
        {next && <button className="owner-primary" disabled={busy} onClick={() => onUpdate({ status: next })}>{tr('Mark: ', 'تحديد: ')}{tr(...STATUS[next])}</button>}
        {r.status !== 'closed' && next !== 'closed' && <button className="owner-secondary" disabled={busy} onClick={() => onUpdate({ status: 'closed' })}>{tr('Close', 'إغلاق')}</button>}
        {r.status === 'closed' && <button className="owner-secondary" disabled={busy} onClick={() => onUpdate({ status: 'new' })}>{tr('Reopen', 'إعادة فتح')}</button>}
      </div>
      <details className="owner-website-more">
        <summary>{tr('Internal note', 'ملاحظة داخلية')}</summary>
        <div className="owner-form">
          <label className="owner-form-wide">{tr('Scope, quote or next step', 'النطاق أو السعر أو الخطوة التالية')}<textarea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
          <div className="owner-form-wide"><button className="owner-secondary" disabled={busy || note === r.adminNote} onClick={() => onUpdate({ adminNote: note })}>{tr('Save note', 'احفظ الملاحظة')}</button></div>
        </div>
      </details>
    </section>
  );
}
