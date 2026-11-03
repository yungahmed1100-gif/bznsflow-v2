// Air-conditioning service records (ascend/hvac.md). Additive tables only. A job is one service
// request through to completion; its visits are the technician's time windows; its estimates are
// numbered versions, so a customer's yes approves exactly the one they were sent. Contracts are
// annual maintenance agreements (AMC) covering a customer's units. Charges and payments stay on
// hasibOrders. Nothing here diagnoses: symptoms are a fixed list, findings are the technician's.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const stamps = { version: v.number(), createdAt: v.number(), updatedAt: v.number() };
const history = v.array(v.object({ kind: v.string(), at: v.number(), by: v.optional(v.string()), detail: v.optional(v.string()) }));

export const hvacTables = {
  hvacUnits: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), contactId: v.id('blueContacts'), label: v.string(), unitType: v.string(),
    brand: v.optional(v.string()), capacityBtu: v.optional(v.number()), serial: v.optional(v.string()), area: v.optional(v.string()), siteLabel: v.optional(v.string()),
    contractId: v.optional(v.id('hvacContracts')),
    // Set by staff only (the technician's recommendation); Hasib never invents a service interval.
    nextServiceAt: v.optional(v.number()), nextServiceSetBy: v.optional(v.string()), nextServiceSetAt: v.optional(v.number()),
    retiredAt: v.optional(v.number()), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId']).index('by_contact', ['contactId']).index('by_contract', ['contractId']),
  hvacContracts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), number: v.number(), reference: v.string(), contactId: v.id('blueContacts'), unitIds: v.array(v.id('hvacUnits')),
    visitsPerYear: v.number(), startsAt: v.number(), endsAt: v.number(), priceMinor: v.number(), status: v.string(), orderId: v.optional(v.id('hasibOrders')),
    acceptedAt: v.optional(v.number()), acceptanceEvidence: v.optional(v.string()), cancelReason: v.optional(v.string()),
    renewedFromId: v.optional(v.id('hvacContracts')), renewedToId: v.optional(v.id('hvacContracts')), history, ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId']).index('by_account_status', ['accountId', 'status'])
    .index('by_contact', ['contactId']).index('by_order', ['orderId']),
  hvacJobs: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), number: v.number(), contactId: v.id('blueContacts'), conversationId: v.optional(v.id('blueConversations')),
    unitIds: v.array(v.id('hvacUnits')), jobType: v.string(), source: v.string(), area: v.optional(v.string()), outOfArea: v.optional(v.boolean()),
    urgent: v.boolean(), reportedSymptom: v.optional(v.string()), status: v.string(), holdFrom: v.optional(v.string()), partsLabel: v.optional(v.string()), partsExpectedAt: v.optional(v.number()),
    requestedAt: v.number(), technicianAccountId: v.optional(v.id('accounts')), repeatOfId: v.optional(v.id('hvacJobs')),
    contractId: v.optional(v.id('hvacContracts')), contractVisitIndex: v.optional(v.number()),
    findings: v.optional(v.string()), checklist: v.array(v.object({ text: v.string(), result: v.string() })),
    approvedEstimateNumber: v.optional(v.number()), orderId: v.optional(v.id('hasibOrders')),
    costs: v.array(v.object({ kind: v.string(), label: v.string(), amountMinor: v.number() })), costsComplete: v.optional(v.boolean()),
    scheduledAt: v.optional(v.number()), firstArrivedAt: v.optional(v.number()), testedAt: v.optional(v.number()), completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()), cancelReason: v.optional(v.string()), history, ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId']).index('by_account_status', ['accountId', 'status'])
    .index('by_contact', ['contactId']).index('by_contract_index', ['contractId', 'contractVisitIndex']).index('by_order', ['orderId'])
    .index('by_account_technician_created', ['accountId', 'technicianAccountId', 'createdAt']),
  hvacVisits: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), jobId: v.id('hvacJobs'), technicianAccountId: v.id('accounts'), startsAt: v.number(), endsAt: v.number(),
    status: v.string(), jobStatusBefore: v.string(), arrivedAt: v.optional(v.number()), doneAt: v.optional(v.number()), outcome: v.optional(v.string()),
    cancelReason: v.optional(v.string()), ...stamps,
  }).index('by_account_start', ['accountId', 'startsAt']).index('by_account_request', ['accountId', 'requestId']).index('by_job', ['jobId'])
    .index('by_account_technician_start', ['accountId', 'technicianAccountId', 'startsAt']),
  hvacEstimates: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), jobId: v.id('hvacJobs'), estimateNumber: v.number(), status: v.string(),
    lines: v.array(v.object({ kind: v.string(), name: v.string(), variantId: v.optional(v.id('hasibVariants')), qty: v.number(), unitPriceMinor: v.number() })),
    totalMinor: v.number(), issuedAt: v.optional(v.number()), validUntil: v.optional(v.number()), approvedAt: v.optional(v.number()), approvedBy: v.optional(v.string()),
    evidenceSource: v.optional(v.string()), recordedBy: v.optional(v.id('accounts')), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_account_request', ['accountId', 'requestId']).index('by_account_status', ['accountId', 'status'])
    .index('by_job', ['jobId', 'estimateNumber']),
  hvacTasks: defineTable({
    accountId: v.id('accounts'), kind: v.string(), entityType: v.string(), entityId: v.string(), status: v.string(), reason: v.string(), assignedAccountId: v.optional(v.id('accounts')),
    dueAt: v.optional(v.number()), snoozedUntil: v.optional(v.number()), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.string()), resolution: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account_status', ['accountId', 'status']).index('by_entity', ['entityType', 'entityId']),
  // Rule messages (Settings → Rules): a draft per firing, sent by Hasib when its rule is Auto, else approved by the manager.
  hvacDrafts: defineTable({
    accountId: v.id('accounts'), requestId: v.string(), contactId: v.id('blueContacts'), jobId: v.optional(v.id('hvacJobs')), contractId: v.optional(v.id('hvacContracts')), unitId: v.optional(v.id('hvacUnits')),
    conversationId: v.optional(v.id('blueConversations')), kind: v.string(), text: v.string(), templateId: v.optional(v.string()), ruleId: v.optional(v.string()), ruleKey: v.optional(v.string()),
    status: v.string(), approvedBy: v.optional(v.id('accounts')), approvedAt: v.optional(v.number()), sentBy: v.optional(v.string()), autoSkip: v.optional(v.string()), deliveredAt: v.optional(v.number()), ...stamps,
  }).index('by_account_created', ['accountId', 'createdAt']).index('by_contact', ['contactId']).index('by_account_request', ['accountId', 'requestId']),
};
