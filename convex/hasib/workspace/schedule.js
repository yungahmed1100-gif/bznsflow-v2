// Which accounts Hasib's scheduled run visits (convex/hasib/automationRun.js). Kept free of sector
// imports so any sector's workspace can put itself on the schedule.
export const AUTOMATION_PACKS = new Set(['media', 'automotive', 'construction']);

/** Puts an account on (or off) the schedule. Cheap and idempotent: called when a workspace opens or its rules change. */
export async function ensureAutomation(ctx, accountId, packId, enabled, now) {
  const row = await ctx.db.query('hasibAutomation').withIndex('by_account', q => q.eq('accountId', accountId)).unique();
  const on = !!enabled && AUTOMATION_PACKS.has(packId);
  if (row && row.enabled === on && row.packId === packId) return;
  const value = { accountId, packId, enabled: on, nextRunAt: row?.nextRunAt && row.enabled === on ? row.nextRunAt : now, updatedAt: now };
  if (row) await ctx.db.patch(row._id, value); else await ctx.db.insert('hasibAutomation', value);
}

