import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { callApi } from '../lib/api-client.js';
import '../styles/layla-dashboard.css';
import '../styles/product.css';
import '../styles/product-setup.css';
const Catalyst = lazy(() => import('./LaylaOnboarding'));
// Catalyst's setup page. Ascend has none: its sector, imports, VAT and team are set inside its dashboard.
const STEPS = [['Your business', 'نشاطك التجاري'], ['Connect a channel', 'اربط قناة'], ['Layla is live', 'ليلى تعمل']];
export default function ProductSetup({ lang = 'ar' }) {
  const product = 'catalyst';
  const ar = lang === 'ar', prefix = ar ? '' : '/en', tr = (en, arabic) => ar ? arabic : en;
  const [params] = useSearchParams();
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  // The list follows the embedded setup as it moves, not only after a save lands.
  const [catalystStage, setCatalystStage] = useState(null);
  const latest = useRef(null), saving = useRef(false), heading = useRef(null), pendingStage = useRef(null);
  const step = catalystStage !== null ? catalystStage : data?.progress.step || 0;
  const apply = value => { latest.current = value; setData(value); };
  const load = useCallback(async () => {
    setError('');
    try { const value = await callApi(`/api/product-setup?product=${product}`); apply(value); return value; }
    catch (e) { setError(e.reason || 'setup_unavailable'); return null; }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { heading.current?.focus(); }, []);
  async function save(nextStep) {
    if (saving.current || !latest.current) return;
    saving.current = true; setBusy(true); setError(''); setSaved(false);
    try {
      const current = latest.current;
      apply(await callApi('/api/product-setup', { csrf: current.csrfToken, body: { product, step: nextStep, version: current.progress.version, requestId: crypto.randomUUID() } }));
      setSaved(true);
    } catch (e) { setError(e.reason || 'setup_unavailable'); }
    finally {
      saving.current = false; setBusy(false);
      // A stage change that arrived mid-save is sent once this one lands.
      const queued = pendingStage.current; pendingStage.current = null;
      if (queued !== null) save(queued);
    }
  }
  const catalystProgress = useCallback(next => {
    setCatalystStage(next);
    if (latest.current && next !== latest.current.progress.step) {
      if (saving.current) pendingStage.current = next;
      else save(next);
    }
  }, []);
  // Signed-out visitors get the embedded onboarding and its sign-in panel.
  const signedOut = error === 'sign_in_required';
  const denied = ['access_required', 'manager_required'].includes(error);
  const dashboard = `${prefix}/layla/dashboard`;
  return <main className="product-setup ld-app" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <header className="setup-header"><a className="setup-brand" href={prefix || '/'}><img src="/logo.png" alt="" width="32" height="32" />BznsFlow</a><nav aria-label={tr('Setup navigation', 'تنقل الإعداد')}><a href={dashboard}>{tr('Workspace', 'مساحة العمل')}</a><a href={`${ar ? '/en' : ''}/${product}/setup`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</a></nav></header>
    <div className="setup-layout"><aside><p className="setup-eyebrow">Catalyst</p><h1 ref={heading} tabIndex={-1}>{tr('Set up your workspace', 'إعداد مساحة عملك')}</h1><p>{tr('Tell Layla about your business and connect a channel. She starts once you approve and publish.', 'عرّف ليلى على نشاطك واربط قناة. تبدأ بعد أن تعتمد وتنشر.')}</p>
      <ol className="setup-steps">{STEPS.map((label, i) => <li key={i} aria-current={step === i ? 'step' : undefined}><span>{i + 1}</span>{label[ar ? 1 : 0]}</li>)}</ol>
    </aside><section className="setup-content" aria-busy={busy}>
      {error && !signedOut && <div role="alert" className="setup-error"><p>{denied ? tr('Sign in with a granted manager account to configure this product.', 'سجّل الدخول بحساب مدير لديه صلاحية لإعداد هذا المنتج.') : error === 'preview_required' ? tr('Save and review your business facts, then preview an answer before marking setup reviewed.', 'احفظ معلومات نشاطك وراجعها ثم عاين إجابة قبل تأكيد مراجعة الإعداد.') : error === 'setup_conflict' ? tr('This setup changed in another tab. Reload the saved version before continuing.', 'تغيّر هذا الإعداد في نافذة أخرى. حمّل النسخة المحفوظة قبل المتابعة.') : tr('Your changes could not be saved. Your previous settings are safe. Try again.', 'تعذّر حفظ التغييرات. إعداداتك السابقة محفوظة. حاول مجدداً.')}</p>{denied ? <a href={`${prefix}/signin?next=${encodeURIComponent(`${prefix}/${product}/setup`)}`}>{tr('Sign in', 'تسجيل الدخول')}</a> : <button onClick={load}>{tr('Reload saved setup', 'تحميل الإعداد المحفوظ')}</button>}</div>}
      {!data && !error && <p role="status">{tr('Loading saved setup…', 'جارٍ تحميل الإعداد المحفوظ…')}</p>}
      {signedOut && <p className="setup-signin" role="status">{tr('Already have a BznsFlow account? Sign in to continue your saved setup.', 'لديك حساب في BznsFlow؟ سجّل الدخول لمتابعة إعدادك المحفوظ.')} <a href={`${prefix}/signin?next=${encodeURIComponent(params.get('next') === 'dashboard' ? dashboard : `${prefix}/${product}/setup`)}`}>{tr('Sign in', 'تسجيل الدخول')}</a></p>}
      {signedOut && <Suspense fallback={<p role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>}>
        <Catalyst lang={lang} embedded onStageChange={setCatalystStage} onAccountChange={async () => {
          const value = await load();
          if (value?.workspaceReady && params.get('next') === 'dashboard') window.location.replace(dashboard);
        }} />
      </Suspense>}
      {data && !denied && !signedOut && <><p className="setup-save" role="status">{busy ? tr('Saving…', 'جارٍ الحفظ…') : saved ? tr('Saved to your account', 'محفوظ في حسابك') : data.progress.completed ? tr('Setup reviewed', 'تمت مراجعة الإعداد') : tr('Resume your saved work', 'تابع عملك المحفوظ')}</p>
        <Suspense fallback={<p role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>}><Catalyst lang={lang} embedded onStageChange={catalystProgress} /></Suspense>
      </>}
    </section></div>
  </main>;
}
