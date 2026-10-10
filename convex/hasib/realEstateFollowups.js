// Deals → Follow-ups: one queue built from the records that already exist (tasks, drafts and
// dated follow-ups), the deal context Chats and Customers show, and commission balances.
// Chats and customer profiles read these same rows; nothing here keeps a second queue.
import { owned } from '../blueTenant.js';
import { ok, fail } from './shared.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { OPEN_STAGES, canSeeDeal, publicRow, readable } from './realEstateBoard.js';

const SCAN = 500, DONE_SCAN = 50, MAX_SNOOZE_MS = 30 * 86400000;
export const FOLLOWUP_FILTERS = ['today', 'overdue', 'scheduled', 'approval', 'blocked', 'completed'];
const BLOCKED_TASKS = new Set(['template_required', 'send_failed']);
const DRAFT_BUCKET = {
  draft: 'approval', blocked: 'blocked', template_required: 'blocked', failed: 'blocked',
  queued: 'completed', queued_template: 'completed', provider_submitted: 'completed', delivered: 'completed', read: 'completed', cancelled: 'completed',
};
const ENTITY_TABLE = { opportunity: 'realEstateOpportunities', viewing: 'realEstateViewings', offer: 'realEstateOffers', draft: 'realEstateDrafts' };

/** Where an open item sits: today, overdue (before today), or scheduled (later). */
export const dueBucket = (dueAt, now, today) => dueAt > now ? 'scheduled' : dueAt < today.from ? 'overdue' : 'today';

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
  const open = await ctx.db.query('realEstateTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const resolved = await ctx.db.query('realEstateTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(DONE_SCAN);
  for (const t of [...open, ...resolved]) {
    const deal = await dealOf(ctx, accountId, t.entityType, t.entityId, cache);
    if (t.entityType !== 'property' && !visible(deal)) continue;
    if (t.entityType === 'property' && actor.role === 'employee' && t.assignedAccountId && String(t.assignedAccountId) !== String(actor.actorAccountId)) continue;
    const due = t.snoozedUntil || t.dueAt || t.createdAt;
    const bucket = t.status !== 'open' ? 'completed' : BLOCKED_TASKS.has(t.kind) ? 'blocked' : dueBucket(due, now, today);
    rows.push({ id: t._id, source: 'task', kind: t.kind, reason: t.reason, bucket, dueAt: due, entityType: t.entityType, entityId: t.entityId,
      opportunityId: deal?._id || null, assignedAccountId: t.assignedAccountId || deal?.assignedAccountId || null, version: t.updatedAt,
      ...(t.snoozedUntil ? { snoozedUntil: t.snoozedUntil } : {}), ...(t.resolution ? { resolution: t.resolution, resolvedAt: t.resolvedAt } : {}) });
  }
  const drafts = await ctx.db.query('realEstateDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  for (const d of drafts) {
    const deal = await dealOf(ctx, accountId, 'draft', d._id, cache);
    if (!visible(deal)) continue;
    const bucket = DRAFT_BUCKET[d.status] || 'blocked';
    if (bucket === 'completed' && rows.filter(r => r.bucket === 'completed').length >= DONE_SCAN) continue;
    rows.push({ id: d._id, source: 'draft', kind: d.kind, reason: d.ruleId ? `rule:${d.ruleId}` : 'draft', bucket, dueAt: d.approvedAt || d.createdAt, entityType: 'draft', entityId: String(d._id),
      opportunityId: deal._id, assignedAccountId: deal.assignedAccountId || null, version: d.version, sendStatus: d.status, text: d.text, ...(d.ruleId ? { ruleId: d.ruleId } : {}) });
  }
  const dated = await ctx.db.query('hasibFollowups').withIndex('by_account_due', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  for (const f of dated) {
    if (f.linkedType !== 'opportunity') continue;
    const deal = await dealOf(ctx, accountId, 'opportunity', f.linkedId, cache);
    if (!visible(deal)) continue;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: f.status === 'completed' ? 'completed' : dueBucket(f.dueAt, now, today), dueAt: f.dueAt,
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
  const filter = a.filter && FOLLOWUP_FILTERS.includes(a.filter) ? a.filter : null;
  const { rows, cache } = await queueRows(ctx, tenant, actor, now);
  const counts = Object.fromEntries(FOLLOWUP_FILTERS.map(f => [f, rows.filter(r => r.bucket === f).length]));
  const chosen = rows.filter(r => (!filter || r.bucket === filter) && (!a.opportunityId || String(r.opportunityId) === String(a.opportunityId)));
  chosen.sort((x, y) => ORDER[x.bucket] - ORDER[y.bucket] || (x.bucket === 'completed' ? y.dueAt - x.dueAt : x.dueAt - y.dueAt));
  return ok({ items: await describe(ctx, tenant.accountId, chosen.slice(0, 200), cache), counts, actionable: counts.today + counts.overdue + counts.approval + counts.blocked });
}

/** Moves an open task to a later time. The version is the task's last update, so a stale screen cannot snooze twice. */
export async function snoozeTask(ctx, tenant, actor, a, now) {
  const task = await owned(ctx, a.taskId, tenant.accountId, 'realEstateTasks');
  if (!task || task.status !== 'open') return fail('task_not_found');
  const deal = await dealOf(ctx, tenant.accountId, task.entityType, task.entityId, new Map());
  if (task.entityType !== 'property' && (!deal || !canSeeDeal(actor, deal))) return fail('task_not_found');
  if (a.version !== task.updatedAt) return fail('task_conflict');
  if (!Number.isSafeInteger(a.dueAt) || a.dueAt <= now || a.dueAt > now + MAX_SNOOZE_MS) return fail('invalid_snooze');
  await ctx.db.patch(task._id, { snoozedUntil: a.dueAt, updatedAt: now });
  await audit(ctx, tenant, actor, 'task_snoozed', 'task', task._id, now, String(a.dueAt));
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** A customer's deals with their next viewing, latest offer, latest message draft and open follow-ups. */
export async function dealContext(ctx, tenant, actor, a, now) {
  let contactId = a.contactId;
  if (!contactId && a.conversationId) contactId = (await owned(ctx, a.conversationId, tenant.accountId, 'blueConversations'))?.contactId;
  if (!contactId || !await owned(ctx, contactId, tenant.accountId, 'blueContacts')) return ok({ items: [] });
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
