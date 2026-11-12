import React, { useEffect, useRef, useState } from 'react';

const CODE = /^\d{6}$/;

/**
 * Connecting an assistant or changing its permissions needs a sign-in from the last five
 * minutes, so a stolen old session cannot grant access. Instead of sending the owner away
 * to sign in again, the code is emailed and confirmed here, then the action continues.
 */
export function ConfirmIdentity({ ar, email, csrf, onConfirmed, onCancel }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const [state, setState] = useState('sending'),
    [code, setCode] = useState(''),
    [problem, setProblem] = useState('');
  const input = useRef(null);
  const post = (path, body) =>
    fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify(body),
    }).then(async r => ({ ok: r.ok, value: await r.json().catch(() => ({})) }));
  async function send() {
    setState('sending');
    setProblem('');
    const r = await post('/api/auth-code', { email, lang: ar ? 'ar' : 'en' }).catch(() => null);
    if (!r?.ok) {
      setProblem(r?.value?.reason === 'rate_limited' ? 'rate' : 'send');
      setState('idle');
      return;
    }
    setState('sent');
    setTimeout(() => input.current?.focus(), 0);
  }
  useEffect(() => {
    void send();
    // Send once when the step opens; "Send a new code" repeats it on request.
  }, []);
  async function confirm(e) {
    e.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!CODE.test(clean)) {
      setProblem('format');
      return;
    }
    setState('checking');
    setProblem('');
    const r = await post('/api/auth-session', { email, code: clean }).catch(() => null);
    if (!r?.ok) {
      setProblem(r?.value?.reason === 'code_expired' ? 'expired' : 'wrong');
      setState('sent');
      return;
    }
    onConfirmed();
  }
  const problems = {
    format: tr('Enter the 6 digits from the email.', 'أدخل الأرقام الستة من البريد.'),
    wrong: tr(
      'That code did not match. Check the latest email and try again.',
      'الرمز غير مطابق. تحقّق من آخر رسالة وحاول مجددًا.',
    ),
    expired: tr('That code expired. Send a new one.', 'انتهت صلاحية الرمز. أرسل رمزًا جديدًا.'),
    send: tr('The code could not be sent. Try again.', 'تعذّر إرسال الرمز. حاول مجددًا.'),
    rate: tr(
      'Too many codes requested. Wait a minute, then send a new one.',
      'طلبات كثيرة. انتظر دقيقة ثم أرسل رمزًا جديدًا.',
    ),
  };
  return (
    <form className="mcp-confirm-identity" onSubmit={confirm} aria-busy={state === 'checking' || state === 'sending'}>
      <h3>{tr("Confirm it's you", 'أكّد هويتك')}</h3>
      <p>
        {state === 'sending'
          ? tr('Sending a code to ', 'جارٍ إرسال رمز إلى ')
          : tr('We emailed a 6-digit code to ', 'أرسلنا رمزًا من ستة أرقام إلى ')}
        <bdi dir="ltr">{email}</bdi>.{' '}
        {tr(
          'Connecting an assistant needs a recent sign-in, so an old session cannot grant access to your business.',
          'ربط مساعد يتطلّب تسجيل دخول حديثًا، حتى لا تمنح جلسة قديمة الوصول إلى نشاطك.',
        )}
      </p>
      <label htmlFor="mcp-identity-code">{tr('Code', 'الرمز')}</label>
      <input
        ref={input}
        id="mcp-identity-code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        dir="ltr"
        value={code}
        onChange={e => setCode(e.target.value)}
        aria-invalid={!!problem && problem !== 'send' && problem !== 'rate'}
        aria-describedby={problem ? 'mcp-identity-problem' : undefined}
        disabled={state === 'checking'}
      />
      {problem && (
        <p id="mcp-identity-problem" className="mcp-notice" role="alert">
          {problems[problem]}
        </p>
      )}
      <div className="mcp-actions">
        <button type="submit" disabled={state !== 'sent'}>
          {state === 'checking' ? tr('Checking…', 'جارٍ التحقق…') : tr('Confirm and continue', 'تأكيد ومتابعة')}
        </button>
        <button
          type="button"
          className="mcp-secondary"
          disabled={state === 'sending' || state === 'checking'}
          onClick={send}
        >
          {tr('Send a new code', 'إرسال رمز جديد')}
        </button>
        <button type="button" className="mcp-secondary" onClick={onCancel}>
          {tr('Cancel', 'إلغاء')}
        </button>
      </div>
    </form>
  );
}
