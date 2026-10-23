import React from 'react';
import { Icon } from '../ui/Icon';

// Paymob's hosted checkout takes the card, so the plan card says who secures it and which cards it
// accepts (Ahmed, 2026-10-23). Only the cards the live checkout shows: OmanNet is not active on it yet.
const CARDS = [
  { src: '/payments/visa.svg', alt: 'Visa', width: 40, height: 13 },
  { src: '/payments/mastercard.svg', alt: 'Mastercard', width: 29, height: 18 },
  { src: '/payments/amex.svg', alt: 'American Express', width: 18, height: 18 },
];

export function PaymobBadge({ t }) {
  return (
    <div className="paymob-badge">
      <p className="paymob-badge-line">
        <Icon name="shield-check" size={16} />
        <span>{t.tier_pay_secured}</span>
        <img src="/payments/paymob.svg" alt="Paymob" width="74" height="16" loading="lazy" decoding="async" />
      </p>
      <ul className="paymob-badge-cards" aria-label={t.tier_pay_cards}>
        {CARDS.map(card => <li key={card.alt}><img src={card.src} alt={card.alt} width={card.width} height={card.height} loading="lazy" decoding="async" /></li>)}
      </ul>
    </div>
  );
}
