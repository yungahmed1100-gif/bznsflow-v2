import { defineTable } from 'convex/server';
import { v } from 'convex/values';

// The six-tab kit's tasks and rule drafts for the two store packs (retail and retail-tech). Orders,
// stock, IMEIs and repairs stay in the hasib tables; these only hold what Follow-ups adds.
export const retailTables = {
  retailTasks: defineTable({
    accountId: v.id('accounts'), kind: v.string(), entityType: v.string(), entityId: v.string(), status: v.string(), reason: v.string(), assignedAccountId: v.optional(v.id('accounts')),
    dueAt: v.optional(v.number()), snoozedUntil: v.optional(v.number()), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.string()), resolution: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_entity', ['entityType', 'entityId']),
  retailDrafts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), orderId: v.optional(v.id('hasibOrders')), repairId: v.optional(v.id('hasibRepairs')), productRequestId: v.optional(v.id('hasibProductRequests')),
    contactId: v.id('blueContacts'), conversationId: v.optional(v.id('blueConversations')), kind: v.string(), text: v.string(), templateId: v.optional(v.string()), ruleId: v.optional(v.string()), ruleKey: v.optional(v.string()),
    status: v.string(), approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()), sentBy: v.optional(v.string()), autoSkip: v.optional(v.string()), deliveredAt: v.optional(v.number()),
    version: v.number(), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId']),
};
