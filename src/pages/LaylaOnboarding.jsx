import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon.jsx';
import { InstagramConnection } from '../components/dashboard/InstagramConnection';
// InstagramConnection and ChannelSwitch render dashboard (ld-*) controls.
import '../styles/layla-dashboard.css';
import { ChannelSwitch } from '../components/dashboard/ChannelSwitch';
import { createStrings } from '../lib/dashboard/strings';
import { dashboardPath } from '../lib/dashboard/api';
import logoImg from '../assets/logo_bznsflow.png';
import '../styles/layla-onboarding.css';
import { createSignupAttempt, signupOptions } from '../lib/layla-signup.js';
import { prepareFacebook } from '../lib/meta-sdk.js';
import { callApi } from '../lib/api-client.js';
import { BrainSetup } from '../components/brain/BrainSetup.jsx';
import { SaveAccountPanel } from '../components/onboarding/SaveAccountPanel.jsx';
import { WhatsAppConnect } from '../components/onboarding/WhatsAppConnect.jsx';
import { explain as explainReason, instagramReturnMessage } from '../lib/onboarding/explanations.js';
import { revealStep } from '../lib/reveal-step.js';

// Three steps, one primary action each: your business, connect a channel, live.
// Ids are the saved journeyStep values; older saved steps (2, 3, 4) open the channels step.
const WHATSAPP_LIVE = ['connected', 'paused'];
// About three minutes: coexistence registration on Meta's side can take longer than one.
const REFRESH_INTERVAL_MS = 5000, REFRESH_ROUNDS = 36;

export default function LaylaOnboarding({ lang = 'ar', reviewMode = false, embedded = false, onStageChange, onAccountChange }) {
  const ar = lang === 'ar';
  const tr = (en, arabic) => ar ? arabic : en;
  const s = createStrings(lang);
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const heading = useRef(null);
  const [data, setData] = useState(null), [csrf, setCsrf] = useState(''), [step, setStep] = useState(0);
  const [path, setPath] = useState('coexistence');
  const [prepared, setPrepared] = useState(null), [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  // Meta returned its code: the connection is being finished, so the owner is told, not left on "Complete the Meta window".
  const [finishing, setFinishing] = useState(false), finishingRef = useRef(false);
  const [saveOpen, setSaveOpen] = useState(false);
  // WhatsApp work starts only when the customer asks for it, so an Instagram-only
  // setup never opens a Meta attempt or spends the attempt budget.
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  // Read after mount: the page is prerendered without a query string, so
  // rendering this banner on the first pass would not match the HTML.
  const [instagramReturn, setInstagramReturn] = useState(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search), status = query.get('instagram');
    const text = instagramReturnMessage(status, query.get('reason'), lang);
    setInstagramReturn(text ? { ok: status === 'connected', text } : null);
  }, [lang]);
  // Layla is live once any connected channel replies; each channel's switch reports in.
  const [liveBy, setLiveBy] = useState({});
  const live = Object.values(liveBy).some(Boolean);
  const reportLive = useCallback(id => on => setLiveBy(v => (v[id] === on ? v : { ...v, [id]: on })), []);
  // A WhatsApp number that finishes connecting while this page is open switches Layla on by itself.
  const whatsappLive = WHATSAPP_LIVE.includes(data?.integration?.status);
  const whatsappSeen = useRef(null), [whatsappJustConnected, setWhatsappJustConnected] = useState(false);
  useEffect(() => {
    if (!data) return;
    if (whatsappSeen.current === false && whatsappLive) setWhatsappJustConnected(true);
    whatsappSeen.current = whatsappLive;
  }, [data, whatsappLive]);
  // Reported only once the saved setup has loaded, so the first render never overwrites stored progress.
  useEffect(() => { if (data) onStageChange?.(step === 0 ? 0 : live ? 2 : 1); }, [!!data, step, live]); // eslint-disable-line react-hooks/exhaustive-deps
  const authCsrf = useRef('');
  async function authRequest(action, body) {
    if (!authCsrf.current) {
      const r = await fetch('/api/auth-session', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.json());
      if (!r.ok) throw Error(r.reason); authCsrf.current = r.csrfToken;
    }
    const r = await fetch(action === 'code' ? '/api/auth-code' : '/api/auth-session', {method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','x-csrf-token':authCsrf.current},body:JSON.stringify(body)}).then(r=>r.json());
    if (!r.ok) throw Error(r.reason); return r;
  }
  async function signOut() {
    await act(async()=>{
      const session=await fetch('/api/auth-session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.json());
      if(!session.ok)throw Error(session.reason);
      const result=await fetch('/api/auth-session',{method:'DELETE',credentials:'same-origin',signal:AbortSignal.timeout(10000),headers:{'x-csrf-token':session.csrfToken}}).then(r=>r.json());
      if(!result.ok)throw Error(result.reason);
      setData(null);setPrepared(null);
      window.location.replace(`${ar? '':'/en'}/catalyst/setup`);
    });
  }
  const pending = useRef(null), actionBusy = useRef(false);
  // Errors appear next to the step's action, not at the top of the page, and take focus so they are seen and read.
  const errorRef = useRef(null);
  useEffect(() => { if (error) { errorRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); errorRef.current?.focus({ preventScroll: true }); } }, [error]);
  const explain = reason => explainReason(reason, lang);
  async function request(body) {
    const surface = reviewMode ? 'customer-review' : 'customer';
    // 60s: signup and website import both wait on Meta or a third-party site.
    return callApi(`/api/layla-meta?surface=${surface}`, { body, csrf, timeout: 60000 });
  }
  async function act(task) { if (actionBusy.current) return; actionBusy.current = true; setBusy(true); setError(''); try { await task(); } catch (e) { setError(explain(e.message)); } finally { actionBusy.current = false; setBusy(false); } }
  // Most actions save one step and redraw the page from the server's answer.
  const run = body => act(async () => applyState(await request(body)));
  // Set once the page is on its way to the dashboard, so no later answer starts the same navigation again.
  const leaving = useRef(false);
  function applyState(r) {
    if (leaving.current) return;
    // Returning from the dashboard sign-in: a saved, connected account goes straight back.
    if (!reviewMode && new URLSearchParams(window.location.search).get('next') === 'dashboard') {
      if (r.account && r.savedToAccount && ['connected', 'paused'].includes(r.integration?.status)) { leaving.current = true; window.location.replace(dashboardPath(lang)); return; }
      if (!r.account) setSaveOpen(true);
    }
    setData(r); setAvailable(r.available === true); setCsrf(r.csrfToken || '');
    setPath(r.integration?.path || r.prepared?.path || 'coexistence');
    setStep(r.journeyStep === 2 || r.journeyStep === undefined || r.journeyStep === null ? (r.profile ? 1 : 0) : r.journeyStep === 0 ? 0 : 1);
    if (r.prepared) {
      setWhatsappOpen(true);
      prepareFacebook(r.prepared).then(() => setPrepared(r.prepared)).catch(() => setError(explain('meta_sdk_unavailable')));
    }
  }
  useEffect(() => {
    let active = true;
    if(reviewMode && window.location.hash.startsWith('#access=')) {
      let access=window.location.hash.slice(8);
      window.history.replaceState(null,'',window.location.pathname);
      authRequest('session',{reviewAccess:access}).then(()=>window.location.replace(`${ar?'':'/en'}/catalyst/setup`)).catch(()=>{if(active){setError(explain('review_access_invalid'));setChecking(false);}}).finally(()=>{access=undefined;});
      return()=>{active=false;};
    }
    request().then(r => { if (active) applyState(r); }).catch(() => {
      if (active) setError(explain('restore_failed'));
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; pending.current?.dispose(); pending.current = null; };
  }, []);
  // The standalone page starts on its heading; the setup page focuses its own. After that, every move
  // to another step scrolls the new step into view, so a click never seems to do nothing.
  useEffect(() => { if (!embedded) heading.current?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const shownStep = useRef(null);
  useEffect(() => {
    if (!data) return;
    if (shownStep.current !== null && shownStep.current !== step) revealStep(heading.current);
    shownStep.current = step;
  }, [data, step]);
  // A channel going live puts "Open inbox" in front of the owner, wherever they had scrolled to.
  const liveRef = useRef(null), wasLive = useRef(false);
  useEffect(() => {
    if (live && !wasLive.current) revealStep(liveRef.current);
    wasLive.current = live;
  }, [live]);

  // Meta's window --------------------------------------------------------------
  async function prepare(forPath = path) {
    if (preparing) return;
    setPreparing(true); setError('');
    try {
      const r = await request({ action: 'begin', path: forPath });
      await prepareFacebook(r);
      setPrepared(r);
    } catch (e) { setError(explain(e.message)); }
    finally { setPreparing(false); }
  }
  // Releases an unused prepared attempt so another can begin (the server allows one at a time).
  async function discardPrepared() {
    const current = prepared;
    if (!current || pending.current) return;
    setPreparing(true);
    try { await request({ action: 'cancel', attempt: current.attempt, state: current.state }); }
    catch (e) { if (e.message !== 'attempt_expired') setError(explain('cancel_failed')); }
    finally { setPrepared(null); setPreparing(false); }
  }
  function changePath(next) {
    if (next === path) return;
    setPath(next);
    if (prepared && prepared.path !== next) discardPrepared();
  }
  // Signed in with a setup still only in this browser: attach it to the account once, automatically,
  // so connecting a channel is never blocked behind a button the owner has to find.
  const claimTried = useRef(false);
  useEffect(() => {
    if (reviewMode || claimTried.current || busy || checking || !data?.account || data.savedToAccount || !data.profile || !data.accountSaveAvailable) return;
    claimTried.current = true;
    run({ action: 'claim_draft' });
  }, [data?.account, data?.savedToAccount, data?.profile, busy, checking]);
  useEffect(() => {
    if (!prepared) return;
    const receive = event => pending.current?.message(event);
    window.addEventListener('message', receive);
    const timer = setTimeout(() => {
      if (pending.current && !finishingRef.current) pending.current.cancel('attempt_expired');
      else setPrepared(null);
    }, Math.max(0, prepared.expiresAt - Date.now()));
    return () => { window.removeEventListener('message', receive); clearTimeout(timer); };
  }, [prepared]);
  useEffect(() => {
    if (step !== 1 || !data?.integration || !['reconciliation_required','verifying'].includes(data.status)) return;
    let rounds = 0;
    const timer = setInterval(() => {
      if (++rounds > REFRESH_ROUNDS) { clearInterval(timer); return; }
      if (document.visibilityState === 'visible' && !actionBusy.current && !pending.current) run({action:'refresh'});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [step, data?.integration?.id, data?.status, csrf]);
  function connect() {
    if (!prepared || Date.now() >= prepared.expiresAt) { setPrepared(null); return; }
    setBusy(true); setError('');
    const attempt = createSignupAttempt({
      prepared,
      onCode: () => { finishingRef.current = true; setFinishing(true); },
      // Not through act(): its busy guard could drop Meta's one-time code without a word.
      complete: async body => {
        pending.current = null;
        actionBusy.current = true; setBusy(true); setError('');
        try { applyState(await request(body)); }
        catch (e) { setError(explain(e.message)); }
        finally { actionBusy.current = false; setBusy(false); finishingRef.current = false; setFinishing(false); setPrepared(null); }
      },
      failed: (reason, reference) => {
        pending.current = null; setPrepared(null); setBusy(false); finishingRef.current = false; setFinishing(false);
        setError(reference ? `${explain(reason)} ${tr('Meta reference:', 'مرجع Meta:')} ${reference}` : explain(reason));
        // Release the durable unclaimed attempt. A failed cancellation remains
        // visible and expires server-side; it never triggers a second exchange.
        request({action:'cancel',attempt:prepared.attempt,state:prepared.state}).catch(error => setError(explain(error.message === 'attempt_expired' ? 'attempt_expired' : 'cancel_failed')));
      },
    });
    pending.current = attempt;
    const originalOpen = window.open;
    let captured = false;
    window.open = function (...args) {
      const popup = originalOpen.apply(window,args);
      captured = true; attempt.capture(popup);
      return popup;
    };
    // Must stay synchronous inside this click, or the browser blocks Meta's popup.
    try { window.FB.login(attempt.callback, signupOptions(prepared)); }
    catch { attempt.cancel('popup_blocked'); }
    finally { window.open = originalOpen; if (!captured) attempt.cancel('popup_blocked'); }
  }
  async function leaveChannels(journeyStep) {
    await discardPrepared();
    return run({ action: 'save_progress', journeyStep });
  }

  const steps = { 0: tr('Your business', 'نشاطك التجاري'), 1: tr('Connect a channel', 'اربط قناة') };
  const walk = [steps[0], steps[1], tr('Layla is live', 'ليلى تعمل')];
  const currentPosition = step === 0 ? 0 : live ? 2 : 1;
  const needsAccount = !reviewMode && !data?.savedToAccount;
  const errorNote = error ? <p ref={errorRef} tabIndex={-1} className="layla-error" role="alert">{error}</p> : null;
  const saveProps = { lang, tr, data, busy, act, authRequest,
    // One redraw, after the browser draft is attached to the account, so the page never flashes an in-between state.
    onSignedIn: async () => {
      let r = await request();
      if (r.account && !r.savedToAccount && r.profile && r.accountSaveAvailable) r = await request({ action: 'claim_draft' });
      claimTried.current = true;
      applyState(r); setSaveOpen(false);
      if (leaving.current) return;
      if (step === 1) revealStep(heading.current);
      onAccountChange?.();
    },
    onClaim: () => run({ action: 'claim_draft' }) };
  const Container = embedded ? 'section' : 'main';
  return <Container className={`layla-customer ${embedded ? 'setup-embedded' : ''}`} dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <header className="layla-customer-nav"><a href={ar ? '/' : '/en'} aria-label="BznsFlow"><img src={logoImg} alt="" width="40" height="40" />BznsFlow</a><nav aria-label={tr('Page navigation','التنقل في الصفحة')}><a className="layla-back-home" href={ar ? '/' : '/en'}>{tr('Back to main website','العودة إلى الموقع الرئيسي')}</a><a href={`${ar ? '/en' : ''}/${reviewMode ? 'layla/review' : 'catalyst/setup'}`} lang={ar ? 'en' : 'ar'}>{ar ? 'English' : 'العربية'}</a></nav></header>
    <div className="layla-customer-layout">
      <aside className="layla-intro">
        <h1>{tr('Meet your new front desk.', 'تعرّف على موظفة استقبالك الجديدة.')}</h1>
        <p>{tr('Give Layla your business information in BznsBrain, connect Instagram, WhatsApp or both, and she is live.', 'أعطِ ليلى معلومات نشاطك في BznsBrain، واربط إنستغرام أو واتساب أو كليهما، وتبدأ ليلى العمل.')}</p>
        <img src="/images/layla-onboarding-transparent.png" width="768" height="1376" alt={tr('Layla, wearing a teal jacket and a headset', 'ليلى ترتدي سترة بلون أزرق مخضر وسماعة رأس')} fetchpriority="high" />
        <p className="layla-intro-note">{tr('Your business. Your channels. You stay in control.', 'نشاطك. قنواتك. والقرار دائماً لك.')}</p>
      </aside>
      <div className="layla-workspace">
        <ol className="layla-customer-steps" aria-label={tr('Setup progress','مراحل الإعداد')}>{walk.map((name, position) => {
          const state = position < currentPosition || (live && position === 2) ? 'done' : position === currentPosition ? 'current' : 'upcoming';
          return <li key={name} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="layla-step-mark" aria-hidden="true">{state === 'done' ? '✓' : position + 1}</span>
            <span className="layla-step-name">{name}</span>
            {state === 'done' && <span className="ld-visually-hidden">{tr(' — done',' — مكتملة')}</span>}
          </li>;
        })}</ol>
        <p className="layla-step-count" aria-hidden="true">{tr(`Step ${currentPosition + 1} of ${walk.length}`, `الخطوة ${(currentPosition + 1).toLocaleString('ar-EG')} من ${walk.length.toLocaleString('ar-EG')}`)} · {walk[currentPosition]}</p>
        <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
        {instagramReturn && <p className={instagramReturn.ok ? 'layla-saved' : 'layla-notice layla-notice--problem'} role={instagramReturn.ok ? 'status' : 'alert'}>{instagramReturn.text}</p>}
        {data?.account && <p>{tr('Signed in as','تم الدخول باسم')} {data.account.email} <button className="layla-secondary" disabled={busy} onClick={signOut}>{tr('Sign out / Use another account','تسجيل الخروج / استخدام حساب آخر')}</button></p>}
        {data?.profile && <p className={data.savedToAccount ? 'layla-saved' : 'layla-saved layla-saved--preview'}>{data.savedToAccount ? tr('Saved to your account', 'محفوظ في حسابك') : tr('Preview saved in this browser for 24 hours.', 'المعاينة محفوظة في هذا المتصفح لمدة ٢٤ ساعة.')}</p>}
        {saveOpen && step !== 1 && needsAccount && <SaveAccountPanel {...saveProps} />}
        {step !== 0 && step !== 1 && errorNote}
        {/* BznsBrain: industry → information → review → behaviour → test and publish, on the same records Settings edits. */}
        {step === 0 && <>
          <BrainSetup lang={lang} onPublished={async () => applyState(await request())} />
          {errorNote}
        </>}
        {step === 1 && <section className="layla-channel-stage">
          {live && <section ref={liveRef} className="layla-live" role="status" aria-labelledby="layla-live-heading">
            <h3 id="layla-live-heading">{s.t('liveTitle')}</h3>
            <p>{s.t('liveBody')}</p>
            <a className="layla-primary" href={dashboardPath(lang)}>{s.t('openInbox')}<Icon name="arrow-right" size={16} className="icon-flip-rtl" /></a>
          </section>}
          {!live && <p>{tr('Connect Instagram, WhatsApp or both. Layla starts replying as soon as a channel is connected, and you can turn her off at any time.', 'اربط إنستغرام أو واتساب أو كليهما. تبدأ ليلى الرد فور ربط القناة، ويمكنك إيقافها في أي وقت.')}</p>}
          {needsAccount && !data?.account && <SaveAccountPanel {...saveProps} />}
          {needsAccount && !data?.account && errorNote}
          {!needsAccount && !reviewMode && <InstagramConnection lang={lang} inSetup autoOn={!!instagramReturn?.ok} onActive={reportLive('instagram')} />}
          <WhatsAppConnect tr={tr} explain={explain} open={whatsappOpen} onOpen={() => setWhatsappOpen(true)} data={data} busy={busy} available={available} reviewMode={reviewMode}
            prepared={prepared} preparing={preparing} finishing={finishing} path={path} onPathChange={changePath}
            onPrepare={() => prepare()} onConnect={connect} onCancelAttempt={reason => pending.current?.cancel(reason)}
            run={run} act={act} request={request} applyState={applyState}
            liveSwitch={!reviewMode && data?.savedToAccount ? <ChannelSwitch s={s} channel="whatsapp" autoOn={whatsappJustConnected} onActive={reportLive('whatsapp')} /> : null}
            errorNote={needsAccount && !data?.account ? null : errorNote} onClaim={() => run({ action: 'claim_draft' })} />
          <p className="layla-help">{s.t('handoffNote')}</p>
          <button className="layla-secondary" disabled={busy} onClick={() => leaveChannels(0)}>{tr('Back to business details','العودة إلى معلومات النشاط')}</button>
        </section>}
        <footer className="layla-customer-footer"><a href={ar ? '/privacy' : '/en/privacy'}>{tr('Privacy','الخصوصية')}</a><a href="mailto:ahmed@bznsflowai.com">{tr('Need a hand?','تحتاج مساعدة؟')}</a></footer>
      </div>
    </div>
  </Container>;
}
