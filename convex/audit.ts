import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeAudit, executeAuditAdmin } from './auditState.js';

// Free-audit booking from the public page (convex/auditState.js). The Vercel API is the only caller.
export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('slots'), v.literal('book')),
    startAt: v.optional(v.number()),
    booking: v.optional(v.any()),
  },
  handler: (ctx, args) => executeAudit(ctx, args),
});

// Ahmed's Audits tab.
export const admin = internalMutation({
  args: {
    operation: v.union(v.literal('list'), v.literal('update')),
    sessionHash: v.string(),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    bookingId: v.optional(v.string()),
    status: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: (ctx, args) => executeAuditAdmin(ctx, args),
});
