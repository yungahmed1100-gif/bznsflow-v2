// Layla's reply action, without Convex specifics, so tests drive the real sequence:
// read the pending turn → model → deterministic checks → commit under the version fences.
import { aiTurn } from '../config/layla-ai.js';
export { qwenGenerator } from '../config/qwen-client.js';

/**
 * @param {{ exec: (operation: string, args: object) => Promise<{ok:boolean, value?:any, reason?:string}>,
 *   conversationId: string, key: string, generate: (messages: Array<object>) => Promise<object> }} input
 */
export async function runReplyTurn({ exec, conversationId, key, generate }) {
  const read = await exec('reply_context', { conversationId, key });
  if (!read.ok || read.value?.skip) return { skipped: read.value?.skip || read.reason };
  const turn = await aiTurn(read.value.context, generate);
  const ai = { model: turn.ai.model || '', ms: turn.ai.ms || 0, tokensIn: turn.ai.tokensIn || 0, tokensOut: turn.ai.tokensOut || 0, attempts: turn.ai.attempts || 0,
    ...(turn.ai.fallback ? { fallback: String(turn.ai.fallback).slice(0, 40) } : {}) };
  const committed = await exec('reply_commit', { conversationId, key, text: turn.reply, intent: turn.intent, noReply: !!turn.noReply, needsTeam: !!turn.needsTeam,
    ...(turn.declined?.length ? { declined: turn.declined } : {}),
    ...(turn.askedField ? { askedField: turn.askedField } : {}), fields: turn.fields || {}, ai });
  return { committed: committed.value, reply: turn.reply, ai };
}
