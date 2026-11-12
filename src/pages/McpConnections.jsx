import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/mcp.css';
import '../styles/mcp-approvals.css';
import { McpHero, ConnectionGuide, McpWalkthrough, McpHelp, BZNSFLOW_ICON } from '../components/mcp/ConnectionGuide';
import { ApprovalCard } from '../components/mcp/ApprovalCard';
import { ConfirmIdentity } from '../components/mcp/ConfirmIdentity';
import { ConnectionCard } from '../components/mcp/ConnectionCard';
import { ConsentCard } from '../components/mcp/ConsentCard';
import { ActivityList, PastConnections } from '../components/mcp/ActivityList';
import { AREAS, CATEGORIES, DONE, ERRORS, activityName, isActive } from '../components/mcp/copy';
import { keepPendingPolicy, readPendingPolicy } from '../components/mcp/pending-policy';
import { cardKeys, originOf, placeFor } from '../components/mcp/origin';
import { dashboardPath, homePath, localePath, otherLanguagePath, plansPath, signInPath } from '../lib/paths';
const COPIED_MS = 2500;
// While the owner is mid-connection (a new connection not yet verified, or an
// approval waiting), the page follows along without a manual reload.
const REFRESH_MS = 5000;
const REFRESH_GAP_MS = 1500;
const ENDPOINT = 'https://www.bznsflowai.com/api/mcp';
export default function McpConnections({ lang = 'ar' }) {
  const ar = lang === 'ar',
    tr = (en, arabic) => (ar ? arabic : en);
  const [endpoint, setEndpoint] = useState(ENDPOINT);
  const [account, setAccount] = useState(undefined),
    [data, setData] = useState(null),
    [consent, setConsent] = useState(null),
    [csrf, setCsrf] = useState(''),
    [status, setStatus] = useState(''),
    [error, setErrorState] = useState(''),
    // The card the error belongs to ("" for page-level errors such as loading).
    [errorAt, setErrorAt] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(''),
    [saved, setSaved] = useState(false),
    [done, setDone] = useState(''),
    // The action waiting for the owner to confirm it's them with an emailed code.
    [confirming, setConfirming] = useState(null),
    [target, setTarget] = useState(''),
    [savedId, setSavedId] = useState(''),
    [consentAreas, setConsentAreas] = useState(Object.keys(AREAS));
  const setError = useCallback((reason, at = '') => {
    setErrorState(reason);
    setErrorAt(at);
  }, []);
  // "Copied" is brief; saved confirmations, errors and guidance stay until the next action.
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(''), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const signIn = signInPath(lang, localePath(lang, '/mcp'));
  const message = code =>
    (ERRORS[code] || ['Could not complete this request. Please try again.', 'تعذّر إكمال الطلب. حاول مرة أخرى.'])[
      ar ? 1 : 0
    ];
  // `quiet` refreshes keep whatever message the owner is reading.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setError('');
    const response = await fetch('/api/auth-session', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) throw Error('session_unavailable');
    const session = await response.json();
    setAccount(session.account);
    setCsrf(session.csrfToken || '');
    if (!session.account) {
      setData(null);
      setConsent(null);
      return;
    }
    const r = await fetch('/api/mcp/manage', {
        credentials: 'same-origin',
        cache: 'no-store',
      }),
      value = await r.json();
    if (!r.ok) {
      // Revoked access must remove stale controls even during a background refresh.
      if (quiet && r.status !== 401 && r.status !== 403) return;
      setData(null);
      setConsent(null);
      setError(value.reason);
      return;
    }
    setData(value);
    setCsrf(value.csrfToken || session.csrfToken);
    if (new URLSearchParams(window.location.search).has('interaction') || value.resume) {
      const c = await fetch('/api/mcp/manage?interaction=true', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const view = await c.json();
      if (c.ok) setConsent(view.interaction);
      else {
        setConsent(null);
        if (!quiet) setError(view.reason);
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.location.reload();
      return;
    }
    setEndpoint(`${window.location.origin}/api/mcp`);
    setTarget(new URLSearchParams(window.location.search).get('approval') || '');
    let live = true;
    load()
      .then(() => {
        const pending = live && readPendingPolicy();
        if (pending) {
          const { at: _at, ...body } = pending;
          return action(body);
        }
        return undefined;
      })
      .catch(() => {
        if (live) {
          setAccount(null);
          setError('unavailable');
        }
      });
    return () => {
      live = false;
    };
    // `action` is recreated each render; the pending save runs once, on arrival.
  }, [load]);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const following =
    !!data &&
    !consent &&
    (data.approvals.length > 0 ||
      data.connections.some(c => !c.revokedAt && c.expiresAt > Date.now() && !c.verifiedAt));
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== 'visible' || busyRef.current || Date.now() - last < REFRESH_GAP_MS) return;
      last = Date.now();
      load({ quiet: true }).catch(() => {});
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = following ? setInterval(refresh, REFRESH_MS) : null;
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      if (timer) clearInterval(timer);
    };
  }, [load, following]);
  const post = (path, body) =>
    fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify(body),
    });
  async function action(body) {
    setBusy(true);
    setError('');
    setStatus('');
    setSaved(false);
    setSavedId('');
    const at = originOf(body);
    try {
      const r = await post('/api/mcp/manage', body),
        value = await r.json();
      if (!r.ok) {
        if (value.reason === 'fresh_sign_in_required' && account?.email) {
          // Confirm in place, then run the same action again.
          setConfirming(body);
          return;
        }
        if (body.action === 'policy' && value.reason === 'fresh_sign_in_required') keepPendingPolicy(body);
        setError(value.reason, at);
        return;
      }
      if (value.redirect) {
        const next = new URL(value.redirect, window.location.origin);
        if (next.origin !== window.location.origin || !next.pathname.startsWith('/oauth/'))
          throw Error('invalid_redirect');
        window.location.assign(next.href);
        return;
      }
      setSaved(true);
      setDone(body.action);
      if (body.action === 'policy') setSavedId(body.connectionId);
      await load();
    } catch {
      setError('unavailable', at);
    } finally {
      setBusy(false);
    }
  }
  // A refusal is shown where the owner is looking: inside the consent card, or
  // scrolled into view, never only at the top of a long page.
  const errorRef = useRef(null);
  useEffect(() => {
    if (!error || !errorRef.current) return;
    errorRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    errorRef.current.focus({ preventScroll: true });
  }, [error]);
  const errorNotice = error && (
    <div className="mcp-notice" role="alert" ref={errorRef} tabIndex={-1}>
      {message(error)}{' '}
      {error === 'fresh_sign_in_required' ? (
        <a href={`${signIn}&fresh=1`}>{tr('Verify account', 'التحقق من الحساب')}</a>
      ) : error === 'access_required' ? (
        <a href={plansPath(lang)}>{tr('See plans', 'اطّلع على الباقات')}</a>
      ) : (
        <button className="mcp-secondary" onClick={() => load().catch(() => setError('unavailable'))}>
          {tr('Try again', 'حاول مجددًا')}
        </button>
      )}
    </div>
  );
  // Shown in place of the action that needs a recent sign-in (consent or permissions).
  const identity = confirming && account?.email && (
    <ConfirmIdentity
      ar={ar}
      email={account.email}
      csrf={csrf}
      onConfirmed={() => {
        const body = confirming;
        setConfirming(null);
        void action(body);
      }}
      onCancel={() => setConfirming(null)}
    />
  );
  const cards = cardKeys({
    consent,
    approvals: data?.approvals,
    connections: data?.connections.filter(isActive),
  });
  const errorPlace = placeFor(errorAt, cards, consent ? 'consent' : '');
  const noticeAt = key => (error && errorPlace === key ? errorNotice : null);
  const confirmPlace = placeFor(originOf(confirming), cards);
  const identityAt = key => (confirmPlace === key ? identity : null);
  const doneIn = actions => (
    <p className="mcp-section-status" role="status" aria-live="polite">
      {saved && actions.includes(done) ? DONE[done][ar ? 1 : 0] : ''}
    </p>
  );
  async function copy(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setStatus(tr('Select and copy the text below.', 'حدّد النص أدناه وانسخه.'));
    }
  }
  return (
    <main className="mcp-page" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
      <nav className="mcp-nav" aria-label={tr('Account navigation', 'روابط الحساب')}>
        <Link to={homePath(lang)} className="mcp-brand">
          <img src={BZNSFLOW_ICON} width="36" height="36" alt="" />
          BznsFlow
        </Link>
        <div>
          <Link to={dashboardPath(lang)}>{tr('My workspace', 'مساحة عملي')}</Link>
          <Link to={otherLanguagePath(lang, '/mcp')}>{ar ? 'English' : 'العربية'}</Link>
        </div>
      </nav>
      <McpHero ar={ar} compact={!!consent || !!data?.approvals?.length} />
      <div role="status" aria-live="polite">
        {status}
        {copied && <span className="sr-only">{tr(`${copied} copied.`, `تم نسخ ${copied}.`)}</span>}
        {account === undefined && tr('Loading your account…', 'جارٍ تحميل حسابك…')}
      </div>
      {error && !errorPlace && errorNotice}
      {account === null && (
        <section className="mcp-panel">
          <h2>{tr('Connect with your BznsFlow account', 'اتصل بحساب BznsFlow')}</h2>
          <p>
            {tr(
              'Sign in as the business owner to choose what your assistant can access.',
              'سجّل الدخول بصفتك مالك النشاط لاختيار ما يمكن لمساعدك الوصول إليه.',
            )}
          </p>
          <a className="mcp-button" href={signIn}>
            {tr('Sign in to connect', 'سجّل الدخول للاتصال')}
          </a>
        </section>
      )}
      {data?.enabled === false && <p className="mcp-notice">{message('mcp_disabled')}</p>}
      {consent && (
        <ConsentCard
          consent={consent}
          email={account?.email}
          ar={ar}
          busy={busy}
          areas={consentAreas}
          onAreas={setConsentAreas}
          notice={noticeAt('consent')}
          identity={identityAt('consent')}
          onAllow={() => action({ action: 'consent', allow: true, areas: consentAreas, interactionUid: consent.uid })}
          onDecline={() => action({ action: 'consent', allow: false, interactionUid: consent.uid })}
        />
      )}
      {data && (
        <>
          <section className="mcp-section">
            <h2>{tr('Waiting for your approval', 'بانتظار موافقتك')}</h2>
            {doneIn(['approve', 'reject'])}
            {!data.approvals.length && <p>{tr('No pending approvals.', 'لا توجد طلبات بانتظار الموافقة.')}</p>}
            {target && !data.approvals.some(a => a.id === target) && (
              <p className="mcp-notice" role="status">
                {message('approval_not_found')}
              </p>
            )}
            {data.approvals.map(a => {
              const name = activityName(a.tool, ar);
              return (
                <ApprovalCard
                  key={a.id}
                  approval={a}
                  ar={ar}
                  busy={busy}
                  target={a.id === target}
                  notice={noticeAt(`approval:${a.id}`)}
                  identity={identityAt(`approval:${a.id}`)}
                  title={`${name.area} · ${name.action}`}
                  categories={(a.preview?.categories || [])
                    .filter(c => CATEGORIES[c])
                    .map(c => CATEGORIES[c][ar ? 1 : 0])}
                  onApprove={() => action({ action: 'approve', connectionId: a.connectionId, runId: a.id })}
                  onReject={() => action({ action: 'reject', connectionId: a.connectionId, runId: a.id })}
                />
              );
            })}
          </section>
          <section className="mcp-section">
            <h2>{tr('Your connections', 'اتصالاتك')}</h2>
            {doneIn(['revoke'])}
            <p>
              {tr('Workspace: ', 'مساحة العمل: ')}
              {data.workspace?.name || account?.email}
            </p>
            <p className="mcp-muted">
              {tr(
                'A connection is verified after your assistant successfully reaches BznsFlow.',
                'يُؤكّد الاتصال بعد وصول مساعدك بنجاح إلى BznsFlow.',
              )}
            </p>
            {!data.connections.some(isActive) && (
              <p className="mcp-panel">
                {tr(
                  'No assistants connected yet. Follow the setup guide below.',
                  'لم يُربط أي مساعد بعد. اتبع دليل الربط أدناه.',
                )}
              </p>
            )}
            {confirming && !confirmPlace && <div className="mcp-panel">{identity}</div>}
            <div className="mcp-grid">
              {data.connections.filter(isActive).map(c => (
                <ConnectionCard
                  key={`${c.id}-${c.version}`}
                  connection={c}
                  ar={ar}
                  busy={busy}
                  saved={savedId === c.id}
                  notice={noticeAt(`connection:${c.id}`)}
                  identity={identityAt(`connection:${c.id}`)}
                  onSave={(connectionId, direct, write, areas) =>
                    action({
                      action: 'policy',
                      connectionId,
                      direct,
                      areas,
                      scopes: write ? ['workspace:read', 'workspace:write'] : ['workspace:read'],
                    })
                  }
                  onRevoke={connectionId => action({ action: 'revoke', connectionId })}
                />
              ))}
            </div>
            <PastConnections connections={data.connections.filter(c => !isActive(c))} ar={ar} />
          </section>
          <ActivityList activity={data.activity} connections={data.connections} ar={ar} />
        </>
      )}
      <ConnectionGuide ar={ar} endpoint={endpoint} copy={copy} copied={copied} />
      <McpWalkthrough ar={ar} />
      <McpHelp ar={ar} />
      <footer className="mcp-footer">
        <p>
          {tr(
            'Your existing plan and business rules apply to every connected assistant.',
            'تسري باقتك الحالية وقواعد نشاطك على كل مساعد متصل.',
          )}
        </p>
        <p>
          {tr(
            'Claude and Claude Code are Anthropic products. Codex is an OpenAI product. Their marks identify the connection options; no endorsement is implied.',
            'Claude وClaude Code من منتجات Anthropic، وCodex من منتجات OpenAI. تُستخدم الشعارات للتعريف بخيارات الاتصال ولا تعني اعتمادًا من هذه الشركات.',
          )}
        </p>
        <Link to={localePath(lang, '/privacy')}>{tr('Privacy', 'الخصوصية')}</Link>
      </footer>
    </main>
  );
}
