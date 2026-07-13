import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

const FAQ_KEYS = ['faq_q1', 'faq_q2', 'faq_q3', 'faq_q4', 'faq_q5', 'faq_q6'];

export function FAQSection({ t, trackEvent }) {
  return (
    <section className="section" id="faq">
      <div className="container">
        <div className="section-label" data-reveal>{t.faq_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.faq_title }} />

        <div className="faq-list">
          {FAQ_KEYS.map((qKey) => {
            const aKey = qKey.replace('_q', '_a');
            return (
              <details key={qKey} className="faq-item" data-reveal>
                <summary className="faq-question">
                  <span>{t[qKey]}</span>
                  <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="faq-answer">{t[aKey]}</p>
              </details>
            );
          })}
        </div>

        <div className="faq-cta" data-reveal>
          <a
            href={waLink(t.wa_msg_faq)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
            onClick={() => trackEvent?.('WhatsAppClick', { source: 'faq' })}
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.wa_cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
