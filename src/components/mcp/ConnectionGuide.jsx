import React, { useState } from "react";

const CLIENTS = [
  { id: "claude", name: "Claude", logo: "/mcp/claude.svg" },
  { id: "claude-code", name: "Claude Code", logo: "/mcp/claude.svg" },
  { id: "codex", name: "Codex", logo: "/mcp/openai.png" },
];

export function McpHero({ ar, compact = false }) {
  return (
    <header className={`mcp-hero${compact ? " mcp-hero-compact" : ""}`}>
      <div>
        <p className="mcp-eyebrow">
          {ar ? "اتصالات الذكاء الاصطناعي" : "AI CONNECTIONS"}
        </p>
        <h1>
          {ar
            ? "أدر نشاطك من مساعدك الذكي."
            : "Your business. One conversation away."}
        </h1>
        <p>
          {ar
            ? "اربط Claude أو Codex بحساب BznsFlow. اسأل عن عملائك، حدّث بيانات نشاطك، وراجع الإجراءات المهمة قبل تنفيذها."
            : "Connect Claude or Codex to BznsFlow. Ask about your customers, update your business records, and review important actions before they run."}
        </p>
        <a className="mcp-button" href="#mcp-connect">
          {ar ? "اختر مساعدك وابدأ" : "Choose your assistant"}
          <span aria-hidden="true"> ↗</span>
        </a>
        <p className="mcp-hero-note">
          {ar
            ? "باقتك الحالية. الصلاحيات التي تختارها. والتحكم لك."
            : "Your existing plan. Your chosen permissions. You stay in control."}
        </p>
      </div>
      {!compact && (
        <figure className="mcp-art">
          <picture>
            <source
              type="image/avif"
              srcSet="/mcp/raqib-ai-480.avif 480w, /mcp/raqib-ai-960.avif 960w, /mcp/raqib-ai-1536.avif 1536w"
              sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1200px) 50vw, 560px"
            />
            <img
              src="/mcp/raqib-ai-960.webp"
              srcSet="/mcp/raqib-ai-480.webp 480w, /mcp/raqib-ai-960.webp 960w, /mcp/raqib-ai-1536.webp 1536w"
              sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1200px) 50vw, 560px"
              width="1536"
              height="1024"
              fetchPriority="high"
              decoding="async"
              alt={
                ar
                  ? "رقيب يتحدث مع مساعد ذكي ويراجع طلبًا على جهازه اللوحي"
                  : "Raqib talks with an AI assistant and reviews a request on his tablet"
              }
            />
          </picture>
          <figcaption>
            {ar
              ? "تحدّث بطريقتك. وراجع النتيجة في مساحة عملك."
              : "Ask in your own words. See the result in your workspace."}
          </figcaption>
        </figure>
      )}
    </header>
  );
}

export function ConnectionGuide({ ar, endpoint, copy, copied }) {
  const [client, setClient] = useState("claude");
  const tr = (en, arabic) => (ar ? arabic : en);
  const instructions =
    client === "claude"
      ? [
          [
            tr("Open Claude’s connectors", "افتح إعدادات الاتصال في Claude"),
            tr(
              "In Claude, open Customize → Connectors → Add → Add custom connector. For a Team or Enterprise account, an organization owner may need to add it first.",
              "في Claude، افتح Customize ثم Connectors ثم Add ثم Add custom connector. إذا كنت تستخدم حساب فريق أو مؤسسة، قد يحتاج مالك المؤسسة إلى إضافته أولًا.",
            ),
          ],
          [
            tr(
              "Name it BznsFlow and paste the address",
              "سمّه BznsFlow والصق الرابط",
            ),
            tr(
              "Copy the address below into the server URL field, then continue. Choose “Sign in now” and Claude’s published identity when offered. You do not need an API key.",
              "انسخ الرابط أدناه إلى خانة رابط الخادم ثم تابع. اختر Sign in now وهوية Claude المنشورة إذا ظهر هذا الخيار. لا تحتاج إلى مفتاح API.",
            ),
          ],
          [
            tr("Sign in and choose permissions", "سجّل الدخول واختر الصلاحيات"),
            tr(
              "A BznsFlow page opens. Sign in with your business owner account, check the requested information, and continue. Important actions require your approval by default.",
              "تفتح صفحة BznsFlow. سجّل الدخول بحساب مالك النشاط، وراجع المعلومات المطلوبة، ثم تابع. الإجراءات المهمة تحتاج إلى موافقتك افتراضيًا.",
            ),
          ],
          [
            tr(
              "Enable BznsFlow in your conversation",
              "فعّل BznsFlow في المحادثة",
            ),
            tr(
              "Return to Claude. Open + → Connectors in a conversation and enable BznsFlow. Try the sample request below, then check that your connection is verified on this page.",
              "ارجع إلى Claude. افتح + ثم Connectors داخل المحادثة وفعّل BznsFlow. جرّب الطلب أدناه، ثم تأكّد من ظهور اتصال مؤكّد في هذه الصفحة.",
            ),
          ],
        ]
      : [
          [
            tr("Open your terminal", "افتح نافذة الأوامر"),
            tr(
              `These steps are for the installed ${client === "codex" ? "Codex" : "Claude Code"} command-line app. For a browser-only setup, choose Claude above.`,
              `هذه الخطوات لتطبيق ${client === "codex" ? "Codex" : "Claude Code"} المثبّت عبر سطر الأوامر. للربط من المتصفح فقط، اختر Claude أعلاه.`,
            ),
          ],
          [
            tr("Add BznsFlow", "أضف BznsFlow"),
            tr(
              "Copy and run the add command below.",
              "انسخ أمر الإضافة أدناه ونفّذه.",
            ),
          ],
          [
            tr("Sign in through your browser", "سجّل الدخول عبر المتصفح"),
            client === "codex"
              ? tr(
                  "Run the login command below. Sign in as the owner and review permissions in the browser window that opens.",
                  "نفّذ أمر تسجيل الدخول أدناه. سجّل الدخول بصفتك المالك وراجع الصلاحيات في نافذة المتصفح التي تفتح.",
                )
              : tr(
                  "Open Claude Code, enter /mcp, choose bznsflow, and select Authenticate. Sign in as the owner and review permissions in your browser.",
                  "افتح Claude Code وأدخل ‎/mcp، ثم اختر bznsflow ثم Authenticate. سجّل الدخول بصفتك المالك وراجع الصلاحيات في المتصفح.",
                ),
          ],
          [
            tr("Try a first request", "جرّب طلبك الأول"),
            tr(
              "Start a conversation and ask for your workspace summary. A verified connection appears here after your assistant reaches BznsFlow.",
              "ابدأ محادثة واطلب ملخّص مساحة عملك. يظهر اتصال مؤكّد هنا بعد وصول مساعدك إلى BznsFlow.",
            ),
          ],
        ];
  const commands =
    client === "claude"
      ? [[tr("Connection address", "رابط الاتصال"), endpoint]]
      : client === "codex"
        ? [
            [
              tr("1. Add BznsFlow", "١. أضف BznsFlow"),
              `codex mcp add bznsflow --url ${endpoint}`,
            ],
            [
              tr("2. Sign in", "٢. سجّل الدخول"),
              "codex mcp login bznsflow --scopes workspace:read,workspace:write",
            ],
          ]
        : [
            [
              tr("Add BznsFlow", "أضف BznsFlow"),
              `claude mcp add --transport http --scope user bznsflow ${endpoint}`,
            ],
          ];
  function moveTab(event, index) {
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = CLIENTS.length - 1;
    else if (["ArrowRight", "ArrowLeft"].includes(event.key)) {
      const direction = (event.key === "ArrowRight" ? 1 : -1) * (ar ? -1 : 1);
      next = (index + direction + CLIENTS.length) % CLIENTS.length;
    } else return;
    event.preventDefault();
    setClient(CLIENTS[next].id);
    document.getElementById(`mcp-tab-${CLIENTS[next].id}`)?.focus();
  }
  return (
    <section className="mcp-guide" aria-labelledby="mcp-connect">
      <div className="mcp-section-heading">
        <p className="mcp-eyebrow">{tr("START HERE", "ابدأ هنا")}</p>
        <h2 id="mcp-connect">{tr("Connect your assistant", "اربط مساعدك")}</h2>
        <p>
          {tr(
            "Choose the app you use. We’ll walk you through the connection.",
            "اختر التطبيق الذي تستخدمه. واتبع الخطوات لربطه بحسابك.",
          )}
        </p>
      </div>
      <div
        className="mcp-client-tabs"
        role="tablist"
        aria-label={tr("Choose your assistant", "اختر مساعدك")}
      >
        {CLIENTS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            id={`mcp-tab-${c.id}`}
            aria-controls={`mcp-guide-${c.id}`}
            aria-selected={client === c.id}
            tabIndex={client === c.id ? 0 : -1}
            onClick={() => setClient(c.id)}
            onKeyDown={(e) => moveTab(e, i)}
          >
            <img src={c.logo} width="32" height="32" alt="" />
            <span>
              <b dir="ltr">{c.name}</b>
              <small>
                {c.id === "claude"
                  ? tr("Browser · easiest start", "المتصفح · البداية الأسهل")
                  : c.id === "codex"
                    ? tr("OpenAI · command line", "OpenAI · سطر الأوامر")
                    : tr("Advanced · command line", "متقدم · سطر الأوامر")}
              </small>
            </span>
          </button>
        ))}
      </div>
      <div
        className="mcp-guide-body"
        role="tabpanel"
        id={`mcp-guide-${client}`}
        aria-labelledby={`mcp-tab-${client}`}
        tabIndex={0}
      >
        <ol className="mcp-instructions">
          {instructions.map(([title, description], i) => (
            <li key={title}>
              <span className="mcp-step-number" aria-hidden="true">
                {(i + 1).toLocaleString(ar ? "ar-OM" : "en-GB")}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <aside
          className="mcp-connection-details"
          aria-label={tr("Details to copy", "تفاصيل للنسخ")}
        >
          {commands.map(([label, command]) => (
            <div className="mcp-command" key={label}>
              <h3>{label}</h3>
              <pre dir="ltr">
                <code>{command}</code>
              </pre>
              <button
                type="button"
                className="mcp-secondary"
                onClick={() => copy(label, command)}
              >
                {copied === label
                  ? tr("Copied", "تم النسخ")
                  : tr("Copy", "نسخ")}
                <span className="sr-only"> {label}</span>
              </button>
            </div>
          ))}
          <div className="mcp-first-request">
            <p className="mcp-eyebrow">
              {tr("YOUR FIRST REQUEST", "طلبك الأول")}
            </p>
            <p>
              {tr(
                "“Show me a summary of my BznsFlow workspace. Don’t change anything.”",
                "«اعرض لي ملخّص مساحة عملي في BznsFlow، دون تعديل أي شيء.»",
              )}
            </p>
            <button
              type="button"
              className="mcp-secondary"
              onClick={() =>
                copy(
                  tr("Sample request", "الطلب التجريبي"),
                  tr(
                    "Show me a summary of my BznsFlow workspace. Don't change anything.",
                    "اعرض لي ملخّص مساحة عملي في BznsFlow، دون تعديل أي شيء.",
                  ),
                )
              }
            >
              {copied === tr("Sample request", "الطلب التجريبي")
                ? tr("Copied", "تم النسخ")
                : tr("Copy request", "نسخ الطلب")}
            </button>
          </div>
          {client === "claude" && (
            <a
              className="mcp-help-link"
              href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("Claude’s connection guide ↗", "دليل الاتصال من Claude ↗")}
            </a>
          )}
        </aside>
      </div>
    </section>
  );
}

export function McpWalkthrough({ ar }) {
  const [step, setStep] = useState(0);
  const steps = ar
    ? [
        [
          "اربط",
          "اختر ما يمكن للمساعد الوصول إليه.",
          "تمنح الوصول بحسابك. ويمكنك قطعه في أي وقت.",
        ],
        [
          "اسأل",
          "اكتب طلبك بلغتك المعتادة.",
          "«ابحث عن العميل أحمد واعرض بياناته، دون تعديل.»",
        ],
        [
          "راجع",
          "وافق على الإجراءات المهمة.",
          "إذا احتاج الطلب إلى موافقة، راجع تفاصيله هنا قبل تنفيذه.",
        ],
        [
          "تابع النتيجة",
          "اعرف ما اكتمل وما زال قيد التنفيذ.",
          "راجع النشاط في مساحة عملك. الطلب قيد التنفيذ لا يعني أنه اكتمل.",
        ],
      ]
    : [
        [
          "Connect",
          "Choose what your assistant can access.",
          "You authorize access with your account. Disconnect whenever you need.",
        ],
        [
          "Ask",
          "Use your own words.",
          "“Find Ahmed’s customer record and show me the details. Don’t change anything.”",
        ],
        [
          "Review",
          "Approve important actions.",
          "When a request needs approval, review its exact details here before it runs.",
        ],
        [
          "See results",
          "Know what finished and what is pending.",
          "Review activity in your workspace. A pending request is not a completed action.",
        ],
      ];
  return (
    <section className="mcp-walkthrough" aria-labelledby="mcp-how">
      <h2 id="mcp-how">
        {ar ? "من طلبك إلى النتيجة" : "From your request to a result"}
      </h2>
      <ol>
        {steps.map(([label, description], i) => (
          <li key={label}>
            <button
              type="button"
              className="mcp-flow-step"
              aria-pressed={step === i}
              onClick={() => setStep(i)}
            >
              <span className="mcp-step-number" aria-hidden="true">
                {(i + 1).toLocaleString(ar ? "ar-OM" : "en-GB")}
              </span>
              <b>{label}</b>
              <span>{description}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mcp-flow-example" key={step} aria-live="polite">
        {steps[step][2]}
      </p>
    </section>
  );
}

export function McpHelp({ ar }) {
  const entries = ar
    ? [
        [
          "لا يظهر خيار إضافة اتصال في Claude",
          "راجع إعدادات Connectors ونوع حسابك. في حسابات الفرق والمؤسسات، قد يحتاج مالك المؤسسة إلى إضافة الاتصال أولًا. راجع دليل Claude أعلاه لمعرفة الخيارات المتاحة لحسابك.",
        ],
        [
          "انتهى طلب الاتصال أو فتح حسابًا آخر",
          "ابدأ اتصالًا جديدًا من مساعدك. سجّل الدخول بحساب مالك النشاط الصحيح، ثم راجع طلب الصلاحيات الجديد. حساب الموظف لا يمكنه إنشاء اتصال للمالك.",
        ],
        [
          "المساعد يطلب موافقتي",
          "هذا متوقّع للإجراءات المهمة. افتح طلب الموافقة في هذه الصفحة، وراجع التعديلات ثم وافق أو ارفض. بعد الموافقة اطلب من المساعد إعادة الطلب نفسه. تنتهي صلاحية الموافقة بعد ١٥ دقيقة؛ تغيّر البيانات يتطلب طلبًا جديدًا.",
        ],
        [
          "يظهر بانتظار أول اتصال أو غير متصل",
          "ارجع إلى مساعدك وفعّل BznsFlow في المحادثة ثم جرّب الطلب الأول. إذا انتهى الوصول أو قطعته، أعد الاتصال وسجّل الدخول من جديد. تُعرض حالة مؤكّدة فقط بعد وصول المساعد إلى BznsFlow.",
        ],
        [
          "هل يستطيع المساعد تنفيذ كل شيء؟",
          "يستخدم المساعد فقط الميزات المتاحة في باقتك، والصلاحيات التي منحتها، والتكاملات المفعّلة. الرسائل والأسعار والتعديلات الحسّاسة تحتاج إلى موافقتك افتراضيًا. يمكنك مراجعة الصلاحيات وقطع الاتصال هنا.",
        ],
      ]
    : [
        [
          "I can’t find the add-connector option in Claude",
          "Check Connectors settings and your account type. On Team and Enterprise accounts, an organization owner may need to add the connector first. See Claude’s guide above for the options available to your account.",
        ],
        [
          "The connection expired or opened the wrong account",
          "Start a new connection from your assistant. Sign in with the correct business owner account and review the new permission request. Employee accounts cannot create an owner connection.",
        ],
        [
          "My assistant is asking for approval",
          "That is expected for important actions. Open the approval on this page, review the changes, and approve or reject. After approval, ask your assistant to retry the same request. Approval expires after 15 minutes; changed records need a new request.",
        ],
        [
          "It says waiting for first connection or disconnected",
          "Return to your assistant, enable BznsFlow in the conversation, and try the first request. If access expired or you disconnected it, reconnect and sign in again. A connection is verified only after the assistant reaches BznsFlow.",
        ],
        [
          "Can my assistant do everything?",
          "It can use only features available in your plan, permissions you granted, and enabled integrations. Messages, prices and sensitive changes need your approval by default. Review permissions or disconnect here at any time.",
        ],
      ];
  return (
    <section className="mcp-help" aria-labelledby="mcp-help">
      <h2 id="mcp-help">
        {ar ? "مساعدة في الاتصال" : "Help with your connection"}
      </h2>
      {entries.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </section>
  );
}
