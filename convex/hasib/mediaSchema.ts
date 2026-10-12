// Media & production records (ascend/media.md). Additive tables only: a production links one
// commercial order per accepted scope; cuts, change orders, reservations and costs hang off it.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const stamps = { version: v.number(), createdAt: v.number(), updatedAt: v.number() };
const deliverable = v.object({ format: v.string(), aspectRatio: v.optional(v.string()), durationSeconds: v.optional(v.number()), quantity: v.number(), language: v.string(), changeOrderId: v.optional(v.string()) });
const prepItem = v.object({ key: v.string(), critical: v.boolean(), clientInput: v.boolean(), verifiedAt: v.optional(v.number()), verifiedBy: v.optional(v.string()), note: v.optional(v.string()) });

export const mediaTables = {
  mediaProductions: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), ref: v.string(),
    contactId: v.id('blueContacts'), conversationId: v.optional(v.id('blueConversations')),
    title: v.string(), productionType: v.string(), purpose: v.optional(v.string()), budgetMinor: v.optional(v.number()), dateNeeded: v.optional(v.string()), deliverables: v.array(deliverable),
    // Catalog services the customer named in the chat (Layla); Hasib quotes from them only when each has a fixed price.
    catalogEntryKeys: v.optional(v.array(v.string())),
    status: v.string(), holdFrom: v.optional(v.string()), statusAt: v.number(), producerId: v.optional(v.id('accounts')), source: v.string(),
    shootStartsAt: v.optional(v.number()), shootEndsAt: v.optional(v.number()), location: v.optional(v.string()),
    deliveryDueAt: v.optional(v.number()), originalDueAt: v.optional(v.number()), firstCutDueAt: v.optional(v.number()),
    quoteMinor: v.number(), quoteVersion: v.number(), depositMinor: v.number(), quotedAt: v.optional(v.number()),
    acceptedQuoteVersion: v.optional(v.number()), acceptedAt: v.optional(v.number()), acceptedBy: v.optional(v.string()), orderId: v.optional(v.id('hasibOrders')),
    revisionAllowance: v.number(), roundsUsed: v.number(),
    usageRights: v.object({ territory: v.optional(v.string()), channels: v.array(v.string()), termEndsAt: v.optional(v.number()), clearance: v.string() }),
    prep: v.array(prepItem),
    shootCompletedAt: v.optional(v.number()), shootCompletedBy: v.optional(v.string()),
    finalCutId: v.optional(v.id('mediaCuts')), finalAcceptedAt: v.optional(v.number()),
    handoff: v.optional(v.object({ link: v.string(), at: v.number(), by: v.string() })), deliveredAt: v.optional(v.number()),
    costsFinal: v.boolean(), cancelReason: v.optional(v.string()), nextAction: v.optional(v.string()), ...stamps,
  }).index('by_account_request', ['accountId', 'requestId']).index('by_account_status', ['accountId', 'status']).index('by_account_created', ['accountId', 'createdAt']).index('by_contact', ['contactId']).index('by_order', ['orderId']),
  mediaCuts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), productionId: v.id('mediaProductions'), revision: v.number(), label: v.string(), assetRef: v.string(),
    status: v.string(), submittedAt: v.number(), decisionDueAt: v.number(), approverName: v.string(),
    decision: v.optional(v.string()), decisionAt: v.optional(v.number()), feedback: v.optional(v.string()), evidenceSource: v.optional(v.string()),
    recordedBy: v.string(), decidedBy: v.optional(v.string()), countedRound: v.boolean(), ...stamps,
  }).index('by_production', ['productionId']).index('by_account_status', ['accountId', 'status']).index('by_account_request', ['accountId', 'requestId']).index('by_account_created', ['accountId', 'createdAt']),
  mediaChangeOrders: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), productionId: v.id('mediaProductions'), kind: v.string(), description: v.string(), priceMinor: v.number(),
    deliverable: v.optional(deliverable), cutId: v.optional(v.id('mediaCuts')), status: v.string(), decidedBy: v.optional(v.string()), decidedAt: v.optional(v.number()), customerApproval: v.optional(v.string()),
    orderId: v.optional(v.id('hasibOrders')), ...stamps,
  }).index('by_production', ['productionId']).index('by_account_status', ['accountId', 'status']).index('by_account_request', ['accountId', 'requestId']).index('by_account_created', ['accountId', 'createdAt']),
  mediaResources: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), name: v.string(), category: v.string(), active: v.boolean(), internalRateMinor: v.optional(v.number()), ...stamps,
  }).index('by_account', ['accountId']).index('by_account_request', ['accountId', 'requestId']),
  mediaReservations: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), resourceId: v.id('mediaResources'), productionId: v.id('mediaProductions'),
    startsAt: v.number(), endsAt: v.number(), status: v.string(), holdExpiresAt: v.optional(v.number()), ...stamps,
  }).index('by_account_resource_start', ['accountId', 'resourceId', 'startsAt']).index('by_production', ['productionId']).index('by_account_start', ['accountId', 'startsAt']).index('by_account_request', ['accountId', 'requestId']),
  mediaCosts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), productionId: v.id('mediaProductions'), category: v.string(), label: v.string(), amountMinor: v.number(),
    hours: v.optional(v.number()), expenseId: v.optional(v.id('hasibExpenses')), changeOrderId: v.optional(v.id('mediaChangeOrders')), extraScope: v.boolean(),
    kind: v.string(), incurredAt: v.number(), voidedAt: v.optional(v.number()), recordedBy: v.string(), ...stamps,
  }).index('by_production', ['productionId']).index('by_expense', ['expenseId']).index('by_account_request', ['accountId', 'requestId']).index('by_account_created', ['accountId', 'createdAt']),
  mediaEvents: defineTable({
    accountId: v.id('accounts'), productionId: v.id('mediaProductions'), kind: v.string(), from: v.optional(v.string()), to: v.optional(v.string()),
    cutId: v.optional(v.id('mediaCuts')), detail: v.optional(v.string()), actorAccountId: v.id('accounts'), actorRole: v.string(), at: v.number(),
  }).index('by_production', ['productionId']).index('by_account_at', ['accountId', 'at']),
  mediaTasks: defineTable({
    accountId: v.id('accounts'), kind: v.string(), entityType: v.string(), entityId: v.string(), status: v.string(), reason: v.string(), assignedAccountId: v.optional(v.id('accounts')),
    dueAt: v.optional(v.number()), snoozedUntil: v.optional(v.number()), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.string()), resolution: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_entity', ['entityType', 'entityId']),
  mediaDrafts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), productionId: v.id('mediaProductions'), conversationId: v.optional(v.id('blueConversations')), kind: v.string(), text: v.string(),
    templateId: v.optional(v.string()), ruleId: v.optional(v.string()), ruleKey: v.optional(v.string()), status: v.string(), approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()),
    sentBy: v.optional(v.string()), autoSkip: v.optional(v.string()),
    providerSubmittedAt: v.optional(v.number()), deliveredAt: v.optional(v.number()), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_production', ['productionId']).index('by_account_request', ['accountId', 'requestId']),
};
