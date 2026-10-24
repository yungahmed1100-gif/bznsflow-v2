import React, { useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { BrandMark } from '../ui/BrandMark';
import { MetaWindowGuide } from './MetaWindowGuide.jsx';
import { SetupHelpLinks, AfterConnect, usePhoneOnly } from './SetupHelpLinks.jsx';
import { SwitchToBusiness } from './SwitchToBusiness.jsx';

// Two choices (Ahmed, 2026-10-25). "A different number" covers a new number and one already on an API:
// both open the same Meta window, and the server's new_number path connects a registered number directly.
const PATHS = ['coexistence', 'new_number'];

/** Everything the customer must have before Meta's window can open, in order. */
export function whatsappRequirements({ data, available, reviewMode }) {
  return [
    ['account', reviewMode || !!data?.savedToAccount],
    ['contact', !!(data?.profile?.humanContact || data?.profile?.handoffMode === 'inbox')],
    ['meta', !!available],
  ];
}

// Meta's display-name review status in words an owner understands.
function nameStatus(tr, status) {
  if (['APPROVED', 'AVAILABLE_WITHOUT_REVIEW'].includes(status)) return tr('approved', 'معتمد');
  if (['PENDING_REVIEW', 'NONE', 'UNKNOWN'].includes(status)) return tr('under review by Meta', 'قيد المراجعة لدى Meta');
  return tr('not approved — check it in WhatsApp Manager', 'غير معتمد — راجعه في مدير واتساب');
}

function PathChoice({ path, value, onChange, children }) {
  // An older existing_cloud attempt or connection shows as "A different number".
  const checked = value === 'coexistence' ? path === value : path !== 'coexistence';
  return <label className="layla-choice"><input type="radio" name="number-path" checked={checked} onChange={() => onChange(value)} /><span>{children}</span></label>;
}

// WhatsApp card on the channels step: number type, Meta's signup window, the
// verification checklist and the new-number registration PIN.
export function WhatsAppConnect({ tr, explain, open, onOpen, errorNote, onClaim, liveSwitch = null, data, busy, available, reviewMode, prepared, preparing, finishing = false, path, onPathChange, onPrepare, onConnect, onCancelAttempt, run, act, request, applyState }) {
  const [pin, setPin] = useState('');
  const phoneOnly = usePhoneOnly();
  const requirements = whatsappRequirements({ data, available, reviewMode });
  const ready = requirements.every(([, ok]) => ok);
  const labels = {
    account: tr('Setup saved to your account', 'الإعداد محفوظ في حسابك'),
    contact: tr('Team contact added in business details', 'إضافة جهة اتصال للفريق في معلومات النشاط'),
    meta: tr('WhatsApp connection available', 'ربط واتساب متاح'),
  };
  const integration = data?.integration;
  // Meta's connection is switched off on our side: say so first, before any choice or checklist.
  const paused = !!data && !available && !integration && !data?.selection;
  const live = ['connected', 'paused'].includes(integration?.status);
  const checksOk = !!(data?.connectionChecks?.path && data.connectionChecks.registered && data.connectionChecks.routing);
  const ownPrepared = prepared && prepared.path === path;
  const register = event => {
    event.preventDefault();
    const body = { action: 'register_number', integration: integration.id, pin, confirm: true };
    setPin('');
    act(async () => { try { applyState(await request(body)); } finally { delete body.pin; } });
  };
  const changePath = next => {
    if ((next === 'coexistence') !== (path === 'coexistence')) onPathChange(next);
  };
  return <section className="layla-channel-card layla-channel-card--whatsapp" aria-labelledby="whatsapp-channel-heading">
    <h3 id="whatsapp-channel-heading"><BrandMark name="whatsapp" size={26} className="layla-channel-logo" />WhatsApp</h3>
    {data?.status === 'reconciliation_required' && <p role="status">{tr('Meta’s result needs verification. Check your connection before trying again.', 'تحتاج نتيجة Meta إلى التحقق. تحقّق من الاتصال قبل المحاولة مجدداً.')}</p>}
    {integration && <p className="layla-notice">{tr('Selected number:', 'الرقم المحدّد:')} <bdi>+{integration.sender}</bdi></p>}
    {integration?.path === 'coexistence' && !['connected', 'paused'].includes(integration.status) && <p className="layla-notice layla-notice--progress" role="status">{tr('Keep the WhatsApp Business app open on your phone while Meta finishes connecting and syncing. This can take a few minutes.', 'أبقِ تطبيق واتساب للأعمال مفتوحاً على هاتفك حتى تُكمل Meta الربط والمزامنة. قد يستغرق ذلك بضع دقائق.')}</p>}
    {data?.selection && <section className="layla-answer"><h3>{tr('Choose the number you intended to connect', 'اختر الرقم الذي تريد ربطه')}</h3>
      {data.selection.candidates.map(phone => <button key={phone.id} className="layla-secondary" disabled={busy || Date.now() >= data.selection.expiresAt} onClick={() => run({ action: 'select_phone', phone: phone.id })}><bdi>+{phone.sender}</bdi></button>)}
      {!integration && errorNote}
      <button className="layla-secondary" disabled={busy} onClick={() => run({ action: 'cancel_selection' })}>{tr('Cancel this selection', 'إلغاء الاختيار')}</button>
    </section>}
    {data?.connectionChecks && <details className="layla-connection-details" open={!live || !checksOk}><summary>{tr('Connection details', 'تفاصيل الاتصال')}</summary>
      <ul className="layla-checklist">{[['path', tr('Number type verified', 'التحقق من نوع الرقم')], ['registered', tr('Number registered', 'تسجيل الرقم')], ['routing', tr('Messages reach BznsFlow', 'الرسائل تصل إلى BznsFlow')]].map(([key, label]) => <li key={key} data-ok={data.connectionChecks[key] ? '' : undefined}>{label}<span className="ld-visually-hidden">{data.connectionChecks[key] ? tr(': done', ': تم') : tr(': waiting', ': قيد الانتظار')}</span></li>)}</ul>
      {data.connectionChecks.nameStatus && <p className="layla-help">{tr('Business name on WhatsApp:', 'اسم النشاط على واتساب:')} {nameStatus(tr, data.connectionChecks.nameStatus)}</p>}
      {integration && <button className="layla-secondary" disabled={busy} onClick={() => run({ action: 'refresh' })}>{tr('Check my connection', 'التحقق من الاتصال')}</button>}
    </details>}
    {data?.diagnostic && <p className="layla-notice layla-notice--problem">{explain(data.diagnostic.reason)}<br />{tr('Support reference:', 'مرجع الدعم:')} {data.diagnostic.stage}-{data.diagnostic.at}{data.diagnostic.providerCode ? ` · Meta ${data.diagnostic.providerCode}` : ''}</p>}
    {integration?.sender?.startsWith('1555') && <p className="layla-help">{tr('This resembles a Meta-provided 555 number. Check the selected number and display-name approval in WhatsApp Manager before using it for customers.', 'يبدو أن هذا رقم 555 مقدّم من Meta. تحقّق من الرقم وموافقة اسم العرض في مدير واتساب قبل استخدامه للعملاء.')}</p>}
    {live && liveSwitch}
    {integration && !live && <p role="status">{tr('This number is saved. Complete the registration step if shown, or check your connection to continue.', 'هذا الرقم محفوظ. أكمل خطوة التسجيل إن ظهرت، أو تحقّق من الاتصال للمتابعة.')}</p>}
    {live && <AfterConnect tr={tr} />}
    {integration && errorNote}
    {integration && !data?.connectionChecks && <button className="layla-secondary" disabled={busy} onClick={() => run({ action: 'refresh' })}>{tr('Check my connection', 'التحقق من الاتصال')}</button>}
    {data?.ownerConnectAvailable && !prepared && <section className="layla-answer" aria-labelledby="layla-owner-number">
      <h3 id="layla-owner-number">{tr('BznsFlow’s own number', 'رقم BznsFlow الخاص')}</h3>
      <p>{tr('This number was added directly in Meta, so Meta’s signup window cannot list it. Connect it with BznsFlow’s approved server credential instead.', 'أُضيف هذا الرقم مباشرة في Meta، لذلك لا تعرضه نافذة التسجيل. اربطه باستخدام بيانات الاعتماد المعتمدة لدى BznsFlow.')}</p>
      <button className="layla-primary" disabled={busy} onClick={() => run({ action: 'connect_owner_number' })}>{busy ? tr('Connecting…', 'جارٍ الربط…') : tr('Connect +968 7113 4025 directly', 'ربط ‎+968 7113 4025 مباشرة')}</button>
    </section>}
    {paused && <p className="layla-notice" role="status">{tr('WhatsApp connection is paused on our side. Your setup is saved; we’ll message you when it’s back.', 'ربط واتساب متوقف مؤقتاً من جهتنا. إعدادك محفوظ، وسنراسلك عند عودته.')}</p>}
    {!paused && !integration && !data?.selection && !open && <>
      <p>{tr('Let Layla answer your WhatsApp customers. You choose the number next.', 'دع ليلى تردّ على عملائك في واتساب. ستختار الرقم في الخطوة التالية.')}</p>
      {errorNote}
      <button className="layla-primary" disabled={busy} onClick={onOpen}>{tr('Connect WhatsApp', 'ربط واتساب')}<Icon name="arrow-right" size={16} className="icon-flip-rtl" /></button>
    </>}
    {!paused && !integration && !data?.selection && open && <>
      <fieldset disabled={busy}><legend>{tr('Which number should Layla answer?', 'ما الرقم الذي ستردّ عليه ليلى؟')}</legend>
        <PathChoice path={path} value={PATHS[0]} onChange={changePath}><strong>{tr('My WhatsApp Business number', 'رقم واتساب للأعمال الخاص بي')} <span className="layla-chip layla-chip--recommended">{tr('Recommended', 'موصى به')}</span></strong><small>{tr('Keep using the app on your phone. Layla answers alongside you.', 'استمر باستخدام التطبيق على هاتفك، وتردّ ليلى معك.')}</small></PathChoice>
        <SwitchToBusiness tr={tr} />
        <PathChoice path={path} value={PATHS[1]} onChange={changePath}><strong>{tr('A different number', 'رقم آخر')}</strong><small>{tr('A new number, or one already on an API. A new number needs SMS or a call.', 'رقم جديد، أو رقم مرتبط بواجهة API. يحتاج الرقم الجديد إلى رسالة SMS أو مكالمة.')}</small></PathChoice>
      </fieldset>
      {/* One line, not a checklist: everything else is asked for inside Meta's window (Ahmed, 2026-10-24). */}
      {path === 'coexistence' && <p className="layla-help layla-ready-line">{tr('Have your phone with WhatsApp Business (updated) and your Facebook login ready.', 'جهّز هاتفك وعليه واتساب للأعمال (محدّث) وتسجيل دخول فيسبوك.')}</p>}
      {!ready && <ul id="whatsapp-requirements" className="layla-checklist" aria-label={tr('Before connecting WhatsApp', 'قبل ربط واتساب')}>{requirements.map(([key, ok]) => <li key={key} data-ok={ok ? '' : undefined}>
        {/* An unmet item is never a dead end: saving to the account is one press away. */}
        {key === 'account' && !ok && data?.account && data?.accountSaveAvailable
          ? <button type="button" className="layla-secondary" disabled={busy} onClick={onClaim}>{busy ? tr('Saving your setup to your account…', 'جارٍ حفظ إعدادك في حسابك…') : tr('Save my setup to my account', 'احفظ إعدادي في حسابي')}</button>
          : labels[key]}
        <span className="ld-visually-hidden">{ok ? tr(': done', ': تم') : tr(': needed', ': مطلوب')}</span></li>)}</ul>}
      {ready && <p className="layla-help">{tr('Meta’s window opens next. Log in with the Facebook account that manages your business. Passwords and codes go only into Meta’s window.', 'ستفتح نافذة Meta. سجّل الدخول بحساب فيسبوك الذي يدير نشاطك. أدخل كلمات المرور والرموز في نافذة Meta فقط.')}</p>}
      {ready && path === 'coexistence' && <MetaWindowGuide tr={tr} phoneOnly={phoneOnly} />}
      {!ready && <p id="whatsapp-requirements-hint" className="layla-cta-hint">{tr('Complete the items above to continue.', 'أكمل البنود أعلاه للمتابعة.')}</p>}
      {errorNote}
      {ownPrepared
        ? <button className="layla-primary" disabled={busy} onClick={onConnect}>{finishing ? tr('Finishing your connection…', 'جارٍ إكمال الربط…') : busy ? tr('Complete the Meta window…', 'أكمل الخطوات في نافذة Meta…') : tr('Connect with Facebook', 'الربط عبر فيسبوك')}<Icon name="arrow-right" size={16} className="icon-flip-rtl" /></button>
        : <button className="layla-primary" disabled={busy || preparing || !ready} aria-describedby={ready ? undefined : 'whatsapp-requirements whatsapp-requirements-hint'} onClick={onPrepare}>{preparing ? tr('Getting Meta ready…', 'جارٍ تجهيز Meta…') : tr('Get Meta ready', 'تجهيز الربط مع Meta')}<Icon name="arrow-right" size={16} className="icon-flip-rtl" /></button>}
      {busy && ownPrepared && !finishing && <button className="layla-secondary" onClick={() => onCancelAttempt('meta_cancelled')}>{tr('Cancel this attempt', 'إلغاء هذه المحاولة')}</button>}
      <SetupHelpLinks tr={tr} businessName={data?.profile?.businessName} reference={data?.diagnostic?.at ? `${data.diagnostic.stage}-${data.diagnostic.at}` : ''} email={data?.account?.email} phoneOnly={phoneOnly} />
    </>}
    {integration?.path === 'new_number' && integration.status === 'registration_required' && <form autoComplete="off" onSubmit={register}>
      <p>{tr('Finish registering this separate number:', 'أكمل تسجيل هذا الرقم المنفصل:')} <bdi>+{integration.sender}</bdi></p>
      <label>{tr('Create a six-digit WhatsApp PIN', 'أنشئ رمز PIN لواتساب من ستة أرقام')}<small>{tr('Choose and save your own PIN. If this number already has a two-step verification PIN, use it. This is not an SMS code.', 'اختر رمزاً واحفظه. إذا كان للرقم رمز تحقق بخطوتين، استخدم الرمز الحالي. هذا ليس رمز SMS.')}</small><input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
      <button className="layla-primary" disabled={busy || pin.length !== 6}>{tr('Confirm this number’s registration', 'تأكيد تسجيل هذا الرقم')}</button>
    </form>}
  </section>;
}
