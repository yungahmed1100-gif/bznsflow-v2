import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeApex, executeApexAdmin } from './apexState.js';

// Apex requests from the public page (convex/apexState.js). The Vercel API is the only caller.
export const execute = internalMutation({
  args: { operation: v.literal('request'), request: v.optional(v.any()) },
  handler: (ctx, args) => executeApex(ctx, args),
});

// Ahmed's /owner/apex queue.
export const admin = internalMutation({
  args: {
    operation: v.union(v.literal('list'), v.literal('update')),
    sessionHash: v.string(),
    requestId: v.optional(v.string()),
    status: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: (ctx, args) => executeApexAdmin(ctx, args),
});
