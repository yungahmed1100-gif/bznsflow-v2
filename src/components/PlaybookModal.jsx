import React, { useRef } from 'react';
import { Icon } from './Icon';

// Entry lead-magnet: "دليل عملي للتطور بمشروعك". Captures name + email, then the
// backend auto-emails the playbook (PDF attached). Reuses the existing
// .lead-modal / .lead-form styling — no restyle of existing elements.
export function PlaybookModal({
  t, lang, isOpen,
  name, email, status,
  downloadUrl,
  onClose, onNameChange, onEmailChange, onSubmit, trackEvent,
}) {
  // Light anti-bot: a hidden field real users never fill. If populated, we
  // silently drop the submission without hitting the endpoint.
  const honeypotRef = useRef(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (honeypotRef.current && honeypotRef.current.value) {
      e.preventDefault();
      onClose();
      return;
    }
    onSubmit(e);
  };

  return (
    <div className="lead-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="playbook-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lead-modal-close" onClick={onClose} aria-label={t.lead_close}>
          <Icon name="close" size={20} />
        </button>

        {status === 'success' ? (
          <div className="lead-modal-success">
            <div className="lead-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="lead-modal-title">{t.playbook_success_title}</h3>
            <p className="lead-modal-sub">{t.playbook_success_sub}</p>
            <a
              href={downloadUrl}
              download
              className="btn btn-primary btn-large"
              onClick={() => trackEvent && trackEvent('PlaybookDownload')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t.playbook_download}</span>
            </a>
          </div>
        ) : (
          <>
            <div className="lead-modal-eyebrow">{t.playbook_eyebrow}</div>
            <h3
              id="playbook-modal-title"
              className="lead-modal-title"
              dangerouslySetInnerHTML={{ __html: t.playbook_title }}
            />
            <p className="lead-modal-sub">{t.playbook_sub}</p>

            <form className="lead-form lead-form--stack" onSubmit={handleSubmit} noValidate>
              {/* Honeypot — visually hidden, off the tab order. */}
              <input
                ref={honeypotRef}
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />

              <label className="lead-form-label" htmlFor="playbook-name">{t.playbook_name_label}</label>
              <input
                id="playbook-name"
                type="text"
                autoComplete="name"
                required
                placeholder={t.playbook_name_ph}
                value={name}
                onChange={onNameChange}
                className="lead-form-input"
              />

              <label className="lead-form-label" htmlFor="playbook-email">{t.playbook_email_label}</label>
              <input
                id="playbook-email"
                type="email"
                autoComplete="email"
                required
                placeholder={t.playbook_email_ph}
                value={email}
                onChange={onEmailChange}
                className={`lead-form-input ${status === 'error' ? 'is-error' : ''}`}
                aria-invalid={status === 'error'}
                dir="ltr"
              />

              <button
                type="submit"
                className="btn btn-primary btn-large lead-form-submit--block"
                disabled={status === 'submitting'}
              >
                <span>{status === 'submitting' ? t.playbook_sending : t.playbook_cta}</span>
              </button>

              <p className="lead-form-disclaimer">{t.playbook_privacy}</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
