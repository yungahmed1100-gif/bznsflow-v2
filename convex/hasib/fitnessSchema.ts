// Fitness & wellness records (ascend/fitness.md). Additive tables only. Memberships, credits and
// money stay on the existing hasibMemberships, hasibCredits and hasibOrders rows; these tables add
// the plan catalogue, class instances with their seats, and the workspace's tasks and drafts.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const stamps = { version: v.number(), createdAt: v.number(), updatedAt: v.number() };

export const fitnessTables = {
  fitnessPlans: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), name: v.string(), kind: v.string(), termDays: v.number(), billingMonths: v.number(),
    priceMinor: v.number(), credits: v.optional(v.number()), freezeMaxDays: v.number(), graceDays: v.number(), active: v.boolean(), ...stamps,
  }).index('by_account', ['accountId']).index('by_account_request', ['accountId', 'requestId']),
  fitnessClasses: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), classType: v.string(), title: v.string(), coachId: v.optional(v.id('accounts')), coachName: v.optional(v.string()),
    startsAt: v.number(), endsAt: v.number(), capacity: v.number(), status: v.string(), cancelReason: v.optional(v.string()), ...stamps,
  }).index('by_account_start', ['accountId', 'startsAt']).index('by_account_request', ['accountId', 'requestId']),
  fitnessSeats: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), classId: v.id('fitnessClasses'), contactId: v.id('blueContacts'), membershipId: v.optional(v.id('hasibMemberships')),
    trial: v.boolean(), source: v.optional(v.string()), status: v.string(), attendedAt: v.optional(v.number()), attendanceSource: v.optional(v.string()), sourceEventId: v.optional(v.string()),
    promotedAt: v.optional(v.number()), cancelledAt: v.optional(v.number()), ...stamps,
  }).index('by_class', ['classId']).index('by_contact', ['contactId']).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId'])
    .index('by_account_source', ['accountId', 'sourceEventId']),
  fitnessTasks: defineTable({
    accountId: v.id('accounts'), kind: v.string(), entityType: v.string(), entityId: v.string(), status: v.string(), reason: v.string(), assignedAccountId: v.optional(v.id('accounts')),
    dueAt: v.optional(v.number()), snoozedUntil: v.optional(v.number()), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.string()), resolution: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_entity', ['entityType', 'entityId']),
  fitnessDrafts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), contactId: v.id('blueContacts'), membershipId: v.optional(v.id('hasibMemberships')), seatId: v.optional(v.id('fitnessSeats')),
    conversationId: v.optional(v.id('blueConversations')), kind: v.string(), text: v.string(), templateId: v.optional(v.string()), ruleId: v.optional(v.string()), ruleKey: v.optional(v.string()),
    status: v.string(), approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()), providerSubmittedAt: v.optional(v.number()), deliveredAt: v.optional(v.number()), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_contact', ['contactId']).index('by_account_request', ['accountId', 'requestId']),
};
