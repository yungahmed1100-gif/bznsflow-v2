// How Layla's reply to one inbound message is put together, and the safety net that
// stops a runaway chat. Pure helpers plus one bounded read; ingest owns the writes.
import { phrase, customerSlot, hasEmoji, stripEmoji } from '../config/layla-tones.js';
import { safeReply } from '../api/_lib/layla/reply-guard.js';

export const MAX_REPLY_LENGTH = 1000;
// Instagram's Send API limit is 1000 bytes of UTF-8, not characters.
export const INSTAGRAM_MAX_BYTES = 1000;
const HOUR = 3600000, DAY = 86400000;
// Loop and flood guard: never a limit on a normal back-and-forth.
export const CONVERSATION_REPLY_CAP = 10;
const LOOP_WINDOW_MS = 2 * 60000, LOOP_REPEATS = 3;
// Router intents whose generic answer is replaced by a live stock line when a product is named.
export const GENERIC_INTENTS = new Set(['prices', 'services', 'unknown']);
const GREETING_INTENTS = new Set(['greeting', 'identity']);

// An Instagram @handle is not a name: Layla asks instead of greeting "@sara.k".
const firstName = name => { const first = String(name || '').trim().split(/\s+/)[0] || ''; return first.startsWith('@') ? '' : first; };
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

/** "Thank you, Sara." when a reply only gave Layla details; composeReply adds "How can I help?" if nothing else follows. */
export function continuationReply({ tone, lang, newName }) {
  return phrase(tone, 'thanks', lang, { customer: customerSlot(firstName(newName), lang) });
}

/**
 * The text Layla sends. Every chat opens with the business and Layla; on that first reply
 * the welcome replaces a bare greeting instead of stacking on it. Live stock facts replace a
 * generic price, services or unknown answer and follow anything else (hours, location).
 * @returns {{ text: string, asked: boolean }}
 */
export function composeReply({ firstReply, intent, handoffReason, reply, liveFacts, ack, questions, tone, lang, business, knownName, channel }) {
  const answer = liveFacts ? (GENERIC_INTENTS.has(intent) ? [liveFacts] : [reply, liveFacts]) : [reply];
  // An abusive opener gets the calm notice alone, never a cheerful welcome.
  const welcome = firstReply && handoffReason !== 'abuse'
    ? phrase(tone, 'welcome', lang, { business: business || '', customer: customerSlot(firstName(knownName), lang) }) : '';
  const body = welcome && GREETING_INTENTS.has(intent) ? (liveFacts ? [liveFacts] : []) : answer;
  // At most one emoji: the answer is never touched, so Layla's own welcome and questions give way.
  const hello = hasEmoji(body.join(' ')) ? stripEmoji(welcome) : welcome;
  const lead = !hello ? body : GREETING_INTENTS.has(intent) ? [hello, ...body] : [`${hello} ${body[0]}`, ...body.slice(1)];
  // A bare "Thank you." needs somewhere to go: an order line, a question, or "How can I help?".
  const next = intent === 'answer' && !liveFacts && !ack && !questions ? phrase(tone, 'howHelp', lang) : '';
  const parts = next ? [`${lead[0]} ${next}`, ...lead.slice(1)] : lead;
  // Order lines and questions are Layla's own words too, so they give way to an earlier emoji.
  const quiet = text => (hasEmoji(parts.join(' ')) ? stripEmoji(text) : text);
  const orderLine = quiet(ack), ask = quiet(questions);
  const text = safeReply([...parts, orderLine, ask].filter(Boolean).join('\n\n'), MAX_REPLY_LENGTH, channel === 'instagram' ? { maxBytes: INSTAGRAM_MAX_BYTES } : {});
  // Questions count as asked only when they reached the customer whole, not cut by the length cap.
  return { text, asked: !!ask && text.endsWith(ask) };
}
