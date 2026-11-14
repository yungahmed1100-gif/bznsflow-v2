// Ascend's free website (config/website-brief.js): the owner's brief, its draft, the uploaded files
// and the delivery project. Additive tables, kept apart from schema.ts like the sector schemas.
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const websiteTables = {
  // Ascend's free website: the owner's brief (config/website-brief.js), emailed to Ahmed on each submit.
  websiteBriefs: defineTable({
    accountId: v.id('accounts'),
    version: v.number(),
    fields: v.record(v.string(), v.union(v.string(), v.array(v.string()), v.boolean())),
    logoId: v.optional(v.id('_storage')),
    photoIds: v.array(v.id('_storage')),
    docIds: v.optional(v.array(v.object({ kind: v.string(), id: v.id('_storage') }))),
    submittedAt: v.number(),
    emailedAt: v.optional(v.number()),
    emailId: v.optional(v.string()),
    // What the brief's email showed when it was submitted, so a retry sends the same message.
    emailContext: v.optional(
      v.object({ account: v.object({ email: v.string(), name: v.string() }), dueAt: v.number() }),
    ),
  }).index('by_account', ['accountId']),
  // A website brief being filled in, step by step, so the owner can leave and resume on any device.
  websiteDrafts: defineTable({
    accountId: v.id('accounts'),
    fields: v.record(v.string(), v.union(v.string(), v.array(v.string()), v.boolean())),
    step: v.number(),
    logoId: v.optional(v.id('_storage')),
    photoIds: v.array(v.id('_storage')),
    docIds: v.optional(v.array(v.object({ kind: v.string(), id: v.id('_storage') }))),
    updatedAt: v.number(),
  }).index('by_account', ['accountId']),
  // The free website's delivery, from the first brief to live (config/website-brief.js WEBSITE_STAGES). Promised by dueAt.
  websiteProjects: defineTable({
    accountId: v.id('accounts'),
    stage: v.string(),
    stageAt: v.record(v.string(), v.number()),
    dueAt: v.number(),
    domain: v.optional(v.string()),
    mailbox: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    note: v.optional(v.string()),
    delayReason: v.optional(v.string()),
    payments: v.optional(v.object({ stage: v.string(), stageAt: v.record(v.string(), v.number()) })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_account', ['accountId'])
    .index('by_stage_due', ['stage', 'dueAt']),
  // Logo, photos and Paymob documents uploaded for a brief, byte-checked by the HTTP route. A row keeps its file from the orphan sweep.
  websiteBriefFiles: defineTable({
    accountId: v.id('accounts'),
    storageId: v.id('_storage'),
    kind: v.union(
      v.literal('logo'),
      v.literal('photo'),
      v.literal('doc_cr'),
      v.literal('doc_id'),
      v.literal('doc_bank'),
      v.literal('doc_tax'),
      v.literal('doc_forms'),
      v.literal('doc_invoice'),
    ),
    name: v.optional(v.string()),
    at: v.number(),
  })
    .index('by_storage', ['storageId'])
    .index('by_account', ['accountId']),
};
