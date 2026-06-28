import React from 'react';
import { Icon } from './Icon';
import { waLink } from '../lib/whatsapp';

export function StickyMobileCTA({ t, CALENDAR_URL, WHATSAPP_URL, trackEvent }) {
  return (
    <div className="sticky-mobile-cta" role="region" aria-label="Quick contact">
      <a
        href={waLink(t.wa_msg_hero)}
        target="_blank"
        rel="noopener noreferrer"
        className="sticky-mobile-btn sticky-mobile-btn--wa"
        onClick={() => trackEvent('WhatsAppClick', { source: 'sticky' })}
        aria-label={t.sticky_chat}
      >
        <Icon name="whatsapp" size={20} />
        <span>{t.sticky_chat}</span>
      </a>
      <a
        href={CALENDAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sticky-mobile-btn sticky-mobile-btn--book"
        onClick={() => trackEvent('StickyCTAClick', { action: 'book-call' })}
        aria-label={t.sticky_book}
      >
        <Icon name="calendar" size={18} strokeWidth={2.4} />
        <span>{t.sticky_book}</span>
      </a>
    </div>
  );
}
