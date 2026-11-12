import React from 'react';
import { ClientMark, BZNSFLOW_ICON } from './ConnectionGuide';
import { AREAS } from './copy';

/**
 * The connection request an AI assistant sent: who is asking, which business areas it may
 * reach, and what it may do. `notice` is a refusal shown next to the buttons; `identity`
 * replaces the buttons while the owner confirms a stale sign-in with an emailed code.
 */
export function ConsentCard({ consent, email, ar, busy, areas, onAreas, notice, identity, onAllow, onDecline }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  return (
    <section className="mcp-panel mcp-consent">
      <div className="mcp-consent-pair" aria-hidden="true">
        <ClientMark name={consent.clientName} id={consent.clientId} size={48} />
        <span className="mcp-consent-link" />
        <img className="mcp-client-mark" src={BZNSFLOW_ICON} width="48" height="48" alt="" />
      </div>
      <p className="mcp-eyebrow">{tr('CONNECTION REQUEST', 'طلب اتصال')}</p>
      <h2>{tr(`Connect ${consent.clientName}?`, `ربط ${consent.clientName}؟`)}</h2>
      <p>{tr(`You are authorizing access to ${email}'s business.`, `أنت تمنح الوصول إلى نشاط ${email}.`)}</p>
      <p dir="ltr" className="mcp-client-id">
        {consent.clientId}
      </p>
      <p>
        {tr(
          'Your assistant can receive business and customer information returned by the tools you authorize. That information is handled by your chosen AI service.',
          'يمكن لمساعدك تلقي معلومات النشاط والعملاء التي تُرجعها الأدوات المصرّح بها. تتعامل خدمة الذكاء الاصطناعي التي تختارها مع هذه المعلومات.',
        )}
      </p>
      <fieldset disabled={busy}>
        <legend>{tr('Allow access to', 'السماح بالوصول إلى')}</legend>
        {Object.entries(AREAS).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={areas.includes(key)}
              onChange={e => onAreas(e.target.checked ? [...areas, key] : areas.filter(v => v !== key))}
            />
            {label[ar ? 1 : 0]}
          </label>
        ))}
      </fieldset>
      <ul>
        <li>{tr('Read information permitted by your plan.', 'قراءة المعلومات المسموح بها ضمن باقتك.')}</li>
        {consent.scopes.includes('workspace:write') && (
          <li>
            {tr(
              'Make routine edits and prepare important actions for your approval.',
              'إجراء تعديلات اعتيادية وإعداد الإجراءات المهمة لموافقتك.',
            )}
          </li>
        )}
      </ul>
      <p>
        {tr(
          'Access lasts up to 30 days and can renew automatically within that period. You can change permissions or disconnect at any time.',
          'يستمر الوصول لمدة تصل إلى ٣٠ يومًا مع تجديد تلقائي خلالها. يمكنك تعديل الصلاحيات أو قطع الاتصال في أي وقت.',
        )}
      </p>
      {notice}
      {identity || (
        <div className="mcp-actions">
          {!areas.length && (
            <p className="mcp-muted" id="mcp-consent-empty">
              {tr('Choose at least one area to continue.', 'اختر مجالًا واحدًا على الأقل للمتابعة.')}
            </p>
          )}
          <button
            disabled={busy || !areas.length}
            aria-describedby={areas.length ? undefined : 'mcp-consent-empty'}
            onClick={onAllow}
            aria-busy={busy || undefined}
          >
            {busy ? tr('Connecting…', 'جارٍ الربط…') : tr('Continue with this account', 'المتابعة بهذا الحساب')}
          </button>
          <button className="mcp-secondary" disabled={busy} onClick={onDecline}>
            {tr('Decline', 'رفض')}
          </button>
        </div>
      )}
    </section>
  );
}
