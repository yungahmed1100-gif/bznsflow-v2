import React, { useCallback, useEffect, useState } from 'react';
import { briefAction, loadBrief } from '../../../lib/dashboard/website-brief';
import { W, ERRORS } from './copy';
import { WebsiteWizard } from './WebsiteWizard';
import { WebsiteTracker } from './WebsiteTracker';

/**
 * The Website tab (Ahmed, 2026-10-23): Ascend's free website, domain and business mailbox. Until the
 * brief is sent it is a step-by-step wizard; after that, a tracker promising the site within 3 business days.
 */
export function WebsiteOnboarding({ s, emailOpen, onGo }) {
  const tr = pair => pair[s.ar ? 1 : 0];
  const [state, setState] = useState({ loading: true });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => loadBrief()
    .then(({ brief, csrfToken }) => setState({ brief, csrf: csrfToken }))
    .catch(e => setState({ failed: e.reason || 'brief_unavailable' })), []);
  useEffect(() => { load(); }, [load]);

  if (state.loading) return <p className="ld-state" role="status">{tr(W.loading)}</p>;
  if (state.failed) return <div className="ld-state" role="alert"><p>{s.reason(state.failed)}</p><button type="button" className="ld-button" onClick={load}>{s.t('retry')}</button></div>;

  const { brief, csrf } = state;
  const resend = async () => {
    setBusy(true);
    try { await briefAction(csrf, 'resend'); await load(); } catch (e) { setState(st => ({ ...st, resendError: e.reason })); } finally { setBusy(false); }
  };
  const tracking = !!brief.version && !!brief.project && !editing;

  return (
    <div className="ld-web">
      <div className="ld-page-head"><div><h1>{tr(W.title)}</h1><p className="ld-lede">{tr(W.intro)}</p></div></div>
      {brief.submittedAt && !brief.emailedAt && <p className="ld-brief-status" role="status">{tr(W.notEmailed)}{' '}
        <button type="button" className="ld-button" disabled={busy} onClick={resend}>{tr(W.resend)}</button>
        {state.resendError && <span className="ld-inline-error"> {tr(ERRORS[state.resendError] || ERRORS.brief_email_failed)}</span>}</p>}
      {tracking
        ? <WebsiteTracker s={s} project={brief.project} emailOpen={emailOpen} onChange={() => setEditing(true)} onGo={onGo} />
        : <>
          {editing && <button type="button" className="ld-link ld-web-cancel" onClick={() => setEditing(false)}>{tr(W.cancelChange)}</button>}
          <WebsiteWizard key={brief.version} s={s} brief={brief} csrf={csrf} onSent={() => { setEditing(false); load(); }} />
        </>}
    </div>
  );
}
