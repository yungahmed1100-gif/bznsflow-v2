import React from 'react';
import { Icon } from './Icon';

export function LeadModal({
  t, lang, isOpen, leadEmail, leadStatus,
  CALENDAR_URL,
  onClose, onEmailChange, onSubmit, trackEvent,
}) {
  if (!isOpen) return null;

  const bullets = [t.lead_b1, t.lead_b2, t.lead_b3];

  return (
    <div className="lead-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lead-modal-close" onClick={onClose} aria-label={t.lead_close}>
          <Icon name="close" size={20} />
        </button>

        {leadStatus === 'success' ? (
          <div className="lead-modal-success">
            <div className="lead-success-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="lead-modal-title">{t.lead_success_title}</h3>
            <p className="lead-modal-sub">{t.lead_success_sub}</p>
            <a
              href={CALENDAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-large"
              onClick={() => trackEvent('LeadModalBookCall')}
            >
              <span>{t.lead_success_cta}</span>
              <Icon name="arrow-right" size={16} strokeWidth={2.5} />
            </a>
          </div>
        ) : (
          <>
            <div className="lead-modal-eyebrow">{t.lead_eyebrow}</div>
            <h3
              id="lead-modal-title"
              className="lead-modal-title"
              dangerouslySetInnerHTML={{ __html: t.lead_title }}
            />
            <p className="lead-modal-sub">{t.lead_sub}</p>

            <ul className="lead-modal-bullets">
              {bullets.map((bullet, i) => (
                <li key={i}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <form className="lead-form" onSubmit={onSubmit} noValidate>
              <label className="lead-form-label" htmlFor="lead-email">{t.lead_email_label}</label>
              <div className="lead-form-row">
                <input
                  id="lead-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t.lead_email_ph}
                  value={leadEmail}
                  onChange={onEmailChange}
                  className={`lead-form-input ${leadStatus === 'error' ? 'is-error' : ''}`}
                  aria-invalid={leadStatus === 'error'}
                  dir="ltr"
                />
                <button
                  type="submit"
                  className="btn btn-primary lead-form-submit"
                  disabled={leadStatus === 'submitting'}
                >
                  {leadStatus === 'submitting' ? '...' : t.lead_submit}
                </button>
              </div>
              <p className="lead-form-disclaimer">{t.lead_disclaimer}</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
