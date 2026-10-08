// The safety net that stops a runaway chat, and the bounded read it needs. Layla's words are
// written by the model (config/layla-ai.js); ingest owns the writes.

export const MAX_REPLY_LENGTH = 1000;
// Instagram's Send API limit is 1000 bytes of UTF-8, not characters.
export const INSTAGRAM_MAX_BYTES = 1000;
const HOUR = 3600000, DAY = 86400000;
// Loop and flood guard: never a limit on a normal back-and-forth.
export const CONVERSATION_REPLY_CAP = 10;
const LOOP_WINDOW_MS = 2 * 60000, LOOP_REPEATS = 3;

export const normalizeLoop = text => String(text || '').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();

/**
 * Layla's messages in this chat that the ingest decisions need, read once and bounded.
 * @returns {Promise<{ firstReply: boolean, automatedLastHour: number, sentToday: string[], recentInbound: string[] }>}
 */
export async function conversationHistory(ctx, conversationId, now) {
  const byDirection = (direction, since, limit) => ctx.db.query('blueMessages')
    .withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversationId).eq('direction', direction).gte('at', since)).take(limit);
  const [today, recentIn] = await Promise.all([byDirection('out', now - DAY, 200), byDirection('in', now - LOOP_WINDOW_MS, 10)]);
  const firstReply = !today.length && !(await byDirection('out', 0, 1)).length;
  return {
    firstReply,
    // Only Layla's own automated replies count; staff replies never use up her allowance.
    automatedLastHour: today.filter(m => m.manual === false && m.at >= now - HOUR).length,
    sentToday: today.map(m => m.text).filter(Boolean),
    recentInbound: recentIn.map(m => m.text),
  };
}

/** True when this chat is a bot loop or flood: the cap is reached or the same text keeps arriving. */
export function runawayChat(history, text) {
  const same = normalizeLoop(text);
  const looping = !!same && history.recentInbound.filter(t => normalizeLoop(t) === same).length >= LOOP_REPEATS;
  return looping || history.automatedLastHour >= CONVERSATION_REPLY_CAP;
}
