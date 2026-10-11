// Follow-up queue helpers shared by the sector workspaces.

export const MAX_SNOOZE_MS = 30 * 86400000;

/** Where an open item sits: today, overdue (before today), or scheduled (later). */
export const dueBucket = (dueAt, now, today) => dueAt > now ? 'scheduled' : dueAt < today.from ? 'overdue' : 'today';

/** Sorts rows by bucket order, then soonest due first (completed: most recent first). */
export const sortQueue = (rows, order) => rows.sort((x, y) => order[x.bucket] - order[y.bucket] || (x.bucket === 'completed' ? y.dueAt - x.dueAt : x.dueAt - y.dueAt));

/** A snooze is valid only to a future time within 30 days. */
export const validSnooze = (dueAt, now) => Number.isSafeInteger(dueAt) && dueAt > now && dueAt <= now + MAX_SNOOZE_MS;
