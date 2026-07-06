// ─── Layla web chat → n8n webhook ────────────────────────────────────────────
// Single door to the Layla chat backend (n8n on Railway → Groq → Supabase).
// The widget POSTs { message, sessionId } and gets back
// { reply, sessionId, handoff, handoff_context }. Backend enforces the origin
// allowlist, input validation, and rate limits — see web-chatbot/SETUP.md.
//
// Endpoint is env-overridable (VITE_CHAT_ENDPOINT in Vercel) with the deployed
// production /webhook/chat URL as the baked-in fallback.

export const CHAT_ENDPOINT =
  import.meta.env.VITE_CHAT_ENDPOINT ||
  'https://n8n-production-0b39.up.railway.app/webhook/chat';

const SESSION_KEY = 'bznsflow_chat_session';
const MAX_CHARS = 800; // must match the backend Guard & Validate cap

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

  // A network/CORS failure rejects here — the caller catches it and shows a
  // friendly error instead of a blank bubble.
  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: trimmed, sessionId }),
  });

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
