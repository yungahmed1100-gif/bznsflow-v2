// Interval conflicts for a resource. The indexed range read joins the mutation's read set, so a
// concurrent insert into the same range makes Convex retry the transaction (bookingsState.js:25).

/**
 * Rows on `index` (eq fields, then a start-time field) that overlap [startsAt, endsAt).
 * `maxSpanMs` bounds how long any row may last, so the lookback finds every row that started earlier.
 */
export async function findOverlaps(ctx, { table, index, eq, startField = 'startsAt', startsAt, endsAt, maxSpanMs, statuses, excludeId }) {
  const rows = await ctx.db.query(table).withIndex(index, q => {
    let r = q;
    for (const [field, value] of eq) r = r.eq(field, value);
    return r.gte(startField, startsAt - maxSpanMs).lt(startField, endsAt);
  }).take(500);
  return rows.filter(r => r.endsAt > startsAt && (!statuses || statuses.has(r.status)) && (!excludeId || String(r._id) !== String(excludeId)));
}
