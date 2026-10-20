import React, { useState } from 'react';
import { LangSwitch } from './LangSwitch';

const escape = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * The HTML a website needs to collect subscribers: a plain form, so it works on any site without
 * scripts. The hidden `website` field catches bots; the person joins only after confirming by email.
 */
export function signupSnippet({ origin, formKey, business, lang }) {
  const ar = lang === 'ar';
  return `<form method="post" action="${origin}/email/subscribe"${ar ? ' dir="rtl"' : ''}>
  <input type="hidden" name="k" value="${escape(formKey)}">
  <input type="hidden" name="lang" value="${ar ? 'ar' : 'en'}">
  <label>${ar ? 'الاسم' : 'Name'} <input type="text" name="name" autocomplete="name"></label>
  <label>${ar ? 'البريد الإلكتروني' : 'Email'} <input type="email" name="email" autocomplete="email" required></label>
  <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <p>${escape(ar ? `باشتراكك توافق على استلام رسائل ${business} بالبريد الإلكتروني. يمكنك إلغاء الاشتراك في أي وقت.` : `By subscribing you agree to receive emails from ${business}. You can unsubscribe at any time.`)}</p>
  <button type="submit">${ar ? 'اشترك' : 'Subscribe'}</button>
</form>`;
}

export function EmailSignup({ s, domain, business }) {
  const [lang, setLang] = useState(s.ar ? 'ar' : 'en'), [copied, setCopied] = useState(false);
  const code = domain?.ready ? signupSnippet({ origin: window.location.origin, formKey: domain.formKey, business: business.name, lang }) : '';
  return (
    <section className="ld-section ld-email-card" aria-labelledby="ld-email-signup">
      <h2 id="ld-email-signup">{s.t('rasil_signup_title')}</h2>
      {!domain?.ready ? <p className="ld-help">{s.t('rasil_signup_later')}</p> : <>
        <p className="ld-help">{s.t('rasil_signup_intro')}</p>
        <LangSwitch s={s} lang={lang} onChange={setLang} />
        <pre className="ld-code" dir="ltr" tabIndex={0}><code>{code}</code></pre>
        <button type="button" className="ld-button" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* selectable */ } }}>
          {copied ? s.t('rasil_copied') : s.t('rasil_copy')}
        </button>
      </>}
    </section>
  );
}
