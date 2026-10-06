import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

const BATCH = 500;
// Rollback aid only: step 4 does not exist on the previous release, so map it back to 1.
// One bounded page per call; repeat with `continueCursor` until `isDone`.
export const downgradeJourneyStep = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query('blueReviewSessions').paginate({ numItems: BATCH, cursor: args.cursor ?? null });
    let updated = 0;
    for (const row of page.page) if (row.journeyStep === 4) { await ctx.db.patch(row._id, { journeyStep: 1 }); updated++; }
    return { updated, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
