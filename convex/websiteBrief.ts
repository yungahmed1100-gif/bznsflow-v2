import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeWebsiteBrief } from './websiteBriefState.js';

export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('get'), v.literal('upload_url'), v.literal('file_register'), v.literal('submit'), v.literal('emailed')),
    sessionHash: v.string(),
    storageId: v.optional(v.string()),
    kind: v.optional(v.string()),
    fileCheck: v.optional(v.string()),
    version: v.optional(v.number()),
    fields: v.optional(v.any()),
    logoId: v.optional(v.union(v.string(), v.null())),
    photoIds: v.optional(v.array(v.string())),
    emailId: v.optional(v.string()),
  },
  handler: (ctx, args) => executeWebsiteBrief(ctx, args),
});
