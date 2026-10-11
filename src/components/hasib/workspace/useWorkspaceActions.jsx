import React, { useRef, useState } from 'react';
import { hasib } from '../../../lib/dashboard/api';

/**
 * One change at a time for a sector workspace: refuses double-clicks, refreshes the view, explains
 * any refusal in the owner's language, and asks first when a question is given.
 * @returns {{ busy: boolean, error: string, setError: Function, perform: Function, act: Function, notices: JSX.Element, clear: Function }}
 */
export function useWorkspaceActions({ ar, s, h, refresh, onChanged }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(null), [changes, setChanges] = useState(0);
  const busyRef = useRef(false);
  const perform = async (operation, body, after) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(''); setConfirm(null);
    try {
      const result = await hasib(operation, body);
      if (result?.invitationDelivery === 'failed') setError(tr('Invitation saved, but the email could not be sent. Use “Resend invitation”.', 'تم حفظ الدعوة، لكن تعذّر إرسال البريد. استخدم «إعادة إرسال الدعوة».'));
      await refresh?.({ quiet: true }); setChanges(n => n + 1); after?.(result); onChanged?.();
      return true;
    } catch (e) { setError(h.reason(e.reason) || s.reason(e.reason)); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const act = (operation, body, after, question) => question ? setConfirm({ question, run: () => perform(operation, body, after) }) : perform(operation, body, after);
  const notices = <>
    {error && <p className="ld-inline-error" role="alert">{error}</p>}
    {confirm && <div className="hb-confirm" role="alertdialog" aria-label={confirm.question}><p>{confirm.question}</p>
      <button type="button" className="ld-button ld-primary" disabled={busy} onClick={confirm.run}>{tr('Yes, continue', 'نعم، متابعة')}</button>
      <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => setConfirm(null)}>{s.t('cancel')}</button></div>}
  </>;
  const clear = () => { setConfirm(null); setError(''); };
  return { busy, error, setError, perform, act, notices, changes, clear };
}
