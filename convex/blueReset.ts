import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { resetAccount, resetMessages } from './blueResetState.js';

// Operator-only (npx convex run blueReset:account); never reachable over HTTP.
// Run with dryRun:true first to see what would be removed.
export const account = internalMutation({
  args: { email: v.string(), confirm: v.optional(v.literal(true)), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const result: { ok: boolean; reason?: string; value?: unknown } = await resetAccount(ctx, args);
    if (!result.ok) throw new Error(result.reason);
    return result.value;
  },
});

// Operator-only (npx convex run blueReset:messages): clears one account's chats and chat contacts and
// keeps its setup, connection, catalog and settings. Run with dryRun:true first; re-run while done is false.
export const messages = internalMutation({
  args: { email: v.string(), confirm: v.optional(v.literal(true)), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const result: { ok: boolean; reason?: string; value?: unknown } = await resetMessages(ctx, args);
    if (!result.ok) throw new Error(result.reason);
    return result.value;
  },
});
