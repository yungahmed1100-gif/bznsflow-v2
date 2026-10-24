import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WEBSITE_STAGES } from '../../config/website-brief.js';
import '../styles/owner.css';

const STAGE = { received: ['Details received', 'استلمنا التفاصيل'], domain: ['Domain registered', 'تسجيل النطاق'], mailbox: ['Mailbox ready', 'تجهيز البريد'],
  building: ['Website built', 'بناء الموقع'], live: ['Live', 'منشور'] };
const HOUR = 3600000;

/**
 * Ahmed's free-website queue (2026-10-23): every Ascend brief, soonest due first. Each move here is what
 * the owner's Website tab shows; a new date needs a reason, which the owner sees too.
 */
export default function WebsitesAdmin({ lang = 'en' }) {
  const ar = lang === 'ar', prefix = ar ? '' : '/en', tr = (en, arabic) => (ar ? arabic : en);
  const [csrf, setCsrf] = useState('');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(tr('Loading the queue…', 'جارٍ تحميل القائمة…'));
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const session = await fetch('/api/auth-session', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json());
    setCsrf(session?.csrfToken || '');
    if (!session?.account) { setData(null); setStatus(tr('Sign in with the administrator account.', 'سجّل الدخول بحساب المدير.')); return; }
    const response = await fetch('/api/access-admin?op=websites', { credentials: 'same-origin', cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) { setData(null); setStatus(body.reason === 'admin_required' ? tr('This account cannot see the queue.', 'هذا الحساب لا يملك الوصول إلى القائمة.') : tr('Could not load the queue.', 'تعذّر تحميل القائمة.')); return; }
    setData(body);
    setStatus(body.open.length ? '' : tr('Nothing waiting. Every website is live.', 'لا شيء بالانتظار. كل المواقع منشورة.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load().catch(() => setStatus(tr('Could not load the queue.', 'تعذّر تحميل القائمة.'))); }, [load]);

  const update = async (projectId, body) => {
    setBusy(projectId); setStatus(tr('Saving…', 'جارٍ الحفظ…'));
    try {
      const response = await fetch('/api/access-admin?op=websites', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ projectId, ...body }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.reason || 'websites_unavailable');
      await load();
      setStatus(tr('Saved. The owner sees it now.', 'تم الحفظ. يراه صاحب النشاط الآن.'));
      return true;
    } catch (error) {
      const reason = { live_url_required: tr('Add the website’s https:// address first.', 'أضف رابط الموقع https:// أولًا.'), reason_required: tr('Say why the date moves; the owner sees it.', 'اذكر سبب تغيير الموعد؛ يراه صاحب النشاط.'),
        invalid_due: tr('Pick a date within the next 60 days.', 'اختر موعدًا خلال 60 يومًا.') }[error.message];
      setStatus(reason || tr('Could not save. Try again.', 'تعذّر الحفظ. حاول مجددًا.'));
      return false;
    } finally { setBusy(''); }
  };

  return <main className="owner-home owner-websites" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <nav aria-label={tr('Administration links', 'روابط الإدارة')}>
      <Link className="owner-brand" to={prefix || '/'}><img src="/logo.png" alt="" width="32" height="32" />BznsFlow</Link>
      <Link to={`${ar ? '/en' : ''}/owner/websites`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</Link>
    </nav>
    <header className="owner-heading">
      <p><Link to={`${prefix}/owner`}>{tr('Admin dashboard', 'لوحة الإدارة')}</Link></p>
      <h1>{tr('Websites to deliver', 'مواقع للتسليم')}</h1>
      <p>{tr('Every Ascend brief, soonest due first. Promised within 3 business days (Sunday to Thursday).', 'كل طلبات أسيند، الأقرب موعدًا أولًا. الوعد خلال 3 أيام عمل (الأحد إلى الخميس).')}</p>
    </header>
    {data && <>
      {data.open.map(p => <WebsiteRow key={p.id} p={p} tr={tr} ar={ar} busy={busy === p.id} onUpdate={body => update(p.id, body)} />)}
      {data.live.length > 0 && <section className="owner-websites-live"><h2>{tr('Live', 'منشورة')}</h2>
        <ul>{data.live.map(p => <li key={p.id}><strong>{p.business}</strong> · <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" dir="ltr">{p.liveUrl}</a></li>)}</ul>
      </section>}
    </>}
    <p className="owner-status" role="status" aria-live="polite">{status}</p>
    {!data && <Link className="owner-primary" to={`${prefix}/signin`}>{tr('Sign in', 'تسجيل الدخول')}</Link>}
  </main>;
}

function WebsiteRow({ p, tr, ar, busy, onUpdate }) {
  const [liveUrl, setLiveUrl] = useState(p.domain ? `https://${p.domain}` : 'https://');
  const [due, setDue] = useState(''), [reason, setReason] = useState(''), [note, setNote] = useState(p.note);
  const next = WEBSITE_STAGES[WEBSITE_STAGES.indexOf(p.stage) + 1];
  const left = p.dueAt - Date.now();
  const when = new Intl.DateTimeFormat(ar ? 'ar-OM-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }).format(new Date(p.dueAt));
  const urgency = left < 0 ? 'is-overdue' : left < 24 * HOUR ? 'is-soon' : '';
  const moveDate = () => {
    const at = Date.parse(`${due}T17:00:00+04:00`);
    if (Number.isFinite(at)) onUpdate({ action: 'set_due', dueAt: at, reason }).then(ok => ok && (setDue(''), setReason('')));
  };
  return (
    <section className={`owner-website ${urgency}`} aria-labelledby={`site-${p.id}`}>
      <div className="owner-website-head">
        <h2 id={`site-${p.id}`}>{p.business}</h2>
        <span className="owner-website-stage">{tr(...STAGE[p.stage])}</span>
        <span className="owner-website-due">{left < 0 ? tr('Overdue since', 'متأخر منذ') : tr('Due', 'الموعد')} {when}</span>
      </div>
      <dl className="owner-website-facts">
        <div><dt>{tr('Owner', 'صاحب النشاط')}</dt><dd dir="ltr">{p.email}{p.phone ? ` · ${p.phone}` : ''}</dd></div>
        <div><dt>{tr('Domain', 'النطاق')}</dt><dd dir="ltr">{p.domain}{p.alternates.length ? ` (${tr('backups', 'بدائل')}: ${p.alternates.join(', ')})` : ''}</dd></div>
        <div><dt>{tr('Mailbox', 'البريد')}</dt><dd dir="ltr">{p.mailbox}</dd></div>
        <div><dt>{tr('Brief', 'الطلب')}</dt><dd>{tr(`Version ${p.briefVersion}, in your email`, `النسخة ${p.briefVersion}، في بريدك`)}</dd></div>
        {p.delayReason && <div><dt>{tr('Told the owner', 'أُبلغ صاحب النشاط')}</dt><dd>{p.delayReason}</dd></div>}
      </dl>
      <div className="owner-website-actions">
        {next === 'live' && <label>{tr('Live address', 'رابط الموقع')}<input dir="ltr" type="url" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} /></label>}
        {next && <button className="owner-primary" disabled={busy} onClick={() => onUpdate({ action: 'advance', ...(next === 'live' ? { liveUrl } : {}) })}>
          {tr('Mark done: ', 'تم: ')}{tr(...STAGE[next])}
        </button>}
      </div>
      <details className="owner-website-more">
        <summary>{tr('Move the date or add a note', 'غيّر الموعد أو أضف ملاحظة')}</summary>
        <div className="owner-form">
          <label>{tr('New date (17:00 Muscat)', 'الموعد الجديد (17:00 بتوقيت مسقط)')}<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
          <label className="owner-form-wide">{tr('Reason, shown to the owner', 'السبب، يظهر لصاحب النشاط')}<input maxLength={200} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <div className="owner-form-wide"><button className="owner-secondary" disabled={busy || !due || !reason.trim()} onClick={moveDate}>{tr('Move date', 'غيّر الموعد')}</button></div>
          <label className="owner-form-wide">{tr('Internal note', 'ملاحظة داخلية')}<input maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
          <div className="owner-form-wide"><button className="owner-secondary" disabled={busy || note === p.note} onClick={() => onUpdate({ action: 'note', note })}>{tr('Save note', 'احفظ الملاحظة')}</button></div>
        </div>
      </details>
    </section>
  );
}
