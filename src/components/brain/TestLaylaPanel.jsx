import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';

/**
 * Test Layla in a side panel: the live decision logic (context, question planning, the AI turn and
 * its checks) on a simulated customer. Draft tests the unpublished bzns.md and catalog; Published
 * tests what customers get now. Nothing is sent, and no customer or conversation is created.
 */
export function TestLaylaPanel({ b, request, take, onClose, hasDraft, onTested }) {
  const ref = useRef(null), input = useRef(null);
  const [variant, setVariant] = useState(hasDraft ? 'draft' : 'published');
  const [turns, setTurns] = useState([]), [sim, setSim] = useState({}), [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current, opener = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal?.();
    input.current?.focus();
    return () => { if (opener instanceof HTMLElement) opener.focus(); };
  }, []);
  const reset = next => { setTurns([]); setSim({}); setError(''); if (next) setVariant(next); };
  async function send(e) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true); setError(''); setText('');
    const history = [...turns.flatMap(t => [{ role: 'customer', text: t.question }, ...(t.reply ? [{ role: 'layla', text: t.reply }] : [])]), { role: 'customer', text: message }];
    try {
      const r = take(await request({ action: 'brain_test', variant, history, sim }));
      setSim(r.test.sim || {});
      setTurns(list => [...list, { question: message, ...r.test }]);
      onTested?.(variant);
    } catch (err) { setError(b.reason(err.reason)); setText(message); }
    finally { setBusy(false); input.current?.focus(); }
  }
  return (
    <dialog ref={ref} className="ld-dialog brain-sheet" aria-labelledby="brain-test-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="brain-sheet-body">
        <header className="ld-dialog-head">
          <h2 id="brain-test-title">{b.t('testTitle')}</h2>
          <button type="button" className="ld-icon-button" onClick={onClose} aria-label={b.t('close')}><span aria-hidden="true">×</span></button>
        </header>
        <div className="brain-sheet-bar">
          <div className="brain-variant" role="radiogroup" aria-label={b.t('testTitle')}>
            {['draft', 'published'].map(v => <button key={v} type="button" role="radio" aria-checked={variant === v} className={`brain-variant-option ${variant === v ? 'is-on' : ''}`} onClick={() => reset(v)}>{b.t(v === 'draft' ? 'testDraft' : 'testPublished')}</button>)}
          </div>
          {!!turns.length && <button type="button" className="ld-button ld-quiet brain-reset" onClick={() => reset()}><Icon name="undo" size={14} />{b.t('reset')}</button>}
        </div>
        <p className={`brain-variant-label ${variant === 'draft' ? 'is-draft' : ''}`} role="status">{b.t(variant === 'draft' ? 'testingDraft' : 'testingPublished')}<span className="brain-variant-note"> · {b.t('testNote')}</span></p>
        <ol className="brain-test-log" aria-live="polite">
          {turns.map((t, i) => <li key={i}>
            <p className="brain-bubble is-customer" dir="auto">{t.question}</p>
            {t.noReply ? <p className="ld-help">{b.t('noReply')}</p> : <p className="brain-bubble is-layla" dir="auto">{t.reply}</p>}
            <dl className="brain-test-meta">
              <dt>{b.t('sources')}</dt><dd>{t.sources?.length ? t.sources.map(x => <span key={x.id} className="ld-chip is-muted" dir="auto">{x.kind === 'catalog' ? b.t('tabCatalog') : 'bzns.md'} · {x.label}</span>) : b.t('noSources')}</dd>
              {!!t.captured?.length && <><dt>{b.t('captured')}</dt><dd>{t.captured.map(f => <span key={f.key} className="ld-chip is-green" dir="auto">{b.ar ? f.ar : f.en}: {f.value}</span>)}</dd></>}
              {(t.reason || t.needsTeam || t.fallback || t.appointment) && <><dt>{b.t('why')}</dt><dd dir="auto">{t.reason}{t.needsTeam ? ` · ${b.t('gaveContact')}` : ''}{t.fallback ? ` · ${b.t('fallback')}` : ''}{t.appointment ? ` · ${b.t('appointment')}` : ''}</dd></>}
            </dl>
          </li>)}
          {busy && <li><p className="ld-help" role="status">{b.t('thinking')}</p></li>}
        </ol>
        {error && <p className="brain-problems" role="alert">{error}</p>}
        <form className="brain-test-form" onSubmit={send}>
          <label className="brain-grow"><span className="ld-visually-hidden">{b.t('testPlaceholder')}</span><input ref={input} dir="auto" maxLength={500} placeholder={b.t('testPlaceholder')} value={text} onChange={e => setText(e.target.value)} disabled={busy} /></label>
          <button type="submit" className="ld-button ld-primary" disabled={busy || !text.trim()}>{b.t('send')}</button>
        </form>
      </div>
    </dialog>
  );
}
