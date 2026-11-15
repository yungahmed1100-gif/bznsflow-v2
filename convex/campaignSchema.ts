// WhatsApp broadcasts (convex/blueCampaignState.js): a campaign, its optional header file and one frozen
// row per recipient. Kept apart from schema.ts like the website and sector schemas.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const campaignTables = {
  blueCampaigns: defineTable({
    mcpConnectionId: v.optional(v.id('mcpConnections')),
    mcpRunId: v.optional(v.id('mcpRuns')),
    accountId: v.id('accounts'),
    integrationId: v.string(),
    requestId: v.string(),
    name: v.string(),
    origin: v.union(v.literal('broadcast'), v.literal('chat')),
    template: v.object({
      templateId: v.string(),
      name: v.string(),
      language: v.string(),
      category: v.string(),
      parameterFormat: v.string(),
      body: v.string(),
      header: v.optional(v.object({ format: v.string(), text: v.optional(v.string()) })),
      footer: v.optional(v.string()),
    }),
    headerMediaId: v.optional(v.id('blueCampaignMedia')),
    mapping: v.array(v.object({ key: v.string(), source: v.string(), value: v.string() })),
    status: v.string(),
    reason: v.optional(v.string()),
    scheduledAt: v.number(),
    timezone: v.string(),
    recipientCount: v.number(),
    allowance: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    startingAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    // Set on a broadcast the owner made by resending another one's failed recipients.
    resendOf: v.optional(v.id('blueCampaigns')),
  })
    .index('by_account_request', ['accountId', 'requestId'])
    .index('by_account_created', ['accountId', 'createdAt'])
    .index('by_status_scheduled', ['status', 'scheduledAt'])
    .index('by_integration_status', ['integrationId', 'status']),
  // The image, video or PDF an owner adds for a template's media header. Unused files are swept after a day,
  // used ones a day after their campaign ends.
  blueCampaignMedia: defineTable({
    accountId: v.id('accounts'),
    storageId: v.id('_storage'),
    format: v.string(),
    contentType: v.string(),
    size: v.number(),
    filename: v.optional(v.string()),
    campaignId: v.optional(v.id('blueCampaigns')),
    createdAt: v.number(),
  })
    .index('by_storage', ['storageId'])
    .index('by_created', ['createdAt']),
  // Frozen per-recipient snapshot. PII is stripped if the contact is deleted.
  blueCampaignRecipients: defineTable({
    campaignId: v.id('blueCampaigns'),
    accountId: v.id('accounts'),
    integrationId: v.string(),
    contactId: v.id('blueContacts'),
    constructionDraftId: v.optional(v.id('constructionDrafts')),
    retailDraftId: v.optional(v.id('retailDrafts')),
    automotiveDraftId: v.optional(v.id('automotiveDrafts')),
    realEstateDraftId: v.optional(v.id('realEstateDrafts')),
    mediaDraftId: v.optional(v.id('mediaDrafts')),
    fitnessDraftId: v.optional(v.id('fitnessDrafts')),
    dentalDraftId: v.optional(v.id('dentalDrafts')),
    hvacDraftId: v.optional(v.id('hvacDrafts')),
    numberHash: v.string(),
    waId: v.optional(v.string()),
    name: v.optional(v.string()),
    parameters: v.array(v.object({ key: v.string(), component: v.string(), text: v.string() })),
    status: v.string(),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    intent: v.optional(v.string()),
    attemptAt: v.optional(v.number()),
    providerId: v.optional(v.string()),
    reason: v.optional(v.string()),
    errorCode: v.optional(v.number()),
    at: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(),
    // The later broadcast this failed recipient was resent in, so one failure is resent once.
    resentIn: v.optional(v.id('blueCampaigns')),
  })
    .index('by_campaign_status', ['campaignId', 'status'])
    .index('by_status_next', ['status', 'nextAttemptAt'])
    .index('by_integration_status', ['integrationId', 'status'])
    .index('by_contact_at', ['contactId', 'at'])
    .index('by_intent', ['intent'])
    .index('by_provider', ['providerId'])
    .index('by_expiry', ['expiresAt']),
};
