import React from "react";
import { ClientMark } from "./ConnectionGuide";
import { RESULT_LABELS, RESULT_TONES, activityName } from "./copy";

const when = (at, ar) =>
  new Date(at).toLocaleString(ar ? "ar-OM" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Recent assistant activity: which assistant, what it did, and the outcome. */
export function ActivityList({ activity, connections, ar }) {
  return (
    <section className="mcp-section">
      <h2>{ar ? "النشاط الأخير" : "Recent activity"}</h2>
      {!activity.length ? (
        <p>
          {ar
            ? "يظهر النشاط هنا عندما يستخدم المساعد مساحة عملك."
            : "Activity appears here when an assistant uses your workspace."}
        </p>
      ) : (
        <ul className="mcp-activity">
          {activity.map((a) => {
            const client = connections.find((c) => c.id === a.connectionId);
            const name = activityName(a.tool, ar);
            const result = RESULT_LABELS[a.status] || RESULT_LABELS.failed;
            return (
              <li key={a._id}>
                <ClientMark name={client?.clientName} id={client?.clientId} size={24} />
                <span className="mcp-activity-name">
                  {typeof name === "string" ? (
                    name
                  ) : (
                    <>
                      <b>{name.area}</b>
                      <span dir="ltr">{name.action}</span>
                    </>
                  )}
                </span>
                <span className="mcp-result" data-tone={RESULT_TONES[a.status] || "red"} title={a.status}>
                  {result[ar ? 1 : 0]}
                </span>
                <time dateTime={new Date(a.at).toISOString()}>{when(a.at, ar)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Disconnected and expired connections, folded away below the active ones. */
export function PastConnections({ connections, ar }) {
  if (!connections.length) return null;
  return (
    <details className="mcp-past">
      <summary>
        {ar ? "الاتصالات السابقة" : "Past connections"} ({connections.length})
      </summary>
      <ul>
        {connections.map((c) => (
          <li key={c.id}>
            <ClientMark name={c.clientName} id={c.clientId} size={24} />
            <span>{c.clientName}</span>
            <span className="mcp-muted">
              {c.revokedAt ? (ar ? "قُطع في " : "Disconnected ") : ar ? "انتهى في " : "Expired "}
              {new Date(c.revokedAt || c.expiresAt).toLocaleDateString(ar ? "ar-OM" : "en-GB")}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
