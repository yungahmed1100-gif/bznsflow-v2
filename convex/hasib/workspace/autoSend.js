// Sends a rule message by itself (mode "auto"): a draft built only from recorded facts goes out as
// Layla's own reply would, so every safety fence of the send worker applies (owner pause, takeover,
// opt-out, conversation or profile changed, rate limits). It never takes over the chat, never
// sends a template, and stops at three automatic messages per customer per day. A message it may
// not send stays a draft with the reason, in the owner's decision list.
import { owned } from '../../blueTenant.js';

const DAY = 86400000;
export const AUTO_SENDS_PER_DAY = 3;
export const AUTO_KEY = 'auto';

/**
 * Why this draft may not be sent automatically now, or null when it may.
 * @returns {Promise<string|null>}
 */
export async function autoSendRefusal(ctx, tenant, { conversation }, now) {
  if (!conversation) return 'no_conversation';
  if (conversation.optout) return 'opted_out';
  if (conversation.takeover) return 'team_handling';
  if (!conversation.lastInbound || conversation.lastInbound + DAY <= now) return 'window_closed';
  if (tenant.row?.integration?.id !== conversation.integrationId) return 'other_number';
  const control = await ctx.db.query('blueMessagingControls').withIndex('by_integration', q => q.eq('integrationId', conversation.integrationId)).unique();
  if (!control?.active) return 'layla_paused';
  const recent = await ctx.db.query('blueMessages').withIndex('by_conversation_at', q => q.eq('conversationId', conversation._id).gte('at', now - DAY)).take(200);
  if (recent.filter(m => String(m.key || '').startsWith(`${AUTO_KEY}:`)).length >= AUTO_SENDS_PER_DAY) return 'daily_cap';
  return null;
}

/**
 * @param {object} o
 * @param {object} o.draft the rule draft (status 'draft'), with conversationId and text
 * @param {string} o.keyPrefix e.g. 'media-draft'
 * @param {object} o.messageLinks fields written on the outbound message (sector record + draft ids)
 * @returns {Promise<{ status: 'queued', messageId: string } | { skip: string }>}
 */
export async function sendAutomatedDraft(ctx, tenant, { draft, keyPrefix, messageLinks }, now) {
  const conversation = draft.conversationId ? await owned(ctx, draft.conversationId, tenant.accountId, 'blueConversations') : null;
  const refusal = await autoSendRefusal(ctx, tenant, { conversation }, now);
  if (refusal) return { skip: refusal };
  const key = `${AUTO_KEY}:${keyPrefix}:${draft._id}`;
  const existing = await ctx.db.query('blueMessages').withIndex('by_key', q => q.eq('key', key)).unique();
  if (existing) return { status: 'queued', messageId: existing._id };
  const messageId = await ctx.db.insert('blueMessages', { key, integrationId: conversation.integrationId, accountId: tenant.accountId,
    conversationId: conversation._id, conversationVersion: conversation.version || 0, profileVersion: tenant.row.profileVersion || 1, ...messageLinks,
    direction: 'out', text: draft.text, at: now, expiresAt: now + 30 * DAY, textExpiresAt: now + 30 * DAY, status: 'queued', manual: false, handoff: false });
  if (tenant.workerFunction) await ctx.scheduler.runAfter(0, tenant.workerFunction, { jobId: messageId });
  return { status: 'queued', messageId };
}
