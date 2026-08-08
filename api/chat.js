// POST /api/chat — Layla's web chat backend.
//
// Replaces an n8n workflow that ran on Railway until that service was deleted.
// Same-origin with the site, so there is no CORS layer here at all: no
// preflight, no Access-Control-* headers, no origin reflection. If you find
// yourself adding them back, the widget is calling a different origin and that
// is the thing to fix.
//
// Request   { message: string (1..800), sessionId: /^[A-Za-z0-9_:-]{6,80}$/ }
// Response  { reply: string, sessionId: string, handoff: boolean, handoff_context: string }
//
// THE INVARIANT: every response carries a `reply` string, at every status code.
// src/lib/chat.js does not check res.ok — it reads `reply` and only throws when
// there is none. A response without one replaces a specific, friendly message
// with a generic error bubble.

import * as replies from './_lib/replies.js';
import { clientIp, isAllowedOrigin, validate, bucketKeys } from './_lib/guard.js';
import { checkRate, startTurn, finishTurn } from './_lib/db.js';
import { detectLang, buildSystemMessage } from './_lib/prompt.js';
import { complete } from './_lib/groq.js';

const HISTORY_TURNS = 20;

/** Read limits per request rather than at module load. A module-level constant
 *  is frozen at cold start, so it silently ignores an env change until an
 *  instance recycles — and it cannot be exercised by a test. */
function limits() {
  return {
    perIpPerMin: Number(process.env.CHAT_RATE_IP_PER_MIN || 20),
    globalPerDay: Number(process.env.CHAT_RATE_GLOBAL_PER_DAY || 1000),
  };
}

function send(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // A cached chat reply would be served to a different visitor.
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Shape every response identically so the widget never has to branch. */
function reply(res, status, text, { sessionId = '', handoff = false, context = '' } = {}) {
  return send(res, status, {
    reply: text,
    sessionId,
    handoff,
    handoff_context: context,
  });
}

/** Vercel parses JSON bodies, but tolerate a raw string too. */
function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, replies.METHOD_NOT_ALLOWED);
  }

  const ip = clientIp(req);
  const buckets = bucketKeys(ip);

  // ── Metering comes FIRST, before validation or the origin check ──────────
  // In the old flow, guard rejections returned before the rate limiter ran, so
  // anything malformed was unmetered: an attacker could hammer the endpoint for
  // free with junk payloads. Counting first means every request costs a bucket
  // slot regardless of how it is eventually answered.
  try {
    const { perIpPerMin, globalPerDay } = limits();
    const rate = await checkRate(buckets.ip, buckets.global);
    if (Number(rate?.ip_hits || 0) > perIpPerMin) {
      return reply(res, 429, replies.RATE_IP);
    }
    if (Number(rate?.global_hits || 0) > globalPerDay) {
      return reply(res, 429, replies.RATE_GLOBAL);
    }
  } catch (err) {
    // Fail OPEN. The limiter protects a cost ceiling, not correctness or data,
    // and the global ceiling is a far bigger lever than any single IP. Failing
    // closed here would take the whole chat down on a transient Supabase blip.
    console.error('[chat] rate limit check failed, allowing request:', err.message);
  }

  if (!isAllowedOrigin(req)) {
    return reply(res, 403, replies.FORBIDDEN_ORIGIN);
  }

  const parsed = validate(readBody(req), replies);
  if (!parsed.ok) {
    // Injection deflections are answered here, at HTTP 200 and zero LLM cost.
    return reply(res, parsed.status, parsed.reply, { sessionId: parsed.sessionId || '' });
  }

  const { message, sessionId } = parsed;

  // Uptime checks and smoke tests, short-circuited before any spend. Only ever
  // reachable by someone holding the secret token.
  const smoke = process.env.CHAT_SMOKE_TOKEN;
  if (smoke && message === smoke) {
    return reply(res, 200, 'pong', { sessionId });
  }

  const lang = detectLang(message);

  let conversationId = null;
  let history = [];
  try {
    const turn = await startTurn(`web:${sessionId}`, message, lang, HISTORY_TURNS);
    conversationId = turn?.conversation_id ?? null;
    history = Array.isArray(turn?.history) ? turn.history : [];
  } catch (err) {
    // Fail OPEN again: answering without memory beats not answering. The turn
    // is not persisted, so the visitor's next message will not see this one.
    console.error('[chat] startTurn failed, continuing without history:', err.message);
  }

  let answer;
  try {
    answer = await complete(buildSystemMessage(message, history), message);
  } catch (err) {
    console.error('[chat] Groq failed:', err.message);
    // 200 with the friendly text — the widget shows `reply` whatever the status.
    // Deliberately NOT persisted: the old flow saved its own error as an
    // assistant turn, so the next request fed the model its own glitch message
    // as conversation context.
    return reply(res, 200, replies.LLM_ERROR, { sessionId });
  }

  if (conversationId) {
    try {
      await finishTurn(conversationId, answer.reply, answer.handoff);
    } catch (err) {
      // The visitor already has a good answer; losing the log is the lesser
      // failure. Next turn's history simply misses this reply.
      console.error('[chat] finishTurn failed, reply still delivered:', err.message);
    }
  }

  return reply(res, 200, answer.reply, {
    sessionId,
    handoff: answer.handoff,
    context: answer.handoff_context,
  });
}
