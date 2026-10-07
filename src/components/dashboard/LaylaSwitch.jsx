import React, { useId, useState } from 'react';

/**
 * Layla's on/off switch. The knob moves at once; if the server refuses, it moves
 * back and the reason appears beneath it. Used for the whole business (header)
 * and for each channel.
 */
export function LaylaSwitch({ s, on, label, detail, disabled = false, problem = '', onToggle }) {
  const [pending, setPending] = useState(null), [error, setError] = useState('');
  const id = useId();
  const shown = pending ?? !!on;
  async function change(event) {
    const next = event.target.checked;
    setPending(next); setError('');
    try { await onToggle(next); }
    catch (e) { setError(s.reason(e?.reason)); }
    finally { setPending(null); }
  }
  const note = error || problem;
  return (
    <div className={`ld-layla-switch ${shown ? 'is-on' : ''}`}>
      <label className="ld-switch">
        <input type="checkbox" role="switch" checked={shown} disabled={disabled || pending !== null} onChange={change}
          aria-describedby={note ? `${id}-note` : undefined} aria-busy={pending !== null || undefined} />
        <span className="ld-switch-track" aria-hidden="true" />
        <span className="ld-switch-text">
          <strong>{label ?? (shown ? s.t('active') : s.t('paused'))}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </label>
      {note && <p id={`${id}-note`} className="ld-switch-note" role={error ? 'alert' : undefined}>{note}</p>}
    </div>
  );
}
