import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { callApi } from '../lib/api-client.js';
import { livePackSummaries, hasibPack } from '../../config/hasib-packs.js';
import { createStrings } from '../lib/dashboard/strings';
import { createHasibStrings } from '../lib/hasib/strings';
import { loadHasib } from '../lib/dashboard/api';
import '../styles/layla-dashboard.css';
import '../styles/hasib.css';
import '../styles/product.css';
import '../styles/product-setup.css';
const Catalyst = lazy(() => import('./LaylaOnboarding'));
const Team = lazy(() => import('../components/hasib/TeamView').then(m => ({ default: m.TeamView })));
const Stock = lazy(() => import('../components/hasib/StockImporter').then(m => ({ default: m.StockImporter })));
const Information = lazy(() => import('../components/business/AddInformation').then(m => ({ default: m.AddInformation })));
const labels = {
  catalyst: [['Your business', 'نشاطك التجاري'], ['Connect a channel', 'اربط قناة'], ['Layla is live', 'ليلى تعمل']],
  ascend: [['Live sector', 'القطاع المتاح'], ['Initial business data', 'بيانات النشاط الأولية'], ['Operational settings', 'إعدادات التشغيل'], ['Team and readiness', 'الفريق والجاهزية']],
};
export default function ProductSetup({ product = 'catalyst', lang = 'ar' }) {
  const ar = lang === 'ar', prefix = ar ? '' : '/en', tr = (en, arabic) => ar ? arabic : en;
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const [packId, setPackId] = useState(''), [stockOpen, setStockOpen] = useState(false), [teamReady, setTeamReady] = useState(false);
  const [vat, setVat] = useState({ registered: false, rate: '5', pricesIncludeVat: true, vatin: '' }), [stockPolicy, setStockPolicy] = useState('warn');
  // Catalyst's list follows the embedded setup as it moves, not only after a save lands.
  const [catalystStage, setCatalystStage] = useState(null);
  const latest = useRef(null), saving = useRef(false), heading = useRef(null), pendingStage = useRef(null);
  const rawStep = Number(params.get('step')), step = params.has('step') && Number.isInteger(rawStep) && rawStep >= 0 && rawStep <= 3 ? rawStep : data?.progress.step || 0;
  const apply = value => { latest.current = value; setData(value); };
  const load = useCallback(async () => {
    setError('');
    try {
      const value = await callApi(`/api/product-setup?product=${product}`);
      apply(value); setPackId(value.settings?.packId || '');
      if (value.settings) { setVat({ registered: value.settings.vatRegistered, rate: String(value.settings.vatRateBps / 100), pricesIncludeVat: value.settings.pricesIncludeVat, vatin: value.settings.vatin || '' }); setStockPolicy(value.settings.stockPolicy); }
      return value;
    } catch (e) { setError(e.reason || 'setup_unavailable'); return null; }
  }, [product]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { heading.current?.focus(); }, [step]);
  async function save(nextStep, patch = {}, navigate = true) {
    if (saving.current || !latest.current) return;
    saving.current = true; setBusy(true); setError(''); setSaved(false);
    try {
      const current = latest.current;
      const value = await callApi('/api/product-setup', { csrf: current.csrfToken, body: { product, step: nextStep, version: current.progress.version, requestId: crypto.randomUUID(), ...(patch.completed !== undefined ? { completed: patch.completed } : {}), ...patch } });
      apply(value); setSaved(true);
      if (navigate) { const next = new URLSearchParams(params); next.set('step', String(nextStep)); setParams(next); }
    } catch (e) { setError(e.reason || 'setup_unavailable'); }
    finally {
      saving.current = false; setBusy(false);
      // A Catalyst stage change that arrived mid-save is sent once this one lands.
      const queued = pendingStage.current; pendingStage.current = null;
      if (queued !== null) save(queued, {}, false);
    }
  }
  const catalystProgress = useCallback(next => {
    setCatalystStage(next);
    if (latest.current && next !== latest.current.progress.step) {
      if (saving.current) pendingStage.current = next;
      else save(next, {}, false);
    }
  }, [product]);
  useEffect(() => {
    if (product === 'ascend' && data && step === 3) { let active = true; loadHasib().then(() => { if (active) setTeamReady(true); }).catch(() => { if (active) setTeamReady(false); }); return () => { active = false; }; }
  }, [product, !!data, step]);
  // Signed-out Catalyst visitors get the embedded onboarding and its sign-in panel.
  const catalystAuth = product === 'catalyst' && error === 'sign_in_required';
  const denied = ['access_required', 'manager_required'].includes(error) || (product !== 'catalyst' && error === 'sign_in_required');
  const dashboard = `${prefix}/layla/dashboard`;
  const pack = packId ? hasibPack(packId) : null, s = createStrings(lang), h = createHasibStrings(lang, packId);
  return <main className="product-setup ld-app" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <header className="setup-header"><a href={dashboard}>BznsFlow</a><nav aria-label={tr('Setup navigation', 'تنقل الإعداد')}><a href={`${ar ? '/en' : ''}/${product}/setup`}>{ar ? 'English' : 'العربية'}</a><a href={dashboard}>{tr('Workspace', 'مساحة العمل')}</a></nav></header>
    <div className="setup-layout"><aside><p className="setup-eyebrow">{product === 'ascend' ? 'Ascend' : 'Catalyst'}</p><h1 ref={heading} tabIndex={-1}>{tr('Set up your workspace', 'إعداد مساحة عملك')}</h1><p>{product === 'ascend' ? tr('Prepare your daily operations. You can configure Layla separately whenever you are ready.', 'جهّز عملياتك اليومية. يمكنك إعداد ليلى بشكل مستقل عندما تكون مستعداً.') : tr('Tell Layla about your business and connect a channel. She starts replying straight away.', 'عرّف ليلى على نشاطك واربط قناة، وتبدأ الرد فوراً.')}</p>
      <ol className="setup-steps">{labels[product].map((label, i) => <li key={i} aria-current={(product === 'catalyst' && catalystStage !== null ? catalystStage : step) === i ? 'step' : undefined}><span>{i + 1}</span>{label[ar ? 1 : 0]}</li>)}</ol>
      <a href={`${prefix}/${product === 'ascend' ? 'catalyst' : 'ascend'}/setup`}>{product === 'ascend' ? tr('Configure Layla separately', 'إعداد ليلى بشكل مستقل') : tr('Open Ascend setup', 'فتح إعداد Ascend')}</a>
    </aside><section className="setup-content" aria-busy={busy}>
      {error && !catalystAuth && <div role="alert" className="setup-error"><p>{denied ? tr('Sign in with a granted manager account to configure this product.', 'سجّل الدخول بحساب مدير لديه صلاحية لإعداد هذا المنتج.') : error === 'preview_required' ? tr('Save and review your business facts, then preview an answer before marking setup reviewed.', 'احفظ معلومات نشاطك وراجعها ثم عاين إجابة قبل تأكيد مراجعة الإعداد.') : error === 'setup_conflict' ? tr('This setup changed in another tab. Reload the saved version before continuing.', 'تغيّر هذا الإعداد في نافذة أخرى. حمّل النسخة المحفوظة قبل المتابعة.') : tr('Your changes could not be saved. Your previous settings are safe. Try again.', 'تعذّر حفظ التغييرات. إعداداتك السابقة محفوظة. حاول مجدداً.')}</p>{denied ? <a href={`${prefix}/signin?next=${encodeURIComponent(`${prefix}/${product}/setup`)}`}>{tr('Sign in', 'تسجيل الدخول')}</a> : <button onClick={load}>{tr('Reload saved setup', 'تحميل الإعداد المحفوظ')}</button>}</div>}
      {!data && !error && !catalystAuth && <p role="status">{tr('Loading saved setup…', 'جارٍ تحميل الإعداد المحفوظ…')}</p>}
      {catalystAuth && <p className="setup-signin" role="status">{tr('Already have a BznsFlow account? Sign in to continue your saved setup.', 'لديك حساب في BznsFlow؟ سجّل الدخول لمتابعة إعدادك المحفوظ.')} <a href={`${prefix}/signin?next=${encodeURIComponent(params.get('next') === 'dashboard' ? dashboard : `${prefix}/catalyst/setup`)}`}>{tr('Sign in', 'تسجيل الدخول')}</a></p>}
      {catalystAuth && <Suspense fallback={<p role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>}>
        <Catalyst lang={lang} embedded onStageChange={setCatalystStage} onAccountChange={async () => {
          const value = await load();
          if (value?.workspaceReady && params.get('next') === 'dashboard') window.location.replace(dashboard);
        }} />
      </Suspense>}
      {data && !denied && !catalystAuth && <><p className="setup-save" role="status">{busy ? tr('Saving…', 'جارٍ الحفظ…') : saved ? tr('Saved to your account', 'محفوظ في حسابك') : data.progress.completed ? tr('Setup reviewed', 'تمت مراجعة الإعداد') : tr('Resume your saved work', 'تابع عملك المحفوظ')}</p>
        <Suspense fallback={<p role="status">{tr('Loading…', 'جارٍ التحميل…')}</p>}>
          {product === 'catalyst' ? <Catalyst lang={lang} embedded onStageChange={catalystProgress} /> : <>
            <h2>{labels.ascend[step][ar ? 1 : 0]}</h2>
            {step === 0 && <form onSubmit={e => { e.preventDefault(); save(1, { packId }); }}><p>{tr('Choose the sector for your real business. Sample previews do not change this choice.', 'اختر قطاع نشاطك الحقيقي. معاينات النماذج لا تغيّر هذا الاختيار.')}</p><label>{tr('Sector', 'القطاع')}<select required value={packId} onChange={e => setPackId(e.target.value)}><option value="">{tr('Choose a live sector', 'اختر قطاعاً متاحاً')}</option>{livePackSummaries().map(p => <option key={p.id} value={p.id}>{ar ? p.ar : p.en}</option>)}</select></label><button disabled={busy || !packId}>{tr('Save and continue', 'احفظ وتابع')}</button></form>}
            {step === 1 && <><p>{tr('Review each import before it creates operational records. Business knowledge is stored separately.', 'راجع كل استيراد قبل إنشاء سجلات تشغيلية. تُحفظ معلومات النشاط بشكل مستقل.')}</p><Information lang={lang} operationalHref={`${dashboard}?tab=stock&view=products`} />{['retail','retail-tech','dental','automotive'].includes(packId) && <button onClick={async () => { await loadHasib(); setStockOpen(true); }}>{tr('Import stock with column review', 'استيراد المخزون مع مراجعة الأعمدة')}</button>}<a href={`${dashboard}?tab=${packId === 'real-estate' ? 'stock' : 'orders'}`}>{tr('Open existing operational forms', 'فتح استمارات التشغيل الحالية')}</a><button disabled={busy} onClick={() => save(2)}>{tr('Continue to settings', 'متابعة إلى الإعدادات')}</button></>}
            {step === 2 && <form onSubmit={e => { e.preventDefault(); save(3, { stockPolicy, vat: { registered: vat.registered, rateBps: Math.round(Number(vat.rate) * 100), pricesIncludeVat: vat.pricesIncludeVat, vatin: vat.vatin } }); }}><p>{tr('Existing values are loaded from your account. Amounts use your existing currency and accounting rules.', 'تُحمّل القيم الحالية من حسابك. تستخدم المبالغ عملتك الحالية وقواعدك المحاسبية.')}</p><label><input type="checkbox" checked={vat.registered} onChange={e => setVat(v => ({ ...v, registered: e.target.checked }))} />{tr('VAT registered', 'مسجّل في ضريبة القيمة المضافة')}</label><label>{tr('VAT rate (%)', 'نسبة ضريبة القيمة المضافة (%)')}<input type="number" min="0" max="100" step="0.01" required value={vat.rate} onChange={e => setVat(v => ({ ...v, rate: e.target.value }))} /></label><label><input type="checkbox" checked={vat.pricesIncludeVat} onChange={e => setVat(v => ({ ...v, pricesIncludeVat: e.target.checked }))} />{tr('Prices include VAT', 'الأسعار تشمل الضريبة')}</label><label>{tr('Tax registration number', 'الرقم الضريبي')}<input maxLength={20} value={vat.vatin} onChange={e => setVat(v => ({ ...v, vatin: e.target.value }))} /></label>{['retail','retail-tech','dental','automotive'].includes(packId) && <label>{tr('When stock is insufficient', 'عندما لا يكفي المخزون')}<select value={stockPolicy} onChange={e => setStockPolicy(e.target.value)}><option value="warn">{tr('Warn the operator', 'تحذير الموظف')}</option><option value="block">{tr('Block the stock operation', 'منع عملية المخزون')}</option></select></label>}<a href={`${dashboard}?tab=settings`}>{tr('Review sector workflow and service settings', 'مراجعة إعدادات سير العمل والخدمات للقطاع')}</a><button disabled={busy}>{tr('Save and continue', 'احفظ وتابع')}</button></form>}
            {step === 3 && <><p>{tr('Review your sector, imported records and team roles before starting daily work. Messaging connections are optional for operations.', 'راجع قطاعك والسجلات المستوردة وأدوار الفريق قبل بدء العمل اليومي. ربط المراسلة اختياري للعمليات.')}</p>{teamReady ? <Team s={s} h={h} /> : <a href={`${dashboard}?tab=team`}>{tr('Review existing team roles', 'مراجعة أدوار الفريق الحالية')}</a>}<button disabled={busy || !packId} onClick={() => save(3, { completed: true })}>{tr('Mark operational setup reviewed', 'تأكيد مراجعة إعداد العمليات')}</button><a href={dashboard}>{tr('Open workspace', 'فتح مساحة العمل')}</a></>}
            {step > 0 && <button className="setup-back" disabled={busy} onClick={() => { const next = new URLSearchParams(params); next.set('step', String(step - 1)); setParams(next); }}>{tr('Back', 'رجوع')}</button>}
            {stockOpen && pack && <Stock s={s} h={h} pack={pack} onClose={() => setStockOpen(false)} onImported={() => { setSaved(true); }} />}
          </>}
        </Suspense>
      </>}
    </section></div>
  </main>;
}
