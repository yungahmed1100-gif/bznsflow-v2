import React, { useEffect, useRef } from "react";

// Fields that identify the request itself rather than the change the owner is approving.
const HIDDEN_FIELDS = new Set(["requestId", "idempotencyKey"]);
const VALUE_MAX = 140;

/** One argument as a short readable value; nested data stays in the full details below. */
function shortValue(value, ar) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No";
  if (Array.isArray(value)) return ar ? `${value.length} عنصر` : `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return ar ? `${keys.length} حقول` : `${keys.length} field${keys.length === 1 ? "" : "s"}`;
  }
  const text = String(value);
  return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX)}…` : text;
}

const fieldLabel = (key) =>
  key
    .replace(/Minor$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();

/**
 * An approval as the owner reads it: what the assistant wants to do, the records and
 * values involved, then the exact request for anyone who wants to check it.
 */
export function ApprovalCard({ approval: a, ar, busy, target, title, categories, notice, identity, onApprove, onReject }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const heading = useRef(null);
  useEffect(() => {
    if (!target || !heading.current) return;
    heading.current.closest("article")?.scrollIntoView({ block: "start", behavior: "smooth" });
    heading.current.focus({ preventScroll: true });
  }, [target]);
  const fields = Object.entries(a.args || {}).filter(([k]) => !HIDDEN_FIELDS.has(k));
  const records = (a.preview?.records || []).flatMap((r) => r.summaries || []);
  const contacts = a.preview?.contacts?.length;
  const exported = a.preview?.exportRecords;
  const minutes = Math.max(0, Math.round((a.expiresAt - Date.now()) / 60000));
  return (
    <article
      id={`approval-${a.id}`}
      className={`mcp-panel mcp-approval${target ? " is-target" : ""}`}
    >
      <h3 ref={heading} tabIndex={-1}>
        {title}
      </h3>
      {!!categories.length && (
        <ul className="mcp-tags" aria-label={tr("Why approval is needed", "سبب طلب الموافقة")}>
          {categories.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {(records.length > 0 || contacts || exported !== undefined) && (
        <p>
          {records.length > 0 && (
            <>
              {tr("Records: ", "السجلات: ")}
              <bdi>{records.slice(0, 5).map((r) => r.label).join("، ")}</bdi>
              {records.length > 5 && tr(` and ${records.length - 5} more`, ` و${records.length - 5} أخرى`)}
            </>
          )}
          {contacts ? tr(` ${contacts} contacts to import.`, ` ${contacts} جهة اتصال للاستيراد.`) : null}
          {exported !== undefined ? tr(` ${exported} records to export.`, ` ${exported} سجل للتصدير.`) : null}
        </p>
      )}
      {fields.length > 0 && (
        <dl className="mcp-fields">
          {fields.slice(0, 8).map(([k, v]) => (
            <div key={k}>
              <dt dir="ltr">{fieldLabel(k)}</dt>
              <dd dir="auto">{shortValue(v, ar)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mcp-muted">
        {tr(
          `Expires in ${minutes} min. After approving, ask your assistant to retry the same request.`,
          `ينتهي خلال ${minutes} دقيقة. بعد الموافقة اطلب من مساعدك إعادة المحاولة بالطلب نفسه.`,
        )}
      </p>
      <details>
        <summary>{tr("Exact request", "الطلب كما أُرسل")}</summary>
        <pre dir="ltr">{JSON.stringify({ args: a.args, preview: a.preview }, null, 2)}</pre>
      </details>
      {notice}
      {identity || (
        <div className="mcp-actions">
          <button disabled={busy} onClick={onApprove}>
            {tr("Approve this action", "الموافقة على الإجراء")}
          </button>
          <button className="mcp-secondary" disabled={busy} onClick={onReject}>
            {tr("Reject", "رفض")}
          </button>
        </div>
      )}
    </article>
  );
}
