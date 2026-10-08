import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { livePackSummaries } from '../../config/hasib-packs';
import '../styles/owner.css';

const labels = { catalyst: ['Catalyst · Layla only', 'كاتاليست · ليلى فقط'], ascend: ['Ascend · Layla + Hasib', 'أسيند · ليلى + حاسب'] };

export default function AccessAdmin({ lang = 'en' }) {
  const ar = lang === 'ar', prefix = ar ? '' : '/en', tr = (en, arabic) => (ar ? arabic : en);
  const [authorized, setAuthorized] = useState(false);
  const [packId, setPackId] = useState('');
  const [csrf, setCsrf] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('catalyst');
  const [note, setNote] = useState('');
  const [grants, setGrants] = useState([]);
  const [revoked, setRevoked] = useState([]);
  const [status, setStatus] = useState(ar ? 'جارٍ تحميل قائمة الصلاحيات…' : 'Loading access list…');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setAuthorized(false);
    const session = await fetch('/api/auth-session', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json());
    setCsrf(session?.csrfToken || '');
    if (!session?.account) { setStatus(tr('Sign in with the administrator account to manage access.', 'سجّل الدخول بحساب المدير لإدارة الصلاحيات.')); return; }
    const response = await fetch('/api/access-admin', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setStatus(data.reason === 'admin_required' ? tr('This account cannot manage access.', 'هذا الحساب لا يملك إدارة الصلاحيات.') : tr('Could not load access grants.', 'تعذّر تحميل الصلاحيات.')); return; }
    setAuthorized(true);
    setGrants(data.grants || []);
    setRevoked((data.revoked || []).filter(row => !(data.grants || []).some(g => g.email === row.email)));
    setStatus(tr('Access list is up to date.', 'قائمة الصلاحيات محدّثة.'));
  }, []);

  useEffect(() => { load().catch(() => setStatus(tr('Could not load access grants.', 'تعذّر تحميل الصلاحيات.'))); }, [load]);

  async function changeAccess(method, body) {
    setBusy(true);
    setStatus(tr('Saving…', 'جارٍ الحفظ…'));
    try {
      const response = await fetch('/api/access-admin', {
        method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if ([401, 403].includes(response.status)) setAuthorized(false);
      if (!response.ok || !data.ok) throw new Error(data.reason || 'access_unavailable');
      setEmail(''); setNote('');
      await load();
      // A grant only works once someone signs in with exactly this address; say so while it is fresh.
      if (method === 'POST' && data.hasAccount === false) setStatus(tr(`Granted to ${data.email}, but no account uses this address yet. Access starts when someone signs up with exactly this email. Check the spelling.`, `مُنحت الصلاحية لـ ${data.email}، لكن لا يوجد حساب بهذا البريد بعد. تبدأ الصلاحية عندما يسجّل أحد بهذا البريد نفسه. تحقّق من الكتابة.`));
    } catch (error) {
      setStatus(error.message === 'admin_required' ? tr('This account cannot manage access.', 'هذا الحساب لا يملك إدارة الصلاحيات.') : tr('Access update failed. Try again.', 'تعذّر تحديث الصلاحية. حاول مجدداً.'));
    } finally { setBusy(false); }
  }

  return <main className="owner-home owner-access" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <nav aria-label={tr('Administration links', 'روابط الإدارة')}>
      <Link className="owner-brand" to={prefix || '/'}><img src="/logo.png" alt="" width="32" height="32" />BznsFlow</Link>
      <Link to={`${ar ? '/en' : ''}/owner/access`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</Link>
    </nav>
    <header className="owner-heading">
      <p><Link to={`${prefix}/owner`}>{tr('Admin dashboard', 'لوحة الإدارة')}</Link></p>
      <h1>{tr('Product access', 'صلاحيات المنتجات')}</h1>
      <p>{tr('Only this account can grant or revoke access. New users can verify an email address, but receive no product access until granted.', 'هذا الحساب وحده يمنح الصلاحيات ويلغيها. يستطيع المستخدم الجديد تأكيد بريده، لكنه لا يحصل على أي منتج قبل المنح.')}</p>
    </header>
    {authorized && <>
      <form className="owner-form" onSubmit={event => { event.preventDefault(); changeAccess('POST', { email, plan, note, ...(plan === 'ascend' && packId ? { packId } : {}) }); }}>
        <label>{tr('Email', 'البريد')}<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>{tr('Product', 'المنتج')}<select value={plan} onChange={event => setPlan(event.target.value)}><option value="catalyst">{tr('Catalyst', 'كاتاليست')}</option><option value="ascend">{tr('Ascend', 'أسيند')}</option></select></label>
        {plan === 'ascend' && <label>{tr('Live sector (optional)', 'القطاع (اختياري)')}<select value={packId} onChange={event => setPackId(event.target.value)}><option value="">{tr('Keep existing sector', 'أبقِ القطاع الحالي')}</option>{livePackSummaries().map(pack => <option key={pack.id} value={pack.id}>{ar ? pack.ar : pack.en}</option>)}</select></label>}
        <label className="owner-form-wide">{tr('Internal note (optional)', 'ملاحظة داخلية (اختيارية)')}<input maxLength={200} value={note} onChange={event => setNote(event.target.value)} /></label>
        <div className="owner-form-wide"><button className="owner-primary" disabled={busy || !csrf} type="submit">{tr('Grant access', 'امنح الصلاحية')}</button></div>
      </form>
      <section><h2>{tr('Active grants', 'الصلاحيات الفعّالة')}</h2>
        {grants.length ? <GrantTable rows={grants} action={tr('Revoke', 'ألغِ')} busy={busy} tr={tr} ar={ar} onAction={grant => changeAccess('DELETE', { email: grant.email })} /> : <p>{tr('No active access grants.', 'لا توجد صلاحيات فعّالة.')}</p>}
      </section>
      {revoked.length > 0 && <section><h2>{tr('Revoked', 'الملغاة')}</h2>
        <GrantTable rows={revoked} action={tr('Grant again', 'امنح من جديد')} busy={busy} tr={tr} ar={ar} onAction={grant => changeAccess('POST', { email: grant.email, plan: grant.plan, ...(grant.packId ? { packId: grant.packId } : {}) })} /></section>}
    </>}
    <p className="owner-status" role="status" aria-live="polite">{status}</p>
    {!authorized && <Link className="owner-primary" to={`${prefix}/signin`}>{tr('Sign in', 'تسجيل الدخول')}</Link>}
  </main>;
}

// "Signed up" matters: a grant does nothing until someone signs in with exactly that address.
function GrantTable({ rows, action, busy, onAction, tr, ar }) {
  return <div className="owner-table-scroll"><table className="owner-table">
    <thead><tr>{[tr('Email', 'البريد'), tr('Access', 'الصلاحية'), tr('Signed up', 'مسجّل'), tr('Date', 'التاريخ'), tr('Note', 'ملاحظة'), tr('Action', 'إجراء')].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map(grant => <tr key={grant.email}>
      <td dir="ltr">{grant.email}</td>
      <td>{labels[grant.plan]?.[ar ? 1 : 0] || grant.plan}</td>
      <td className={grant.hasAccount ? undefined : 'is-warning'}>{grant.hasAccount ? tr('Yes', 'نعم') : tr('No account with this email yet', 'لا يوجد حساب بهذا البريد بعد')}</td>
      <td>{new Date(grant.status === 'revoked' && grant.revokedAt ? grant.revokedAt : grant.grantedAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
      <td>{grant.note}</td>
      <td><button type="button" className="owner-secondary" disabled={busy} onClick={() => onAction(grant)}>{action}</button></td>
    </tr>)}</tbody>
  </table></div>;
}
