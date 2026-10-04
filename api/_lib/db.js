// Website persistence and session compatibility use Convex exclusively.
import { coreStore, blueAuthStore } from './convex.js';

/**
 * Bump the per-IP and global counters and read both back.
 * Also prunes stale buckets opportunistically (~1% of calls, server-side).
 * @returns {Promise<{ ip_hits: number, global_hits: number }>}
 */
export function checkRate(ipBucket, globalBucket) {
  return coreStore()('check_rate', { ipBucket, globalBucket });
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
  return coreStore()('start_turn', { sessionKey, message, lang, historyLen });
}

/**
 * Close a turn: record Layla's reply and latch `handoff`.
 *
 * Deliberately NOT called when the LLM failed. The old flow persisted its own
 * "small glitch" fallback as an assistant turn, so the next request fed the
 * model its own error message as conversation context.
 */
export function finishTurn(conversationId, reply, handoff) {
  return coreStore()('finish_turn', { conversationId, reply, handoff: !!handoff });
}

/**
 * Persist a named website form submission in the canonical CRM lead list.
 *
 * This deliberately runs before the legacy Google Sheet append. The CRM is the
 * durable identity/provenance store; the sheet remains a convenient operating
 * view and playbook-mail transport, but it is no longer the only copy.
 */
export function captureWebsiteLead({
  email, name, phone, country, industry, lang, sourceUrl, sourceCta,
  sourceKey = 'website_form', verified = false,
}) {
  return coreStore()('capture_website_lead', { email, name, phone, country, industry, lang, sourceKey, sourceUrl, sourceCta, verified: !!verified });
}


export async function getSession(tokenHash) {
  const account = await blueAuthStore()('session', { tokenHash });
  return { ok: !!account, account };
}
