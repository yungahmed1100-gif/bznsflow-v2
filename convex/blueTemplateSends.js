// Template messages the business sent one contact: broadcasts, single sends and Hasib's approved
// drafts outside the 24-hour window. They live in blueCampaignRecipients, apart from Layla's chat
// rows, yet belong in the contact's chat: the owner sees them there and Layla reads them before replying.
import { renderTemplate } from '../config/layla-templates.js';

/** Sends that never reached WhatsApp: the thread still shows them, Layla never reads them. */
export const UNSENT = Object.freeze(['pending', 'cancelled', 'blocked', 'failed']);

/**
 * The contact's template sends, newest first, each with its campaign.
 * @returns {Promise<Array<{ send: object, campaign: object }>>}
 */
export async function templateSendsFor(ctx, contactId, { since = 0, before = null, limit = 50, skip = ['pending', 'cancelled'] } = {}) {
  if (!contactId) return [];
  const rows = await ctx.db.query('blueCampaignRecipients').withIndex('by_contact_at', q => {
    const range = q.eq('contactId', contactId).gte('at', since);
    return before ? range.lt('at', before) : range;
  }).order('desc').take(limit);
  const campaigns = new Map();
  const sends = [];
  for (const send of rows) {
    if (skip.includes(send.status)) continue;
    if (!campaigns.has(send.campaignId)) campaigns.set(send.campaignId, await ctx.db.get(send.campaignId));
    const campaign = campaigns.get(send.campaignId);
    if (campaign) sends.push({ send, campaign });
  }
  return sends;
}

/** The text the customer received, while it is retained. */
export const sentText = ({ send, campaign }, now) => (send.waId && send.expiresAt > now ? renderTemplate(campaign.template, send.parameters) : null);

/**
 * A template send that reached WhatsApp opens the contact's chat, as the WhatsApp Business app does,
 * and moves it to the top of Chats. A recipient who never replies still has a chat to open.
 */
export async function openTemplateChat(ctx, send, now) {
  if (!send.waId || !send.contactId) return;
  const key = `${send.integrationId}:${send.waId}`;
  const person = await ctx.db.query('blueConversations').withIndex('by_key', q => q.eq('key', key)).unique();
  if (person) {
    await ctx.db.patch(person._id, { updatedAt: Math.max(person.updatedAt, now), ...(person.contactId ? {} : { contactId: send.contactId }) });
    return;
  }
  await ctx.db.insert('blueConversations', { key, integrationId: send.integrationId, accountId: send.accountId, number: send.waId, contactId: send.contactId,
    lastInbound: 0, takeover: false, optout: false, updatedAt: now });
}
