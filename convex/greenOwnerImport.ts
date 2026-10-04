import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { importOwnerSnapshot, bindOwnerImport } from './greenOwnerImportState.js';

export const importReviewed = internalMutation({
  args: { snapshot: v.any(), draftHash: v.string() },
  handler: async (ctx, args) => {
    if (process.env.PUBLIC_SITE_ORIGIN !== 'https://www.bznsflowai.com' || process.env.GREEN_MIGRATION_ENABLED !== 'true') throw Error('green_migration_disabled');
    return importOwnerSnapshot(ctx, args, Date.now(), process.env.CONVEX_SERVICE_SECRET);
  },
});

export const bindVerifiedConnection = internalMutation({
  args: {},
  handler: async ctx => {
    if (process.env.PUBLIC_SITE_ORIGIN !== 'https://www.bznsflowai.com' || process.env.GREEN_MIGRATION_ENABLED !== 'true') throw Error('green_migration_disabled');
    return bindOwnerImport(ctx);
  },
});
