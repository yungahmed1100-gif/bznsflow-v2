import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import { PLAYBOOK_PDF } from '../../lib/constants';

// The playbook prompt — the site's only email capture, and therefore the only
// thing that fires the `Lead` event both ad sets bid against. It appears when a
// visitor is about to leave rather than sitting in the page flow; see
// hooks/useExitIntent.js for how that moment is detected.
//
// Submits to /api/lead, which talks to Apps Script server-side. It used to post
// straight to the /exec URL with `mode: 'no-cors'`, which meant an opaque
// response the page could not read, no timeout, and a `Lead` event that fired
// whether or not capture actually worked. Because `doPost` downloads the teaser
// and the PDF before replying, a slow script left this button disabled with the
// page's scroll locked — the "tab freezes" report. See api/lead.js.

// Nothing survives a request this long being worth waiting for, and the modal
// holds the page's scroll lock while it waits.
const SUBMIT_TIMEOUT_MS = 15000;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PlaybookModal({ t, lang = 'ar', open, onClose, trackEvent }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Focus management + ESC + focus trap. Unlike the chat panel (which is
  // aria-modal="false" because it never blocks the page), this one does block,
  // so keyboard users must not be able to tab out into dead content behind it.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector(FOCUSABLE)?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Same scroll-lock approach the mobile menu already uses in Home.jsx.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (status === 'sending') return;
      setStatus('sending');

      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          // A bounded wait. Apps Script fetches the teaser and the PDF before it
          // replies, so this is genuinely slow — but an unbounded await leaves
          // the visitor staring at a disabled button on a page that cannot
          // scroll, which reads as a crash.
          signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
          body: JSON.stringify({
            playbook: true,
            name: name.trim(),
            email: email.trim(),
            sourceCta: 'Playbook Popup',
            language: lang,
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          setStatus('error');
          return;
        }

        setStatus('sent');
        // Only now, and only on a response we could actually read. The old
        // no-cors call fired this on an opaque promise that resolved even when
        // nothing had been captured, which quietly poisoned the ad optimisation
        // signal both ad sets bid against.
        trackEvent?.('PlaybookSubmit');

        // The row saved but the email did not. The success screen still hands
        // over the PDF, so the visitor is fine — this is for us.
        if (data.emailed === false) {
          console.error('[playbook] lead captured but the email failed to send');
        }
      } catch {
        // Timeout, offline, or a server error. Never a dead end: the failure
        // state still hands over the PDF.
        setStatus('error');
      }
    },
    [status, name, email, lang, trackEvent],
  );

  if (!open) return null;

  const isDone = status === 'sent';

  return (
    <div className="playbook-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="playbook-card playbook-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="playbook-title"
        ref={panelRef}
      >
        <button type="button" className="playbook-close" onClick={onClose} aria-label={t.playbook_close}>
          <Icon name="close" size={18} />
        </button>

        {isDone ? (
          <div className="playbook-success">
            <Icon name="check" size={28} />
            <h2 id="playbook-title" className="playbook-success-title">{t.playbook_success_title}</h2>
            <p className="playbook-sub">{t.playbook_success_sub}</p>
            <a href={PLAYBOOK_PDF} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large">
              <Icon name="feather" size={18} />
              <span>{t.playbook_download}</span>
            </a>
          </div>
        ) : (
          <>
            <div className="section-label">{t.playbook_eyebrow}</div>
            <h2
              id="playbook-title"
              className="playbook-title"
              dangerouslySetInnerHTML={{ __html: t.playbook_title }}
            ></h2>
            <p className="playbook-sub">{t.playbook_sub}</p>

            <ul className="playbook-problems">
              <li>{t.playbook_problem_1}</li>
              <li>{t.playbook_problem_2}</li>
              <li>{t.playbook_problem_3}</li>
            </ul>

            <p className="playbook-cost">{t.playbook_cost}</p>
            <p className="playbook-solution">{t.playbook_solution}</p>

            <form className="playbook-form" onSubmit={handleSubmit}>
              <div className="playbook-field">
                <label htmlFor="playbook-name">{t.playbook_name_label}</label>
                <input
                  id="playbook-name" name="name" type="text" autoComplete="name" required
                  placeholder={t.playbook_name_ph}
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="playbook-field">
                <label htmlFor="playbook-email">{t.playbook_email_label}</label>
                <input
                  id="playbook-email" name="email" type="email" autoComplete="email" required
                  placeholder={t.playbook_email_ph}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-large playbook-submit" disabled={status === 'sending'}>
                <Icon name="mail" size={18} />
                <span>{status === 'sending' ? t.playbook_sending : t.playbook_cta}</span>
              </button>
            </form>

            {status === 'error' && (
              <p className="playbook-error" role="alert">
                {t.chat_error}{' '}
                <a href={PLAYBOOK_PDF} target="_blank" rel="noopener noreferrer">
                  {t.playbook_download}
                </a>
              </p>
            )}

            <p className="playbook-privacy">{t.playbook_privacy}</p>
          </>
        )}
      </div>
    </div>
  );
}
