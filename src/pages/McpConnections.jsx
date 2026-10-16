import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/mcp.css";
import {
  McpHero,
  ConnectionGuide,
  McpWalkthrough,
  McpHelp,
  ClientMark,
  BZNSFLOW_ICON,
} from "../components/mcp/ConnectionGuide";
const COPIED_MS = 2500;
const SAVED_MS = 4000;
// While the owner is mid-connection (a new connection not yet verified, or an
// approval waiting), the page follows along without a manual reload.
const REFRESH_MS = 5000;
const REFRESH_GAP_MS = 1500;
// A permission change interrupted by account re-verification is finished on
// return instead of being asked for again.
const PENDING_POLICY_KEY = "bf_mcp_pending_policy";
const PENDING_POLICY_MS = 10 * 60000;
const DOMAINS = {
  brain: ["BznsBrain", "BznsBrain"],
  business: ["Business", "النشاط"],
  catalog: ["Catalog", "الكتالوج"],
  dashboard: ["Workspace", "مساحة العمل"],
  files: ["Files", "الملفات"],
  hasib: ["Hasib", "حاسب"],
  instagram: ["Instagram", "Instagram"],
  knowledge: ["Knowledge", "المعرفة"],
  messaging: ["Messaging", "المراسلة"],
  onboarding: ["Onboarding", "الإعداد"],
  requests: ["Requests", "الطلبات"],
  setup: ["Setup", "الإعداد"],
};
const sameSet = (a = [], b = []) =>
  a.length === b.length && a.every((v) => b.includes(v));
function readPendingPolicy() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_POLICY_KEY));
    sessionStorage.removeItem(PENDING_POLICY_KEY);
    return value && Date.now() - value.at < PENDING_POLICY_MS ? value : null;
  } catch {
    return null;
  }
}
function keepPendingPolicy(body) {
  try {
    sessionStorage.setItem(
      PENDING_POLICY_KEY,
      JSON.stringify({ ...body, at: Date.now() }),
    );
  } catch {
    // Without storage the owner simply saves again after verifying.
  }
}
const ENDPOINT = "https://www.bznsflowai.com/api/mcp";
const AREAS = {
  conversations: ["Conversations and Layla", "المحادثات وليلى"],
  customers: ["Customers", "العملاء"],
  business: ["Business knowledge and catalog", "معلومات النشاط والكتالوج"],
  marketing: ["Marketing", "التسويق"],
  operations: ["Hasib and Adiba", "حاسب وأديبة"],
  team: ["Team", "الفريق"],
  files: ["File transfers", "نقل الملفات"],
};
const RESULT_LABELS = {
  pending: ["Pending", "قيد التنفيذ"],
  completed: ["Completed", "مكتمل"],
  failed: ["Failed", "تعذّر التنفيذ"],
  outcome_unknown: ["Outcome unknown", "النتيجة غير مؤكّدة"],
  approval_required: ["Awaiting approval", "بانتظار الموافقة"],
  approved: ["Approved", "تمت الموافقة"],
  rejected: ["Rejected", "مرفوض"],
  ready: ["Ready", "جاهز"],
  cancelled: ["Cancelled", "ملغى"],
  submitted: ["Submitted", "تم الإرسال إلى المزوّد"],
  policy_changed: ["Permissions updated", "تم تحديث الصلاحيات"],
  revoked: ["Disconnected", "تم قطع الاتصال"],
};
const RESULT_TONES = {
  completed: "green",
  approved: "green",
  policy_changed: "green",
  pending: "yellow",
  approval_required: "yellow",
  ready: "yellow",
  submitted: "yellow",
};
function activityName(tool, ar) {
  if (tool === "connection") return ar ? "الاتصال" : "Connection";
  const [, domain = "", ...rest] = tool.split("_");
  const area = DOMAINS[domain]?.[ar ? 1 : 0] || domain;
  return { area, action: rest.join(" ") };
}
const CATEGORIES = {
  messages: ["Messages and campaigns", "الرسائل والحملات"],
  finance: ["Prices and financial approvals", "الأسعار والموافقات المالية"],
  bulk: ["Deletion and bulk changes", "الحذف والتعديلات الجماعية"],
  exports: ["Data exports", "تصدير البيانات"],
  team: ["Team access", "صلاحيات الفريق"],
  publish: ["Publishing, automation and channels", "النشر والأتمتة والقنوات"],
};
const ERRORS = {
  authorization_changed: [
    "The connection request changed. Reload and review the new request before continuing.",
    "تغيّر طلب الاتصال. أعد التحميل وراجع الطلب الجديد قبل المتابعة.",
  ],
  authorization_expired: [
    "This connection request expired. Start a new connection from your AI assistant.",
    "انتهت صلاحية طلب الاتصال. ابدأ اتصالًا جديدًا من مساعدك.",
  ],
  fresh_sign_in_required: [
    "Verify your account again to change permissions or connect an assistant.",
    "تحقّق من حسابك مجددًا لتغيير الصلاحيات أو ربط المساعد.",
  ],
  access_required: [
    "AI connections come with every BznsFlow plan. Your account doesn’t have an active plan yet.",
    "اتصالات الذكاء الاصطناعي متاحة مع جميع باقات BznsFlow. لا توجد باقة فعّالة في حسابك بعد.",
  ],
  manager_required: [
    "Only the business owner can manage AI connections.",
    "يمكن لمالك النشاط فقط إدارة اتصالات الذكاء الاصطناعي.",
  ],
  setup_required: [
    "Complete your business setup before connecting an assistant.",
    "أكمل إعداد نشاطك قبل ربط المساعد.",
  ],
  approval_stale: [
    "The business record changed. Ask your assistant to prepare a new request.",
    "تغيّر سجل النشاط. اطلب من مساعدك إعداد طلب جديد.",
  ],
  approval_expired: [
    "This approval expired. Ask your assistant to prepare a new request.",
    "انتهت صلاحية الطلب. اطلب من مساعدك إعداد طلب جديد.",
  ],
  mcp_disabled: [
    "AI connections are not enabled yet.",
    "اتصالات الذكاء الاصطناعي غير مفعّلة بعد.",
  ],
  mcp_oauth_not_configured: [
    "The connection service is not ready yet.",
    "خدمة الاتصال غير جاهزة بعد.",
  ],
  mcp_pilot_only: [
    "AI connections are temporarily limited. Please try again later.",
    "اتصالات الذكاء الاصطناعي محدودة مؤقتًا. حاول مرة أخرى لاحقًا.",
  ],
};
function Connection({ connection: c, ar, busy, saved, onSave, onRevoke }) {
  const [areas, setAreas] = useState(c.areas || Object.keys(AREAS)),
    [direct, setDirect] = useState(c.direct),
    [write, setWrite] = useState(c.scopes.includes("workspace:write"));
  const inactive = !!c.revokedAt || c.expiresAt < Date.now();
  const changed =
    !sameSet(areas, c.areas || Object.keys(AREAS)) ||
    !sameSet(direct, c.direct) ||
    write !== c.scopes.includes("workspace:write");
  return (
    <article className="mcp-panel">
      <div className="mcp-row">
        <div className="mcp-client">
          <ClientMark name={c.clientName} id={c.clientId} />
          <div>
            <h3>{c.clientName}</h3>
            <p className="mcp-muted">
              {inactive
                ? ar
                  ? "غير متصل"
                  : "Disconnected"
                : c.verifiedAt
                  ? ar
                    ? "اتصال مؤكّد"
                    : "Connection verified"
                  : ar
                    ? "بانتظار أول اتصال"
                    : "Waiting for first connection"}
            </p>
          </div>
        </div>
        <span
          className={`mcp-dot ${!inactive && c.verifiedAt ? "active" : ""}`}
          aria-hidden="true"
        />
      </div>
      <p className="mcp-client-id" dir="ltr">
        {c.clientId}
      </p>
      <p>
        {ar ? "آخر استخدام: " : "Last used: "}
        {c.lastUsedAt
          ? new Date(c.lastUsedAt).toLocaleString(ar ? "ar-OM" : "en-GB")
          : "—"}
      </p>
      <p>
        {ar ? "ينتهي: " : "Expires: "}
        {new Date(c.expiresAt).toLocaleDateString(ar ? "ar-OM" : "en-GB")}
      </p>
      {!inactive && (
        <>
          <fieldset disabled={busy}>
            <legend>{ar ? "صلاحيات الوصول" : "Access permissions"}</legend>
            <p>
              {ar
                ? "اختر المعلومات التي يمكن للمساعد الوصول إليها."
                : "Choose which business areas your assistant can access."}
            </p>
            {Object.entries(AREAS).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={areas.includes(key)}
                  onChange={(e) =>
                    setAreas(
                      e.target.checked
                        ? [...areas, key]
                        : areas.filter((v) => v !== key),
                    )
                  }
                />
                {label[ar ? 1 : 0]}
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={write}
                disabled={
                  !(c.grantedScopes || c.scopes).includes("workspace:write")
                }
                onChange={(e) => setWrite(e.target.checked)}
              />
              {ar
                ? "السماح بالتعديلات ضمن باقتي"
                : "Allow changes within my plan"}
            </label>
          </fieldset>
          <fieldset disabled={busy || !write}>
            <legend>
              {ar
                ? "تنفيذ مباشر بدون موافقة لكل طلب"
                : "Direct execution without approval for each request"}
            </legend>
            <p className="mcp-muted">
              {ar
                ? "الخيارات غير المحددة تتطلب موافقتك هنا قبل التنفيذ."
                : "Unchecked categories require your approval here before execution."}
            </p>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={direct.includes(key)}
                  onChange={(e) =>
                    setDirect(
                      e.target.checked
                        ? [...direct, key]
                        : direct.filter((v) => v !== key),
                    )
                  }
                />
                {label[ar ? 1 : 0]}
              </label>
            ))}
          </fieldset>
          <div className="mcp-actions">
            <button
              disabled={busy || !changed}
              onClick={() => onSave(c.id, direct, write, areas)}
            >
              {saved && !changed
                ? ar
                  ? "تم الحفظ"
                  : "Saved"
                : ar
                  ? "حفظ الصلاحيات"
                  : "Save permissions"}
            </button>
            <button
              className="mcp-secondary"
              disabled={busy}
              onClick={() => onRevoke(c.id)}
            >
              {ar ? "قطع الاتصال" : "Disconnect"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
export default function McpConnections({ lang = "ar" }) {
  const ar = lang === "ar",
    prefix = ar ? "" : "/en",
    tr = (en, arabic) => (ar ? arabic : en);
  const [endpoint, setEndpoint] = useState(ENDPOINT);
  const [account, setAccount] = useState(undefined),
    [data, setData] = useState(null),
    [consent, setConsent] = useState(null),
    [csrf, setCsrf] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(""),
    [saved, setSaved] = useState(false),
    [savedId, setSavedId] = useState(""),
    [consentAreas, setConsentAreas] = useState(Object.keys(AREAS));
  // Confirmations are brief; errors and copy guidance stay until the next action.
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(""), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => {
      setSaved(false);
      setSavedId("");
    }, SAVED_MS);
    return () => clearTimeout(timer);
  }, [saved]);
  const signIn = `${prefix}/signin?next=${encodeURIComponent(`${prefix}/mcp`)}`;
  const message = (code) =>
    (ERRORS[code] || [
      "Could not complete this request. Please try again.",
      "تعذّر إكمال الطلب. حاول مرة أخرى.",
    ])[ar ? 1 : 0];
  // `quiet` refreshes keep whatever message the owner is reading.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setError("");
    const response = await fetch("/api/auth-session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw Error("session_unavailable");
    const session = await response.json();
    setAccount(session.account);
    setCsrf(session.csrfToken || "");
    if (!session.account) {
      setData(null);
      setConsent(null);
      return;
    }
    const r = await fetch("/api/mcp/manage", {
        credentials: "same-origin",
        cache: "no-store",
      }),
      value = await r.json();
    if (!r.ok) {
      if (quiet) return;
      setData(null);
      setConsent(null);
      setError(value.reason);
      return;
    }
    setData(value);
    setCsrf(value.csrfToken || session.csrfToken);
    if (
      new URLSearchParams(window.location.search).has("interaction") ||
      value.resume
    ) {
      const c = await fetch("/api/mcp/manage?interaction=true", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const view = await c.json();
      if (c.ok) setConsent(view.interaction);
      else {
        setConsent(null);
        if (!quiet) setError(view.reason);
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window.fbq === "function") {
      window.location.reload();
      return;
    }
    setEndpoint(`${window.location.origin}/api/mcp`);
    let live = true;
    load()
      .then(() => {
        const pending = live && readPendingPolicy();
        if (pending) {
          const { at: _at, ...body } = pending;
          return action(body);
        }
        return undefined;
      })
      .catch(() => {
        if (live) {
          setAccount(null);
          setError("unavailable");
        }
      });
    return () => {
      live = false;
    };
    // `action` is recreated each render; the pending save runs once, on arrival.
  }, [load]);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const following =
    !!data &&
    !consent &&
    (data.approvals.length > 0 ||
      data.connections.some(
        (c) => !c.revokedAt && c.expiresAt > Date.now() && !c.verifiedAt,
      ));
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        busyRef.current ||
        Date.now() - last < REFRESH_GAP_MS
      )
        return;
      last = Date.now();
      load({ quiet: true }).catch(() => {});
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = following ? setInterval(refresh, REFRESH_MS) : null;
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (timer) clearInterval(timer);
    };
  }, [load, following]);
  async function action(body) {
    setBusy(true);
    setError("");
    setStatus("");
    setSaved(false);
    try {
      const r = await fetch("/api/mcp/manage", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
          body: JSON.stringify(body),
        }),
        value = await r.json();
      if (!r.ok) {
        if (
          body.action === "policy" &&
          value.reason === "fresh_sign_in_required"
        )
          keepPendingPolicy(body);
        setError(value.reason);
        return;
      }
      if (value.redirect) {
        const next = new URL(value.redirect, window.location.origin);
        if (
          next.origin !== window.location.origin ||
          !next.pathname.startsWith("/oauth/")
        )
          throw Error("invalid_redirect");
        window.location.assign(next.href);
        return;
      }
      setSaved(true);
      if (body.action === "policy") setSavedId(body.connectionId);
      await load();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function copy(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setStatus(
        tr("Select and copy the text below.", "حدّد النص أدناه وانسخه."),
      );
    }
  }
  return (
    <main className="mcp-page" dir={ar ? "rtl" : "ltr"} lang={lang}>
      <nav
        className="mcp-nav"
        aria-label={tr("Account navigation", "روابط الحساب")}
      >
        <Link to={prefix || "/"} className="mcp-brand">
          <img src={BZNSFLOW_ICON} width="36" height="36" alt="" />
          BznsFlow
        </Link>
        <div>
          <Link to={`${prefix}/layla/dashboard`}>
            {tr("My workspace", "مساحة عملي")}
          </Link>
          <Link to={`${ar ? "/en" : ""}/mcp`}>
            {ar ? "English" : "العربية"}
          </Link>
        </div>
      </nav>
      <McpHero ar={ar} compact={!!consent || !!data?.approvals?.length} />
      <div role="status" aria-live="polite">
        {status}
        {saved && tr("Saved.", "تم الحفظ.")}
        {copied && (
          <span className="sr-only">
            {tr(`${copied} copied.`, `تم نسخ ${copied}.`)}
          </span>
        )}
        {account === undefined &&
          tr("Loading your account…", "جارٍ تحميل حسابك…")}
      </div>
      {error && (
        <div className="mcp-notice" role="alert">
          {message(error)}{" "}
          {error === "fresh_sign_in_required" ? (
            <a href={`${signIn}&fresh=1`}>
              {tr("Verify account", "التحقق من الحساب")}
            </a>
          ) : error === "access_required" ? (
            <a href={`${prefix || ""}/#tiers`}>
              {tr("See plans", "اطّلع على الباقات")}
            </a>
          ) : (
            <button
              className="mcp-secondary"
              onClick={() => load().catch(() => setError("unavailable"))}
            >
              {tr("Try again", "حاول مجددًا")}
            </button>
          )}
        </div>
      )}
      {account === null && (
        <section className="mcp-panel">
          <h2>
            {tr("Connect with your BznsFlow account", "اتصل بحساب BznsFlow")}
          </h2>
          <p>
            {tr(
              "Sign in as the business owner to choose what your assistant can access.",
              "سجّل الدخول بصفتك مالك النشاط لاختيار ما يمكن لمساعدك الوصول إليه.",
            )}
          </p>
          <a className="mcp-button" href={signIn}>
            {tr("Sign in to connect", "سجّل الدخول للاتصال")}
          </a>
        </section>
      )}
      {data?.enabled === false && (
        <p className="mcp-notice">{message("mcp_disabled")}</p>
      )}
      {consent && (
        <section className="mcp-panel mcp-consent">
          <div className="mcp-consent-pair" aria-hidden="true">
            <ClientMark
              name={consent.clientName}
              id={consent.clientId}
              size={48}
            />
            <span className="mcp-consent-link" />
            <img
              className="mcp-client-mark"
              src={BZNSFLOW_ICON}
              width="48"
              height="48"
              alt=""
            />
          </div>
          <p className="mcp-eyebrow">{tr("CONNECTION REQUEST", "طلب اتصال")}</p>
          <h2>
            {tr(`Connect ${consent.clientName}?`, `ربط ${consent.clientName}؟`)}
          </h2>
          <p>
            {tr(
              `You are authorizing access to ${account?.email}'s business.`,
              `أنت تمنح الوصول إلى نشاط ${account?.email}.`,
            )}
          </p>
          <p dir="ltr" className="mcp-client-id">
            {consent.clientId}
          </p>
          <p>
            {tr(
              "Your assistant can receive business and customer information returned by the tools you authorize. That information is handled by your chosen AI service.",
              "يمكن لمساعدك تلقي معلومات النشاط والعملاء التي تُرجعها الأدوات المصرّح بها. تتعامل خدمة الذكاء الاصطناعي التي تختارها مع هذه المعلومات.",
            )}
          </p>
          <fieldset disabled={busy}>
            <legend>{tr("Allow access to", "السماح بالوصول إلى")}</legend>
            {Object.entries(AREAS).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={consentAreas.includes(key)}
                  onChange={(e) =>
                    setConsentAreas(
                      e.target.checked
                        ? [...consentAreas, key]
                        : consentAreas.filter((v) => v !== key),
                    )
                  }
                />
                {label[ar ? 1 : 0]}
              </label>
            ))}
          </fieldset>
          <ul>
            <li>
              {tr(
                "Read information permitted by your plan.",
                "قراءة المعلومات المسموح بها ضمن باقتك.",
              )}
            </li>
            {consent.scopes.includes("workspace:write") && (
              <li>
                {tr(
                  "Make routine edits and prepare important actions for your approval.",
                  "إجراء تعديلات اعتيادية وإعداد الإجراءات المهمة لموافقتك.",
                )}
              </li>
            )}
          </ul>
          <p>
            {tr(
              "Access lasts up to 30 days and can renew automatically within that period. You can change permissions or disconnect at any time.",
              "يستمر الوصول لمدة تصل إلى ٣٠ يومًا مع تجديد تلقائي خلالها. يمكنك تعديل الصلاحيات أو قطع الاتصال في أي وقت.",
            )}
          </p>
          <div className="mcp-actions">
            <button
              disabled={busy}
              onClick={() =>
                action({
                  action: "consent",
                  allow: true,
                  areas: consentAreas,
                  interactionUid: consent.uid,
                })
              }
            >
              {tr("Continue with this account", "المتابعة بهذا الحساب")}
            </button>
            <button
              className="mcp-secondary"
              disabled={busy}
              onClick={() =>
                action({
                  action: "consent",
                  allow: false,
                  interactionUid: consent.uid,
                })
              }
            >
              {tr("Decline", "رفض")}
            </button>
          </div>
        </section>
      )}
      {data && (
        <>
          <section className="mcp-section">
            <h2>{tr("Waiting for your approval", "بانتظار موافقتك")}</h2>
            {!data.approvals.length && (
              <p>
                {tr("No pending approvals.", "لا توجد طلبات بانتظار الموافقة.")}
              </p>
            )}
            {data.approvals.map((a) => (
              <article id={`approval-${a.id}`} className="mcp-panel" key={a.id}>
                <h3 dir="ltr">
                  {a.tool.replace(/^bznsflow_/, "").replaceAll("_", " ")}
                </h3>
                <p>
                  {tr(
                    "Review the exact changes below. After approving, ask your assistant to retry the same request.",
                    "راجع التعديلات أدناه. بعد الموافقة اطلب من مساعدك إعادة المحاولة بالطلب نفسه.",
                  )}
                </p>
                <p>
                  {tr("Expires: ", "ينتهي: ")}
                  {new Date(a.expiresAt).toLocaleTimeString(
                    ar ? "ar-OM" : "en-GB",
                  )}
                </p>
                <pre dir="auto">{JSON.stringify(a.args, null, 2)}</pre>
                {a.preview && (
                  <details>
                    <summary>
                      {tr(
                        "Included records and permissions",
                        "السجلات والصلاحيات المشمولة",
                      )}
                    </summary>
                    <pre dir="auto">{JSON.stringify(a.preview, null, 2)}</pre>
                  </details>
                )}
                <div className="mcp-actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      action({
                        action: "approve",
                        connectionId: a.connectionId,
                        runId: a.id,
                      })
                    }
                  >
                    {tr("Approve this action", "الموافقة على الإجراء")}
                  </button>
                  <button
                    className="mcp-secondary"
                    disabled={busy}
                    onClick={() =>
                      action({
                        action: "reject",
                        connectionId: a.connectionId,
                        runId: a.id,
                      })
                    }
                  >
                    {tr("Reject", "رفض")}
                  </button>
                </div>
              </article>
            ))}
          </section>
          <section className="mcp-section">
            <h2>{tr("Your connections", "اتصالاتك")}</h2>
            <p>
              {tr("Workspace: ", "مساحة العمل: ")}
              {data.workspace?.name || account?.email}
            </p>
            <p className="mcp-muted">
              {tr(
                "A connection is verified after your assistant successfully reaches BznsFlow.",
                "يُؤكّد الاتصال بعد وصول مساعدك بنجاح إلى BznsFlow.",
              )}
            </p>
            {!data.connections.length && (
              <p className="mcp-panel">
                {tr(
                  "No assistants connected yet. Follow the setup guide below.",
                  "لم يُربط أي مساعد بعد. اتبع دليل الربط أدناه.",
                )}
              </p>
            )}
            <div className="mcp-grid">
              {data.connections.map((c) => (
                <Connection
                  key={`${c.id}-${c.version}`}
                  connection={c}
                  ar={ar}
                  busy={busy}
                  saved={savedId === c.id}
                  onSave={(connectionId, direct, write, areas) =>
                    action({
                      action: "policy",
                      connectionId,
                      direct,
                      areas,
                      scopes: write
                        ? ["workspace:read", "workspace:write"]
                        : ["workspace:read"],
                    })
                  }
                  onRevoke={(connectionId) =>
                    action({ action: "revoke", connectionId })
                  }
                />
              ))}
            </div>
          </section>
          <section className="mcp-section">
            <h2>{tr("Recent activity", "النشاط الأخير")}</h2>
            {!data.activity.length ? (
              <p>
                {tr(
                  "Activity appears here when an assistant uses your workspace.",
                  "يظهر النشاط هنا عندما يستخدم المساعد مساحة عملك.",
                )}
              </p>
            ) : (
              <ul className="mcp-activity">
                {data.activity.map((a) => {
                  const client = data.connections.find(
                    (c) => c.id === a.connectionId,
                  );
                  const name = activityName(a.tool, ar);
                  const result =
                    RESULT_LABELS[a.status] || RESULT_LABELS.failed;
                  return (
                    <li key={a._id}>
                      <ClientMark
                        name={client?.clientName}
                        id={client?.clientId}
                        size={24}
                      />
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
                      <span
                        className="mcp-result"
                        data-tone={RESULT_TONES[a.status] || "red"}
                        title={a.status}
                      >
                        {result[ar ? 1 : 0]}
                      </span>
                      <time dateTime={new Date(a.at).toISOString()}>
                        {new Date(a.at).toLocaleString(ar ? "ar-OM" : "en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
      <ConnectionGuide
        ar={ar}
        endpoint={endpoint}
        copy={copy}
        copied={copied}
      />
      <McpWalkthrough ar={ar} />
      <McpHelp ar={ar} />
      <footer className="mcp-footer">
        <p>
          {tr(
            "Your existing plan and business rules apply to every connected assistant.",
            "تسري باقتك الحالية وقواعد نشاطك على كل مساعد متصل.",
          )}
        </p>
        <p>
          {tr(
            "Claude and Claude Code are Anthropic products. Codex is an OpenAI product. Their marks identify the connection options; no endorsement is implied.",
            "Claude وClaude Code من منتجات Anthropic، وCodex من منتجات OpenAI. تُستخدم الشعارات للتعريف بخيارات الاتصال ولا تعني اعتمادًا من هذه الشركات.",
          )}
        </p>
        <Link to={`${prefix}/privacy`}>{tr("Privacy", "الخصوصية")}</Link>
      </footer>
    </main>
  );
}
