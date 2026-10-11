// Productions → Follow-ups: one queue built from tasks, rule and manual drafts, cuts waiting on the
// client and dated follow-ups linked to a production. Chats and Customers read these same rows.
import { owned } from '../blueTenant.js';
import { ok } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, datedFollowups, datedBucket, queueSelection, resolveTask, snoozeTask, contextContact } from './workspace/followups.js';
import { loadStudio, canSeeProduction, describe } from './mediaBoard.js';
import { latestCut } from './mediaDomain.js';

export const MEDIA_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const DECISION_TASKS = new Set(['extra_scope_decision', 'hold_conflict']);
const WAITING_TASKS = new Set(['deposit_missing']);
const DRAFT_BUCKET = draftBuckets('decision');

/** Which production each task entity belongs to. */
function owners(studio) {
  const of = new Map();
  for (const p of studio.productions) of.set(`production:${p._id}`, p);
  const byId = new Map(studio.productions.map(p => [String(p._id), p]));
  for (const [type, rows] of [['cut', studio.cuts], ['change_order', studio.changeOrders], ['reservation', studio.reservations], ['draft', studio.drafts]])
    for (const r of rows) of.set(`${type}:${r._id}`, byId.get(String(r.productionId)) || null);
  return of;
}

async function queueRows(ctx, tenant, actor, now) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId));
  const studio = await loadStudio(ctx, accountId), of = owners(studio), rows = [];
  const visible = p => !!p && canSeeProduction(actor, p);
  for (const t of await taskRows(ctx, 'mediaTasks', accountId)) {
    const p = of.get(`${t.entityType}:${t.entityId}`);
    if (!visible(p)) continue;
    const { due, bucket } = taskTiming(t, now, today, { decision: DECISION_TASKS, waiting: WAITING_TASKS });
    rows.push({ ...taskBase(t, due, bucket), productionId: p._id, assignedAccountId: t.assignedAccountId || p.producerId || null, version: t.updatedAt, ...taskTail(t) });
  }
  for (const d of studio.drafts) {
    const p = of.get(`draft:${d._id}`);
    if (!visible(p)) continue;
    const row = draftRow(d, rows, DRAFT_BUCKET, 'draft', { productionId: p._id, assignedAccountId: p.producerId || null });
    if (row) rows.push(row);
  }
  // The client owes a decision on the current cut: waiting on the customer until it is due.
  for (const p of studio.productions) {
    if (p.status !== 'review' || !visible(p)) continue;
    const cut = latestCut(studio.cutsOf.get(String(p._id)) || []);
    if (cut?.status === 'in_review' && cut.decisionDueAt >= now) rows.push({ id: cut._id, source: 'cut', kind: 'cut_in_review', reason: `Cut ${cut.label} is with ${cut.approverName}`, bucket: 'waiting',
      dueAt: cut.decisionDueAt, entityType: 'cut', entityId: String(cut._id), productionId: p._id, assignedAccountId: p.producerId || null, version: cut.version });
  }
  const byId = new Map(studio.productions.map(p => [String(p._id), p]));
  for (const f of await datedFollowups(ctx, accountId, 'production')) {
    const p = byId.get(String(f.linkedId));
    if (!visible(p)) continue;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: datedBucket(f, now, today), dueAt: f.dueAt,
      entityType: 'production', entityId: String(p._id), productionId: p._id, assignedAccountId: p.producerId || null, version: f.version });
  }
  return { rows, studio, byId };
}

export async function mediaFollowupQueue(ctx, tenant, actor, a, now) {
  const { rows, studio, byId } = await queueRows(ctx, tenant, actor, now);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: MEDIA_FILTERS, order: ORDER, filter: a.filter, match: r => !a.productionId || String(r.productionId) === String(a.productionId),
    actionable: ['today', 'overdue', 'decision', 'blocked'] });
  const cards = new Map((await describe(ctx, tenant.accountId, actor, studio, [...new Set(chosen.map(r => String(r.productionId)))].map(id => byId.get(id)), now)).map(c => [String(c.id), c]));
  const items = chosen.map(r => { const c = cards.get(String(r.productionId)); return { ...r, ref: c?.ref, title: c?.title, contactName: c?.contactName || null, conversationId: c?.conversationId || null, status: c?.status || null, channel: c?.source || null }; });
  return ok({ items, counts, actionable });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'mediaTasks');
  if (!task) return null;
  const table = { production: 'mediaProductions', cut: 'mediaCuts', change_order: 'mediaChangeOrders', reservation: 'mediaReservations', draft: 'mediaDrafts' }[task.entityType];
  const row = table ? await owned(ctx, task.entityId, tenant.accountId, table) : null;
  const p = row && (table === 'mediaProductions' ? row : await owned(ctx, row.productionId, tenant.accountId, 'mediaProductions'));
  return p && canSeeProduction(actor, p) ? task : null;
}

export const resolveMediaTask = async (ctx, tenant, actor, a, now) => resolveTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);
export const snoozeMediaTask = async (ctx, tenant, actor, a, now) => snoozeTask(ctx, tenant, actor, await visibleTask(ctx, tenant, actor, a.taskId), a, now);

/** A customer's productions with the current cut, next shoot and open follow-ups, for Chats and Customers. */
export async function mediaContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
  const mine = (await ctx.db.query('mediaProductions').withIndex('by_contact', q => q.eq('contactId', contactId)).take(20)).filter(p => p.accountId === tenant.accountId && canSeeProduction(actor, p));
  if (!mine.length) return ok({ items: [] });
  const { rows, studio } = await queueRows(ctx, tenant, actor, now);
  const live = p => !['delivered', 'closed', 'cancelled'].includes(p.status);
  mine.sort((x, y) => Number(live(y)) - Number(live(x)) || y.updatedAt - x.updatedAt);
  const items = (await describe(ctx, tenant.accountId, actor, studio, mine, now)).map(card => {
    const followups = rows.filter(r => String(r.productionId) === String(card.id) && r.bucket !== 'completed');
    return { ...card, followups: followups.slice(0, 3), openFollowups: followups.length };
  });
  return ok({ items });
}
