import React, { useEffect, useState } from 'react';
import { WHATSAPP_URL } from '../../lib/constants';

/** True on a phone-sized or touch-first screen, where scanning a code on the same screen isn't possible. */
export function usePhoneOnly() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    const update = () => setPhone(query.matches);
    update(); query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return phone;
}

/** "Stuck?" — message the BznsFlow team on WhatsApp, or email yourself this page for a computer. */
export function SetupHelpLinks({ tr, email, phoneOnly }) {
  const page = typeof window === 'undefined' ? '' : window.location.href.split('#')[0];
  const mail = `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(tr('Finish setting up Layla', 'أكمل إعداد ليلى'))}&body=${encodeURIComponent(`${tr('Open this on a computer and keep your phone with you:', 'افتح هذا الرابط على كمبيوتر وأبقِ هاتفك معك:')}\n${page}`)}`;
  return <aside className="layla-help-links" aria-label={tr('Help with connecting', 'مساعدة في الربط')}>
    <p><strong>{tr('Stuck?', 'تحتاج مساعدة؟')}</strong> <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{tr('Message us on WhatsApp', 'راسلنا على واتساب')}</a></p>
    {phoneOnly && email && <div className="layla-help-actions">
      <a className="layla-secondary" href={mail}>{tr('Easier on a computer? Email me this link', 'أسهل على الكمبيوتر؟ أرسل لي الرابط بالبريد')}</a>
    </div>}
  </aside>;
}

/** After the number is connected: what's left, in plain words. Billing sits on Meta's Messaging account (2026). */
export function AfterConnect({ tr, path }) {
  return <section className="layla-answer" aria-labelledby="layla-after-heading">
    <h4 id="layla-after-heading">{tr('Connected ✓ What’s next', 'تم الربط ✓ ما التالي')}</h4>
    <ol>
      <li>{tr('Add a payment method to your Messaging account in Meta. Its billing settings show any WhatsApp charges.', 'أضف وسيلة دفع إلى حساب المراسلة (Messaging account) في Meta. تعرض إعدادات الفوترة أي رسوم على واتساب.')} <a href="https://business.facebook.com/billing_hub/payment_settings" target="_blank" rel="noopener noreferrer">{tr('Open billing settings', 'فتح إعدادات الفوترة')}</a></li>
      <li>{tr('Test it: send “hi” to your shop from another phone and watch Layla answer.', 'جرّبها: أرسل «مرحبا» إلى متجرك من هاتف آخر وشاهد ليلى ترد.')}</li>
    </ol>
    {path === 'coexistence' && <>
      <p className="layla-help">{tr('Keep using WhatsApp Business on your phone as usual. Leave the app open for a few minutes while it syncs.', 'استمر في استخدام واتساب للأعمال على هاتفك كالمعتاد. أبقِ التطبيق مفتوحاً بضع دقائق حتى تكتمل المزامنة.')}</p>
      <p className="layla-help layla-linked-devices">{tr('Your linked computers were signed out. Link them again from WhatsApp Business → Linked devices.', 'سُجّل خروج أجهزتك المرتبطة. اربطها مجدداً من واتساب للأعمال ← الأجهزة المرتبطة.')}</p>
    </>}
  </section>;
}
