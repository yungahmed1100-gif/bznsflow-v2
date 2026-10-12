// Adiba's offers: quotes and extra-scope offers she drafts for the owner's approval, in any sector.
// One table for every sector; `subjectType`/`subjectId` link an offer to the record it updates when
// approved or accepted (a media production, a change order, or just the conversation).
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const line = v.object({
  key: v.string(), name: v.string(), qty: v.number(), unitPriceMinor: v.optional(v.number()),
  priceSource: v.string(), reason: v.optional(v.string()), catalogEntryKey: v.optional(v.string()),
});

export const adibaTables = {
  adibaOffers: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), ref: v.string(), packId: v.string(),
    kind: v.string(), subjectType: v.string(), subjectId: v.string(),
    contactId: v.optional(v.id('blueContacts')), conversationId: v.optional(v.id('blueConversations')),
    status: v.string(), reasons: v.array(v.string()), lines: v.array(line),
    totalMinor: v.optional(v.number()), depositMinor: v.optional(v.number()), currency: v.string(),
    text: v.string(), lang: v.string(), validUntil: v.number(),
    approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()),
    messageId: v.optional(v.id('blueMessages')), sentAt: v.optional(v.number()), sendSkip: v.optional(v.string()),
    acceptance: v.optional(v.object({ at: v.number(), messageId: v.optional(v.id('blueMessages')), evidence: v.string(), by: v.string() })),
    offerVersion: v.number(), version: v.number(), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_account_request', ['accountId', 'requestId'])
    .index('by_subject', ['subjectType', 'subjectId']).index('by_conversation_status', ['conversationId', 'status']).index('by_account_created', ['accountId', 'createdAt']),
};
