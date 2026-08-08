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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Supabase RPC ${fn} timed out after ${TIMEOUT_MS}ms`);
    }
    throw new Error(`Supabase RPC ${fn} failed: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // PostgREST puts the useful detail in the body; include it but keep it
    // bounded so a large error page cannot flood the logs.
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase RPC ${fn} → HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
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
