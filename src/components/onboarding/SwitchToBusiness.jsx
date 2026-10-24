import React from 'react';

const STORES = [['App Store (iPhone)', 'https://apps.apple.com/app/whatsapp-business/id1386412706'], ['Google Play (Android)', 'https://play.google.com/store/apps/details?id=com.whatsapp.w4b']];

/** One closed line under "My WhatsApp Business number": how an owner on regular WhatsApp switches first. */
export function SwitchToBusiness({ tr }) {
  return <details className="layla-switch">
    <summary>{tr('Only have regular WhatsApp? How to switch', 'تستخدم واتساب العادي؟ طريقة الانتقال')}</summary>
    <ol>
      <li>{tr('Download WhatsApp Business (free):', 'نزّل واتساب للأعمال (مجاناً):')} {STORES.map(([name, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="layla-store-link">{name}</a>)}</li>
      <li>{tr('Open it and choose your same number.', 'افتحه واختر رقمك نفسه.')}</li>
      <li>{tr('Tap “Continue” to move your chats over, then add your shop’s name.', 'اضغط «متابعة» لنقل محادثاتك، ثم أضف اسم متجرك.')}</li>
    </ol>
  </details>;
}
