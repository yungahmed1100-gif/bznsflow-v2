import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { livePackSummaries, isLivePack } from '../../config/hasib-packs';
import LaylaDashboard from './LaylaDashboard';
import '../styles/owner.css';

const WORK = {
  retail: ['Sales, fulfilment and stock', 'المبيعات والتسليم والمخزون'],
  'retail-tech': ['Devices, repairs and warranty', 'الأجهزة والإصلاحات والضمان'],
  dental: ['Patient inquiries and visits', 'استفسارات المرضى والزيارات'],
  'real-estate': ['Opportunities, viewings and deals', 'الفرص والمعاينات والصفقات'],
  construction: ['Projects, procurement and receivables', 'المشاريع والمشتريات والمستحقات'],
  automotive: ['Approvals, workshop and collection', 'الموافقات والورشة والاستلام'],
};

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

    <nav aria-label={ar ? 'روابط الإدارة' : 'Administration links'}><Link className="owner-brand" to={prefix || '/'}><img src="/logo.png" alt="" width="32" height="32" />BznsFlow</Link><Link to={`${ar ? '/en' : ''}/owner`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</Link></nav>
    <header className="owner-heading"><p>{ar ? 'مساحة أحمد' : 'Ahmed’s workspace'}</p><h1>{ar ? 'لوحة الإدارة' : 'Admin dashboard'}</h1><p>{ar ? 'إدارة الوصول، مراجعة القطاعات، ومتابعة نشاطك.' : 'Manage access, review the sectors, and open your business.'}</p></header>
    <div className="owner-workspaces">
      <section><div className="owner-section-heading"><h2>{ar ? 'نشاطي' : 'My business'}</h2><span className="owner-label">{ar ? 'بيانات حقيقية' : 'Real workspace'}</span></div><SetupStatus lang={lang} /><Link className="owner-primary" to={`${prefix}/layla/dashboard`}>{ar ? 'فتح نشاطي' : 'Open my business'} <span aria-hidden="true">{ar ? '←' : '→'}</span></Link><div className="owner-setup-links"><Link to={`${prefix}/catalyst/setup`}>{ar ? 'إعداد Catalyst وليلى' : 'Set up Catalyst & Layla'}</Link></div></section>
      <section><h2>{ar ? 'صلاحيات المنتجات' : 'Product access'}</h2><p>{ar ? 'منح وإلغاء صلاحيات Catalyst وAscend.' : 'Grant and revoke Catalyst and Ascend access.'}</p><Link className="owner-secondary" to={`${prefix}/owner/access`}>{ar ? 'إدارة الوصول' : 'Manage product access'}</Link></section>
    </div>
    <section className="owner-previews"><div className="owner-section-heading"><h2>{ar ? 'معاينات القطاعات الستة' : 'Six live sector previews'}</h2><span className="owner-label">{ar ? 'بيانات تجريبية · للقراءة فقط' : 'Sample data · Read only'}</span></div><p>{ar ? 'افتح مساحة تجريبية مستقلة لمراجعة سير العمل في كل قطاع.' : 'Open a separate sample workspace to review each sector’s workflows.'}</p><div className="owner-cards">{livePackSummaries().map((pack, i) => <Link key={pack.id} to={`${prefix}/owner/preview/${pack.id}`}><span className="owner-sector-number" aria-hidden="true">0{i + 1}</span><span><strong>{ar ? pack.ar : pack.en}</strong><span>{WORK[pack.id]?.[ar ? 1 : 0]}</span></span><span className="owner-sector-arrow" aria-hidden="true">{ar ? '←' : '→'}</span></Link>)}</div></section>
  </main></OwnerGate>;
}

export function OwnerPreview({ lang = 'ar' }) {
  const { packId } = useParams();
  return <OwnerGate lang={lang}>{isLivePack(packId) ? <LaylaDashboard key={packId} lang={lang} previewPack={packId} /> : <main className="owner-home"><h1>{lang === 'ar' ? 'المعاينة غير متاحة' : 'Preview unavailable'}</h1></main>}</OwnerGate>;
}
