// Tasks a sector opens from its own records. An automatic task closes itself once its cause is
// gone; a rule task is keyed by when it fired, fires once, and is never reopened after someone
// resolved it. Nothing here sends a message.

const SCAN = 500;

/**
 * Brings one task table up to date with what the records call for right now.
 * @param {object} o
 * @param {string} o.table task table (by_account_status and by_entity indexes)
 * @param {Array<{kind:string, entityType:string, entityId:string, reason:string, dueAt?:number, assignedAccountId?:string}>} o.wanted
 * @param {Set<string>} o.autoKinds kinds this sync may close when no longer wanted
 * @param {Set<string>} o.ruleKinds kinds keyed by their firing time
 */
export async function reconcileTasks(ctx, { table, accountId, wanted, autoKinds, ruleKinds, now }) {
  const key = (kind, entityId, dueAt) => ruleKinds.has(kind) ? `${kind}:${entityId}:${dueAt}` : `${kind}:${entityId}`;
  const wantedKeys = new Set(wanted.map(w => key(w.kind, String(w.entityId), w.dueAt)));
  const open = await ctx.db.query(table).withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const openKeys = new Set(open.map(t => key(t.kind, t.entityId, t.dueAt)));
  for (const t of open) if (autoKinds.has(t.kind) && !wantedKeys.has(key(t.kind, t.entityId, t.dueAt)))
    await ctx.db.patch(t._id, { status: 'resolved', resolvedAt: now, resolution: 'cleared', updatedAt: now });
  for (const w of wanted) {
    const entityId = String(w.entityId), k = key(w.kind, entityId, w.dueAt);
    if (openKeys.has(k)) continue;
    // A rule fires once: a task someone resolved is not reopened for the same firing.
    if (ruleKinds.has(w.kind) && (await ctx.db.query(table).withIndex('by_entity', q => q.eq('entityType', w.entityType).eq('entityId', entityId)).take(50)).some(t => t.kind === w.kind && t.dueAt === w.dueAt)) continue;
    await ctx.db.insert(table, { accountId, kind: w.kind, entityType: w.entityType, entityId, status: 'open', reason: w.reason,
      ...(w.dueAt ? { dueAt: w.dueAt } : {}), ...(w.assignedAccountId ? { assignedAccountId: w.assignedAccountId } : {}), createdAt: now, updatedAt: now });
    openKeys.add(k);
  }
}

/** Opens one task unless the same kind is already open for the record (e.g. a send that needs a template). */
export async function openTaskOnce(ctx, table, { accountId, kind, entityType, entityId, reason, assignedAccountId }, now) {
  const existing = await ctx.db.query(table).withIndex('by_entity', q => q.eq('entityType', entityType).eq('entityId', String(entityId))).take(50);
  if (existing.some(t => t.status === 'open' && t.kind === kind)) return;
  await ctx.db.insert(table, { accountId, kind, entityType, entityId: String(entityId), status: 'open', reason, ...(assignedAccountId ? { assignedAccountId } : {}), createdAt: now, updatedAt: now });
}
