import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeProductSetup } from './productSetupState.js';
export const execute = internalMutation({
  args: { operation: v.union(v.literal('get'), v.literal('save')), sessionHash: v.string(), product: v.union(v.literal('catalyst'), v.literal('ascend')),
    step: v.optional(v.number()), completed: v.optional(v.boolean()), version: v.optional(v.number()), requestId: v.optional(v.string()), draftHash: v.optional(v.string()), packId: v.optional(v.string()),
    stockPolicy: v.optional(v.string()), vat: v.optional(v.object({ registered: v.boolean(), rateBps: v.number(), pricesIncludeVat: v.boolean(), vatin: v.optional(v.string()) })) },
  handler: (ctx, args) => executeProductSetup(ctx, args),
});
