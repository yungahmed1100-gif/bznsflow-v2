import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeAccess } from './blueAccessState.js';

export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('list'), v.literal('grant'), v.literal('revoke')),
    sessionHash: v.string(),
    email: v.optional(v.string()),
    plan: v.optional(v.union(v.literal('catalyst'), v.literal('ascend'))),
    note: v.optional(v.string()),
    packId: v.optional(v.string()),
  },
  handler: (ctx, args) => executeAccess(ctx, args),
});
