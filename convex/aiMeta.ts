// How one of Layla's replies was written: the model, its cost, and the prompt version that asked for it.
// Shared by the reply mutation's arguments and the stored message, so the two cannot drift apart.
import { v } from 'convex/values';

export const aiMeta = v.object({
  model: v.string(),
  ms: v.number(),
  tokensIn: v.number(),
  tokensOut: v.number(),
  attempts: v.number(),
  prompt: v.optional(v.string()),
  fallback: v.optional(v.string()),
});
