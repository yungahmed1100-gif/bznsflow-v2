import React, { useState } from 'react';
import { ClientMark } from './ConnectionGuide';
import { AREAS, CATEGORIES, DAY_MS, DONE, RENEW_SOON_DAYS, sameSet } from './copy';

const WRITE = 'workspace:write';
const toggle = (list, key, on) => (on ? [...list, key] : list.filter(v => v !== key));

function Checklist({ options, chosen, onChange, ar }) {
  return Object.entries(options).map(([key, label]) => (
    <label key={key}>
      <input
        type="checkbox"
        checked={chosen.includes(key)}
        onChange={e => onChange(toggle(chosen, key, e.target.checked))}
      />
      {label[ar ? 1 : 0]}
    </label>
  ));
}

function Expiry({ expiresAt, ar }) {
  const days = Math.max(0, Math.ceil((expiresAt - Date.now()) / DAY_MS));
  return (
    <>
      <p>
        {ar ? 'ينتهي: ' : 'Expires: '}
        {new Date(expiresAt).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}
        <span className="mcp-muted">
          {' · '}
          {ar ? `بعد ${days} يوم` : `in ${days} day${days === 1 ? '' : 's'}`}
        </span>
      </p>
      {expiresAt - Date.now() < RENEW_SOON_DAYS * DAY_MS && (
        <p className="mcp-notice">
          {ar
            ? 'ينتهي هذا الاتصال قريبًا. أعد الربط من مساعدك لمتابعة الاستخدام.'
            : 'This connection ends soon. Reconnect from your assistant to keep using it.'}
        </p>
      )}
    </>
  );
}

/** Disconnecting asks once more, inline, before anything is sent. */
function DisconnectButton({ name, ar, busy, onRevoke }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button className="mcp-secondary" disabled={busy} onClick={() => setConfirming(true)}>
        {ar ? 'قطع الاتصال' : 'Disconnect'}
      </button>
    );
  return (
    <span className="mcp-confirm" role="group" aria-label={ar ? 'تأكيد قطع الاتصال' : 'Confirm disconnect'}>
      <span>{ar ? `قطع ${name}؟` : `Disconnect ${name}?`}</span>
      <button className="mcp-danger" disabled={busy} onClick={onRevoke}>
        {ar ? 'نعم، اقطع الاتصال' : 'Yes, disconnect'}
      </button>
      <button className="mcp-secondary" disabled={busy} onClick={() => setConfirming(false)}>
        {ar ? 'تراجع' : 'Keep connected'}
      </button>
    </span>
  );
}

/**
 * One active assistant connection: its status, permissions and execution policy.
 * `notice` (a refusal) belongs to this card's own Save or Disconnect, so it appears here.
 */
export function ConnectionCard({ connection: c, ar, busy, saved, notice, onSave, onRevoke }) {
  const initialAreas = c.areas || Object.keys(AREAS);
  const [areas, setAreas] = useState(initialAreas),
    [direct, setDirect] = useState(c.direct),
    [write, setWrite] = useState(c.scopes.includes(WRITE));
  const changed = !sameSet(areas, initialAreas) || !sameSet(direct, c.direct) || write !== c.scopes.includes(WRITE);
  return (
    <article className="mcp-panel">
      <div className="mcp-row">
        <div className="mcp-client">
          <ClientMark name={c.clientName} id={c.clientId} />
          <div>
            <h3>{c.clientName}</h3>
            <p className="mcp-muted">
              {c.verifiedAt
                ? ar
                  ? 'اتصال مؤكّد'
                  : 'Connection verified'
                : ar
                  ? 'بانتظار أول اتصال'
                  : 'Waiting for first connection'}
            </p>
          </div>
        </div>
        <span className={`mcp-dot ${c.verifiedAt ? 'active' : ''}`} aria-hidden="true" />
      </div>
      <p className="mcp-client-id" dir="ltr">
        {c.clientId}
      </p>
      <p>
        {ar ? 'آخر استخدام: ' : 'Last used: '}
        {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString(ar ? 'ar-OM' : 'en-GB') : '—'}
      </p>
      <Expiry expiresAt={c.expiresAt} ar={ar} />
      <fieldset disabled={busy}>
        <legend>{ar ? 'صلاحيات الوصول' : 'Access permissions'}</legend>
        <p>
          {ar
            ? 'اختر المعلومات التي يمكن للمساعد الوصول إليها.'
            : 'Choose which business areas your assistant can access.'}
        </p>
        <Checklist options={AREAS} chosen={areas} onChange={setAreas} ar={ar} />
        <label>
          <input
            type="checkbox"
            checked={write}
            disabled={!(c.grantedScopes || c.scopes).includes(WRITE)}
            onChange={e => setWrite(e.target.checked)}
          />
          {ar ? 'السماح بالتعديلات ضمن باقتي' : 'Allow changes within my plan'}
        </label>
      </fieldset>
      <fieldset disabled={busy || !write}>
        <legend>{ar ? 'تنفيذ مباشر بدون موافقة لكل طلب' : 'Direct execution without approval for each request'}</legend>
        <p className="mcp-muted">
          {ar
            ? 'كل الفئات تُنفَّذ مباشرة. أزل التحديد عن فئة لتوافق على طلباتها هنا أولًا.'
            : 'Every category runs directly. Uncheck one to approve its requests here first.'}
        </p>
        <Checklist options={CATEGORIES} chosen={direct} onChange={setDirect} ar={ar} />
      </fieldset>
      {notice}
      <div className="mcp-actions">
        <button disabled={busy || !changed} onClick={() => onSave(c.id, direct, write, areas)}>
          {saved && !changed ? (ar ? 'تم الحفظ' : 'Saved') : ar ? 'حفظ الصلاحيات' : 'Save permissions'}
        </button>
        <DisconnectButton name={c.clientName} ar={ar} busy={busy} onRevoke={() => onRevoke(c.id)} />
      </div>
      <p className="mcp-card-status" role="status" aria-live="polite">
        {saved && !changed ? DONE.policy[ar ? 1 : 0] : ''}
      </p>
    </article>
  );
}
