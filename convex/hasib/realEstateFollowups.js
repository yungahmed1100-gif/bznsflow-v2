// Deals → Follow-ups: one queue built from the records that already exist (tasks, drafts and
// dated follow-ups), the deal context Chats and Customers show, and commission balances.
// Chats and customer profiles read these same rows; nothing here keeps a second queue.
import { owned } from '../blueTenant.js';
import { ok, fail } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { OPEN_STAGES, canSeeDeal, publicRow, readable } from './realEstateBoard.js';
import { dueBucket } from './workspace/queue.js';
import { SCAN, draftBuckets, taskRows, taskTiming, taskBase, taskTail, draftRow, datedFollowups, datedBucket, queueSelection, snoozeTask as snoozeOwnTask, contextContact } from './workspace/followups.js';

export const FOLLOWUP_FILTERS = ['today', 'overdue', 'scheduled', 'approval', 'blocked', 'completed'];
// Real Estate's drafts wait in "approval"; the other sectors call that bucket "decision".
const DRAFT_BUCKET = draftBuckets('approval');
const ENTITY_TABLE = { opportunity: 'realEstateOpportunities', viewing: 'realEstateViewings', offer: 'realEstateOffers', draft: 'realEstateDrafts' };

export { dueBucket };

/** The deal a task, draft or follow-up belongs to, through its record. */
async function dealOf(ctx, accountId, entityType, entityId, cache) {
  const table = ENTITY_TABLE[entityType];
  if (!table) return null;
  const k = `${entityType}:${entityId}`;
  if (!cache.has(k)) {
    const row = await owned(ctx, entityId, accountId, table);
    const deal = row && (table === 'realEstateOpportunities' ? row : await owned(ctx, row.opportunityId, accountId, 'realEstateOpportunities'));
    cache.set(k, deal || null);
  }
  return cache.get(k);
}

/** Every follow-up row the actor may see, newest cause first within each bucket. */
async function queueRows(ctx, tenant, actor, now) {
  const accountId = tenant.accountId, today = periodRange('today', now, await businessTimezone(ctx, accountId)), cache = new Map(), rows = [];
  const visible = deal => !!deal && canSeeDeal(actor, deal);
  for (const t of await taskRows(ctx, 'realEstateTasks', accountId)) {
    const deal = await dealOf(ctx, accountId, t.entityType, t.entityId, cache);
    if (t.entityType !== 'property' && !visible(deal)) continue;
    if (t.entityType === 'property' && actor.role === 'employee' && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const { due, bucket } = taskTiming(t, now, today);
    rows.push({ ...taskBase(t, due, bucket), opportunityId: deal?._id || null, assignedAccountId: t.assignedAccountId || deal?.assignedAccountId || null, version: t.updatedAt, ...taskTail(t) });
  }
  const drafts = await ctx.db.query('realEstateDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  for (const d of drafts) {
    const deal = await dealOf(ctx, accountId, 'draft', d._id, cache);
    if (!visible(deal)) continue;
    const row = draftRow(d, rows, DRAFT_BUCKET, 'draft', { opportunityId: deal._id, assignedAccountId: deal.assignedAccountId || null });
    if (row) rows.push(row);
  }
  for (const f of await datedFollowups(ctx, accountId, 'opportunity')) {
    const deal = await dealOf(ctx, accountId, 'opportunity', f.linkedId, cache);
    if (!visible(deal)) continue;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: datedBucket(f, now, today), dueAt: f.dueAt,
      entityType: 'opportunity', entityId: String(deal._id), opportunityId: deal._id, assignedAccountId: deal.assignedAccountId || null, version: f.version });
  }
  return { rows, cache };
}

/** Names, property labels and the conversation for each row, so it reads without opening the deal. */
async function describe(ctx, accountId, rows, cache) {
  const deals = [...new Map(rows.filter(r => r.opportunityId).map(r => [String(r.opportunityId), cache.get(`opportunity:${r.opportunityId}`) || null])).entries()];
  const missing = deals.filter(([, d]) => !d).map(([id]) => id);
  for (const id of missing) cache.set(`opportunity:${id}`, await owned(ctx, id, accountId, 'realEstateOpportunities'));
  const readableDeals = new Map((await readable(ctx, accountId, deals.map(([id]) => cache.get(`opportunity:${id}`)).filter(Boolean))).map(d => [String(d.id), d]));
  const properties = new Map();
  for (const r of rows) if (r.entityType === 'property' && !properties.has(r.entityId)) properties.set(r.entityId, await owned(ctx, r.entityId, accountId, 'hasibProperties'));
  return rows.map(r => {
    const deal = r.opportunityId ? readableDeals.get(String(r.opportunityId)) : null, property = properties.get(r.entityId);
    return { ...r, contactName: deal?.contactName || null, conversationId: deal?.conversationId || null, channel: deal?.source || null, stage: deal?.stage || null,
      ...(property ? { propertyLabel: property.label } : {}) };
  });
}

const ORDER = { overdue: 0, today: 1, approval: 2, blocked: 3, scheduled: 4, completed: 5 };
export async function followupQueue(ctx, tenant, actor, a, now) {
  const { rows, cache } = await queueRows(ctx, tenant, actor, now);
  const { counts, chosen, actionable } = queueSelection(rows, { filters: FOLLOWUP_FILTERS, order: ORDER, filter: a.filter, match: r => !a.opportunityId || String(r.opportunityId) === String(a.opportunityId),
    actionable: ['today', 'overdue', 'approval', 'blocked'] });
  return ok({ items: await describe(ctx, tenant.accountId, chosen, cache), counts, actionable });
}

/** Moves an open task to a later time. The version is the task's last update, so a stale screen cannot snooze twice. */
export async function snoozeTask(ctx, tenant, actor, a, now) {
  const task = await owned(ctx, a.taskId, tenant.accountId, 'realEstateTasks');
  if (!task || task.status !== 'open') return fail('task_not_found');
  const deal = await dealOf(ctx, tenant.accountId, task.entityType, task.entityId, new Map());
  if (task.entityType !== 'property' && (!deal || !canSeeDeal(actor, deal))) return fail('task_not_found');
  return snoozeOwnTask(ctx, tenant, actor, task, a, now);
}

/** A customer's deals with their next viewing, latest offer, latest message draft and open follow-ups. */
export async function dealContext(ctx, tenant, actor, a, now) {
  const contactId = await contextContact(ctx, tenant, a);
  if (!contactId) return ok({ items: [] });
  const rows = (await ctx.db.query('realEstateOpportunities').withIndex('by_contact_stage', q => q.eq('contactId', contactId)).take(20))
    .filter(o => o.accountId === tenant.accountId && canSeeDeal(actor, o))
    .sort((x, y) => Number(OPEN_STAGES.includes(y.stage)) - Number(OPEN_STAGES.includes(x.stage)) || y.updatedAt - x.updatedAt);
  if (!rows.length) return ok({ items: [] });
  const queue = (await followupQueue(ctx, tenant, actor, {}, now)).value.items;
  const items = [];
  for (const deal of await readable(ctx, tenant.accountId, rows)) {
    const viewings = await ctx.db.query('realEstateViewings').withIndex('by_opportunity', q => q.eq('opportunityId', deal.id)).take(50);
    const next = viewings.filter(v => v.scheduledAt >= now && ['requested', 'confirmed'].includes(v.status)).sort((x, y) => x.scheduledAt - y.scheduledAt)[0];
    const offers = (await ctx.db.query('realEstateOffers').withIndex('by_opportunity', q => q.eq('opportunityId', deal.id)).take(50)).sort((x, y) => y.updatedAt - x.updatedAt);
    const drafts = (await ctx.db.query('realEstateDrafts').withIndex('by_opportunity', q => q.eq('opportunityId', deal.id)).take(50)).sort((x, y) => y.updatedAt - x.updatedAt);
    const followups = queue.filter(r => String(r.opportunityId) === String(deal.id) && r.bucket !== 'completed');
    items.push({ ...deal, nextViewing: next ? (await readable(ctx, tenant.accountId, [next]))[0] : null, latestOffer: offers[0] ? publicRow(offers[0]) : null,
      latestDraft: drafts[0] ? { id: drafts[0]._id, status: drafts[0].status, kind: drafts[0].kind } : null, followups: followups.slice(0, 3), openFollowups: followups.length });
  }
  return ok({ items });
}

/** Commission rows with the order's money: the order is the one record of what is paid and owed. */
export async function commissionRows(ctx, accountId, rows) {
  const out = [];
  for (const row of await readable(ctx, accountId, rows)) {
    const order = await owned(ctx, row.orderId, accountId, 'hasibOrders');
    const balanceMinor = order ? Math.max(0, order.totalMinor - order.paidMinor) : 0;
    out.push({ ...row, paidMinor: order?.paidMinor ?? 0, balanceMinor, status: order && balanceMinor === 0 ? 'paid' : 'due' });
  }
  return out;
}
