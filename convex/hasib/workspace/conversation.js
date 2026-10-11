// A customer's most recent conversation in the tenant, and whether they opted out on any of them.
// Every sector's drafts and records read it, so it lives in the shared kit.

export async function conversationOf(ctx, accountId, contactId) {
  const rows = (await ctx.db.query('blueConversations').withIndex('by_contact', q => q.eq('contactId', contactId)).take(20)).filter(c => c.accountId === accountId);
  const latest = rows.sort((x, y) => (y.lastInbound || 0) - (x.lastInbound || 0))[0] || null;
  return { conversation: latest, optedOut: rows.some(c => c.optout) };
}
