import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeBilling } from './billingState.js';

export const execute = internalMutation({
  args: {
    operation: v.union(v.literal('checkout'), v.literal('opened'), v.literal('transaction')),
    tokenHash: v.optional(v.string()),
    reference: v.optional(v.string()),
    plan: v.optional(v.string()),
    packId: v.optional(v.string()),
    interval: v.optional(v.string()),
    orderId: v.optional(v.number()),
    transactionId: v.optional(v.number()),
    success: v.optional(v.boolean()),
    pending: v.optional(v.boolean()),
    child: v.optional(v.boolean()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: (ctx, args) => executeBilling(ctx, args),
});
