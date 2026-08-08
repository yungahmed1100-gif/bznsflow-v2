// Canned bilingual replies.
//
// Every one of these reaches a visitor's chat bubble verbatim, because the
// client renders `reply` at EVERY status code — src/lib/chat.js deliberately
// does not check res.ok, and only throws when `reply` is missing entirely.
// So a response without a `reply` string shows the generic error bubble instead
// of the specific message, and a bare technical string ("Missing sessionId.")
// gets shown to a human.
//
// Arabic first, then English, separated by " / " — the site is Arabic-first and
// a visitor sees their own language without waiting for detection to be right.

/** Prompt-extraction / jailbreak attempts. Answered at zero LLM cost. */
export const DEFLECTION =
  'أنا هنا لمساعدتك بخصوص BznsFlow فقط 😊 / I can only help with BznsFlow here.';

/** Per-IP burst. */
export const RATE_IP =
  'شوي شوي 🙏 حاول بعد دقيقة / A bit fast — try again in a minute.';

/** Global daily ceiling — protects the Groq budget. */
export const RATE_GLOBAL =
  'الخدمة مشغولة حالياً، جرّب لاحقاً 🙏 / Service is busy, please try later.';

/** Groq unreachable, slow, or returning nonsense. */
export const LLM_ERROR =
  'عذراً، صار خطأ بسيط 🙏 جرّب مرة ثانية / Sorry, a small glitch — please try again.';

// ── Validation failures ─────────────────────────────────────────────────────
// The widget clamps length and always sends a well-formed sessionId, so these
// are effectively unreachable through the UI and exist for direct callers.
// They are still phrased for a human, because if one ever does fire it fires
// inside a chat bubble.

export const BAD_SESSION =
  'صار خلل بسيط في الجلسة 🙏 حدّث الصفحة وجرّب / Session problem — please refresh and try again.';

export const EMPTY_MESSAGE =
  'اكتب رسالتك وأنا جاهزة 😊 / Type a message and I am ready.';

export const TOO_LONG =
  'الرسالة طويلة شوي 🙏 اختصرها لو سمحت / That message is a bit long — could you shorten it?';

export const FORBIDDEN_ORIGIN =
  'تعذّر التحقق من مصدر الطلب 🙏 / Could not verify where this request came from.';

export const METHOD_NOT_ALLOWED =
  'هذي النقطة تستقبل POST فقط / This endpoint only accepts POST.';
