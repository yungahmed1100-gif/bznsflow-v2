import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { livePackSummaries, isLivePack } from '../../config/hasib-packs';
import LaylaDashboard from './LaylaDashboard';
import '../styles/owner.css';

export function OwnerGate({ lang = 'en', children }) {
  const [state, setState] = useState('loading');
  const ar = lang === 'ar';
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/access-admin', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => setState(response.ok && (await response.json()).ok ? 'authorized' : response.status === 401 ? 'signed-out' : response.status === 403 ? 'forbidden' : 'error'))
      .catch(error => { if (error.name !== 'AbortError') setState('error'); });
    return () => controller.abort();
  }, []);
  if (state === 'authorized') return children;
  const text = {
    loading: ar ? 'جارٍ التحقق من صلاحية الوصول…' : 'Checking administrator access…',
    'signed-out': ar ? 'سجّل الدخول بحساب المدير.' : 'Sign in with the administrator account.',
    forbidden: ar ? 'هذا الحساب لا يملك صلاحية الإدارة.' : 'This account cannot access the admin dashboard.',
    error: ar ? 'تعذّر التحقق من الوصول. أعد تحميل الصفحة للمحاولة.' : 'Could not verify access. Reload to try again.',
  };
  return <main className="owner-home" dir={ar ? 'rtl' : 'ltr'}><h1>{ar ? 'لوحة الإدارة' : 'Admin dashboard'}</h1><p role="status">{text[state]}</p>{state === 'signed-out' && <Link to={ar ? '/signin' : '/en/signin'}>{ar ? 'تسجيل الدخول' : 'Sign in'}</Link>}</main>;
}

function SetupStatus({ lang }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/layla-meta?surface=dashboard', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(response => response.json()).then(setStatus).catch(error => { if (error.name !== 'AbortError') setStatus({ reason: 'unavailable' }); });
    return () => controller.abort();
  }, []);
  const ar = lang === 'ar';
  return <p role="status">{!status ? (ar ? 'جارٍ تحميل الحالة…' : 'Loading setup status…') : status.ok ? (status.connected ? (ar ? 'قناة المراسلة متصلة.' : 'Messaging channel connected.') : (ar ? 'قناة المراسلة غير متصلة.' : 'Messaging channel disconnected.')) : status.reason === 'setup_required' ? (ar ? 'لم يكتمل إعداد النشاط بعد.' : 'Business setup is not complete yet.') : (ar ? 'تعذّر تحميل حالة الإعداد.' : 'Setup status is unavailable.')}</p>;
}

export default function OwnerHome({ lang = 'ar' }) {
  const ar = lang === 'ar', prefix = ar ? '' : '/en';
  return <OwnerGate lang={lang}><main className="owner-home" dir={ar ? 'rtl' : 'ltr'} lang={lang}>

    <nav><Link to={prefix || '/'}>BznsFlow</Link> · <Link to={`${ar ? '/en' : ''}/owner`}>{ar ? 'English' : 'العربية'}</Link></nav>
    <h1>{ar ? 'لوحة الإدارة' : 'Admin dashboard'}</h1>
    <section><h2>{ar ? 'صلاحيات المنتجات' : 'Product access'}</h2><p>{ar ? 'منح وإلغاء صلاحيات Catalyst وAscend.' : 'Grant and revoke Catalyst and Ascend access.'}</p><Link to={`${prefix}/owner/access`}>{ar ? 'إدارة الوصول' : 'Manage product access'}</Link></section>
    <section><h2>{ar ? 'معاينات القطاعات المباشرة' : 'Live sector previews'}</h2><p>{ar ? 'لوحات تجريبية للقراءة فقط. لا تتغير بيانات نشاطك أو قطاعه.' : 'Read-only sample dashboards. Your business records and sector stay unchanged.'}</p><div className="owner-cards">{livePackSummaries().map(pack => <Link key={pack.id} to={`${prefix}/owner/preview/${pack.id}`}><strong>{ar ? pack.ar : pack.en}</strong><span>{ar ? 'بيانات تجريبية · للقراءة فقط' : 'Sample data · Read only'}</span></Link>)}</div></section>
    <section><h2>{ar ? 'نشاطي / حالة الإعداد' : 'My business / setup status'}</h2><SetupStatus lang={lang} /><p><Link to={`${prefix}/layla/dashboard`}>{ar ? 'نشاطي — بيانات حقيقية' : 'My business — real data'}</Link></p><Link to={`${prefix}/layla/setup`}>{ar ? 'إعداد النشاط' : 'Business setup'}</Link></section>
  </main></OwnerGate>;
}

export function OwnerPreview({ lang = 'ar' }) {
  const { packId } = useParams();
  return <OwnerGate lang={lang}>{isLivePack(packId) ? <LaylaDashboard key={packId} lang={lang} previewPack={packId} /> : <main className="owner-home"><h1>{lang === 'ar' ? 'المعاينة غير متاحة' : 'Preview unavailable'}</h1></main>}</OwnerGate>;
}
