// Supabase access over PostgREST.
//
// HTTP rather than a Postgres client on purpose: serverless functions scale to
// many short-lived instances, and a connection pool per instance exhausts the
// database's connection limit. PostgREST is stateless, so there is nothing to
// pool and nothing to leak between invocations. It also means zero runtime
// dependencies.
//
// Every call uses the SERVICE ROLE key, which bypasses RLS. That key must never
// reach the browser: it has no VITE_ prefix, so Vite cannot inline it, and it
// is only ever read here, server-side.

import { fetchWithTimeout, httpError } from './fetch.js';

const TIMEOUT_MS = 5000;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return { url: url.replace(/\/+$/, ''), key };
}

/**
 * Call a Postgres function through PostgREST.
 *
 * The three RPCs return `jsonb`, which PostgREST returns as the bare JSON value
 * rather than a single-row array — that is why they were written to return
 * jsonb instead of `table(...)`.
 *
 * @param {string} fn    function name in the public schema
 * @param {object} args  named arguments, matching the SQL parameter names
 * @returns {Promise<any>}
 */
async function rpc(fn, args) {
  const { url, key } = config();

  const res = await fetchWithTimeout(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(args),
  }, { label: `Supabase RPC ${fn}`, timeoutMs: TIMEOUT_MS });

  // PostgREST puts the useful detail in the body.
  if (!res.ok) throw await httpError(`Supabase RPC ${fn}`, res);
  return res.json();
}

/**
 * Bump the per-IP and global counters and read both back.
 * Also prunes stale buckets opportunistically (~1% of calls, server-side).
 * @returns {Promise<{ ip_hits: number, global_hits: number }>}
 */
export function checkRate(ipBucket, globalBucket) {
  return rpc('web_check_rate', {
    p_ip_bucket: ipBucket,
    p_global_bucket: globalBucket,
  });
}

/**
 * Open a turn: upsert the conversation, read history, then record the visitor's
 * message. History comes back OLDEST → NEWEST and excludes the message being
 * sent, because it is read before that message is inserted.
 *
 * @returns {Promise<{ conversation_id: string,
 *                     history: Array<{ seq: number, role: 'user'|'assistant', content: string }> }>}
 */
export function startTurn(sessionKey, message, lang, historyLen = 20) {
  return rpc('web_start_turn', {
    p_session_key: sessionKey,
    p_message: message,
    p_lang: lang,
    p_history_len: historyLen,
  });
}

/**
 * Close a turn: record Layla's reply and latch `handoff`.
 *
 * Deliberately NOT called when the LLM failed. The old flow persisted its own
 * "small glitch" fallback as an assistant turn, so the next request fed the
 * model its own error message as conversation context.
 */
export function finishTurn(conversationId, reply, handoff) {
  return rpc('web_finish_turn', {
    p_conversation_id: conversationId,
    p_reply: reply,
    p_handoff: !!handoff,
  });
}

// ---------------------------------------------------------------------------
// Accounts, one-time codes and sessions.  Migration: web-chatbot/migrations/
// 003-accounts.sql.  Same project and same service-role key as the chat tables.
//
// Each of these is one transaction on the database side, which is the point:
// a consumed code with no session, or a session pointing at no account, is not
// a state this system should be able to reach, and splitting the steps across
// HTTP calls is exactly how it would.
// ---------------------------------------------------------------------------

/**
 * Store a code hash for an address, subject to the per-email throttle.
 * @returns {Promise<{ ok: boolean, reason?: 'too_soon'|'too_many'|'invalid' }>}
 */
export function requestCode(email, codeHash, ttlMinutes) {
  return rpc('auth_request_code', {
    p_email: email,
    p_code_hash: codeHash,
    p_ttl_minutes: ttlMinutes,
  });
}

/**
 * Verify a code, then find-or-create the account and open a session.
 * @returns {Promise<{ ok: boolean, reason?: 'no_code'|'locked'|'bad_code'|'invalid',
 *                     attempts_left?: number, needs_profile?: boolean, account?: object }>}
 */
export function verifyCode(email, codeHash, sessionHash, sessionDays) {
  return rpc('auth_verify_code', {
    p_email: email,
    p_code_hash: codeHash,
    p_session_hash: sessionHash,
    p_session_days: sessionDays,
  });
}

/**
 * Sign in with a social provider: resolve the identity to an account, creating
 * or linking as needed, and open a session. Migration: 004-oauth-identities.sql.
 *
 * The identity is (provider, subject). `email` is only consulted when linking
 * to an account that already exists, and only when `emailVerified` is true —
 * the caller checks that too, and the function refuses regardless.
 *
 * @returns {Promise<{ ok: boolean, reason?: 'invalid'|'email_unverified',
 *                     needs_profile?: boolean, account?: object }>}
 */
export function oauthLogin({
  provider, subject, email, emailVerified, name, sessionHash, sessionDays,
}) {
  return rpc('auth_oauth_login', {
    p_provider: provider,
    p_subject: subject,
    p_email: email,
    p_email_verified: emailVerified,
    p_name: name,
    p_session_hash: sessionHash,
    p_session_days: sessionDays,
  });
}

/** Fill in the profile for whichever account the session belongs to. */
export function completeProfile(sessionHash, profile) {
  return rpc('auth_complete_profile', {
    p_session_hash: sessionHash,
    p_name: profile.name,
    p_phone: profile.phone,
    p_country: profile.country,
    p_industry: profile.industry,
    p_lang: profile.lang,
  });
}

/** Resolve a session to its account, or `{ ok: false }` if expired or unknown. */
export function getSession(sessionHash) {
  return rpc('auth_session', { p_session_hash: sessionHash });
}

/** End one session. Idempotent — deleting an absent row is still success. */
export function signOut(sessionHash) {
  return rpc('auth_sign_out', { p_session_hash: sessionHash });
}

/** Record that the CRM sheet row was written, so a failed push stays findable. */
export function markSynced(accountId) {
  return rpc('auth_mark_synced', { p_account_id: accountId });
}
