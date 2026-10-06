import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { executeKnowledge } from './knowledgeSourceState.js';
export const execute = internalMutation({ args: {
  operation: v.union(...['list','save','publish','cancel','archive','open','open_draft','answers'].map(x => v.literal(x))), tokenHash: v.string(),
  requestId: v.optional(v.string()), sourceKey: v.optional(v.string()), title: v.optional(v.string()), kind: v.optional(v.string()), text: v.optional(v.string()),
  references: v.optional(v.array(v.object({ label: v.string(), text: v.string(), question: v.optional(v.string()), answer: v.optional(v.string()) }))), partial: v.optional(v.boolean()),
  version: v.optional(v.number()), expectedRevision: v.optional(v.number()), confirmed: v.optional(v.boolean()), acceptPartial: v.optional(v.boolean()),
}, handler: (ctx, args) => executeKnowledge(ctx, args) });
