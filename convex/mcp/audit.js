const DAY = 86400000;
/** One activity row per connection event; kept 30 days. */
export async function audit(ctx, p, tool, status, now, runId) {
  await ctx.db.insert('mcpAudit', {
    accountId: p.account._id,
    connectionId: p.connection._id,
    tool,
    status,
    at: now,
    expiresAt: now + 30 * DAY,
    ...(runId ? { runId } : {}),
  });
}
