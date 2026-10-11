// Dental clinic records (ascend/dental.md). Additive tables only. A visit is the appointment
// (provider, chair, time and attendance); its charges stay on hasibOrders, linked by orderId.
// Nothing clinical is stored: no notes, no findings, only bounded operational fields.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const stamps = { version: v.number(), createdAt: v.number(), updatedAt: v.number() };

export const dentalTables = {
  dentalResources: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), kind: v.string(), name: v.string(), active: v.boolean(), ...stamps,
  }).index('by_account', ['accountId']).index('by_account_request', ['accountId', 'requestId']),
  dentalVisits: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), contactId: v.id('blueContacts'), forMinor: v.optional(v.boolean()), guardianContactId: v.optional(v.id('blueContacts')),
    serviceItemId: v.optional(v.id('hasibItems')), serviceName: v.optional(v.string()), serviceCategory: v.optional(v.string()),
    providerId: v.id('dentalResources'), chairId: v.optional(v.id('dentalResources')), startsAt: v.number(), endsAt: v.number(), status: v.string(), source: v.optional(v.string()),
    confirmedAt: v.optional(v.number()), arrivedAt: v.optional(v.number()), completedAt: v.optional(v.number()), missedAt: v.optional(v.number()), cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()), lateCancel: v.optional(v.boolean()), rescheduleCount: v.optional(v.number()), replacementForId: v.optional(v.id('dentalVisits')),
    orderId: v.optional(v.id('hasibOrders')), chargeDueAt: v.optional(v.number()), disputed: v.optional(v.boolean()),
    recallDueAt: v.optional(v.number()), recallSetBy: v.optional(v.string()), recallSetAt: v.optional(v.number()), recallVersion: v.optional(v.number()),
    history: v.array(v.object({ kind: v.string(), at: v.number(), by: v.optional(v.string()), detail: v.optional(v.string()) })), ...stamps,
  }).index('by_account_start', ['accountId', 'startsAt']).index('by_contact', ['contactId']).index('by_account_request', ['accountId', 'requestId'])
    .index('by_order', ['orderId']),
  dentalTasks: defineTable({
    accountId: v.id('accounts'), kind: v.string(), entityType: v.string(), entityId: v.string(), status: v.string(), reason: v.string(), assignedAccountId: v.optional(v.id('accounts')),
    dueAt: v.optional(v.number()), snoozedUntil: v.optional(v.number()), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.string()), resolution: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_entity', ['entityType', 'entityId']),
  dentalDrafts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), contactId: v.id('blueContacts'), visitId: v.optional(v.id('dentalVisits')),
    conversationId: v.optional(v.id('blueConversations')), kind: v.string(), text: v.string(), templateId: v.optional(v.string()), ruleId: v.optional(v.string()), ruleKey: v.optional(v.string()),
    status: v.string(), approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()), providerSubmittedAt: v.optional(v.number()), deliveredAt: v.optional(v.number()), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_contact', ['contactId']).index('by_account_request', ['accountId', 'requestId']),
};
