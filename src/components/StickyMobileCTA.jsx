import React from 'react';
import { Icon } from './Icon';

export function StickyMobileCTA({ t, CALENDAR_URL, WHATSAPP_URL, trackEvent }) {
  return (
    <div className="sticky-mobile-cta" role="region" aria-label="Quick contact">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sticky-mobile-btn sticky-mobile-btn--wa"
        onClick={() => trackEvent('StickyCTAClick', { action: 'whatsapp' })}
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
