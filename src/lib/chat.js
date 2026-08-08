// ─── Layla web chat → /api/chat ──────────────────────────────────────────────
// Single door to the Layla chat backend (Vercel function → Groq → Supabase).
// The widget POSTs { message, sessionId } and gets back
// { reply, sessionId, handoff, handoff_context }. The backend enforces origin,
// input validation, and rate limits — see web-chatbot/SETUP.md.
//
// Same-origin by default, so there is no CORS preflight and no cross-origin
// failure mode. VITE_CHAT_ENDPOINT still overrides it, which is the rollback
// lever: point it at any absolute URL and redeploy.

export const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || '/api/chat';

/** Give up on a hung backend. Must stay above the function's own Groq timeout
 *  (12s) plus its DB round trips, so a slow-but-working turn is never killed
 *  client-side, and below Vercel's 30s function ceiling. */
export const CHAT_TIMEOUT_MS = 20000;

const SESSION_KEY = 'bznsflow_chat_session';
const MAX_CHARS = 800; // must match MAX_CHARS in api/_lib/guard.js

/**
 * Get (or lazily create) a stable per-visitor session id, persisted in
 * localStorage. Matches the backend regex /^[A-Za-z0-9_:-]{6,80}$/.
 * SSR-safe: returns a throwaway id when window is unavailable.
 * @returns {string}
 */
export function getSessionId() {
  if (typeof window === 'undefined') return 'web-ssr-placeholder';
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      const rand =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      id = ('web-' + rand).slice(0, 80);
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch (_) {
    // Private mode / storage blocked — fall back to an in-memory-ish id.
    return 'web-' + Date.now().toString(36);
  }
}

/**
 * Send one message to Layla and resolve with the parsed reply.
 * @param {string} message
 * @param {string} sessionId
 * @returns {Promise<{ reply: string, handoff: boolean, handoffContext: string }>}
 */
export async function sendChatMessage(message, sessionId) {
  const trimmed = (message || '').trim().slice(0, MAX_CHARS);

  // Manual AbortController rather than AbortSignal.timeout(): the latter is
  // Safari 16+ only, and this is a static site with no polyfills. Without a
  // timeout a hung backend leaves the widget spinning forever — which is
  // exactly what visitors saw while the old backend was returning nothing.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  // A network failure or timeout rejects here — the caller catches it and shows
  // a friendly error instead of a blank bubble.
  let res;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, sessionId }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    body = null;
  }

  const reply = body && typeof body.reply === 'string' ? body.reply.trim() : '';
  // Guard/rate-limit responses (400/403/429) still carry a friendly `reply`;
  // surface it. Only throw when there's genuinely nothing usable to show.
  if (!reply) {
    throw new Error(`Empty chat reply (status ${res.status})`);
  }

  return {
    reply,
    handoff: !!(body && body.handoff),
    handoffContext: (body && (body.handoff_context || body.handoffContext)) || '',
  };
}

export const CHAT_MAX_CHARS = MAX_CHARS;
