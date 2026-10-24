import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeWebsiteBrief } from './websiteBriefState.js';
import { executeWebsiteAdmin } from './websiteProjectsState.js';

export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('get'), v.literal('upload_url'), v.literal('file_register'), v.literal('submit'), v.literal('emailed'),
      v.literal('save_draft'), v.literal('domain_rate')),
    sessionHash: v.string(),
    storageId: v.optional(v.string()),
    kind: v.optional(v.string()),
    fileCheck: v.optional(v.string()),
    version: v.optional(v.number()),
    step: v.optional(v.number()),
    fields: v.optional(v.any()),
    logoId: v.optional(v.union(v.string(), v.null())),
    photoIds: v.optional(v.array(v.string())),
    emailId: v.optional(v.string()),
  },
  handler: (ctx, args) => executeWebsiteBrief(ctx, args),
});

// Ahmed's delivery queue for the free websites (convex/websiteProjectsState.js).
export const admin = internalMutation({
  args: {
    operation: v.union(v.literal('projects'), v.literal('project_update')),
    sessionHash: v.string(),
    projectId: v.optional(v.string()),
    action: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    dueAt: v.optional(v.number()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: (ctx, args) => executeWebsiteAdmin(ctx, args),
});
