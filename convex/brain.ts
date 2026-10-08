import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeBrain } from './brainState.js';

// Catalyst BznsBrain: review proposals, behaviour settings and Test Layla's context (convex/brainState.js).
// Proposal content, behaviour and the simulated customer are validated inside the executor.
export const execute = internalMutation({ args: {
  operation: v.union(...['state', 'test_context', 'record_extraction', 'accept', 'dismiss', 'settle_publish', 'behaviour_save', 'step'].map(s => v.literal(s))),
  sessionHash: v.string(), variant: v.optional(v.string()), history: v.optional(v.array(v.object({ role: v.string(), text: v.string() }))), sim: v.optional(v.any()),
  raw: v.optional(v.any()), chunk: v.optional(v.string()), sourceKind: v.optional(v.string()), sourceLabel: v.optional(v.string()),
  proposalId: v.optional(v.string()), text: v.optional(v.string()), section: v.optional(v.string()), replace: v.optional(v.boolean()), entry: v.optional(v.any()),
  behaviour: v.optional(v.any()), version: v.optional(v.number()), brainStep: v.optional(v.number()),
}, handler: (ctx, args) => executeBrain(ctx, args) });
