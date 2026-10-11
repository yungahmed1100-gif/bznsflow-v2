// Productions → Follow-ups: one queue built from tasks, rule and manual drafts, cuts waiting on the
// client and dated follow-ups linked to a production. Chats and Customers read these same rows.
import { owned } from '../blueTenant.js';
import { ok, fail } from './shared.js';
import { audit } from './workspaceState.js';
import { businessTimezone } from './expensesState.js';
import { periodRange } from './period.js';
import { publicRow } from './workspace/rows.js';
import { dueBucket, sortQueue, validSnooze } from './workspace/queue.js';
import { loadStudio, canSeeProduction, describe } from './mediaBoard.js';
import { latestCut } from './mediaDomain.js';

const DONE_SCAN = 50, SCAN = 500;
export const MEDIA_FILTERS = ['today', 'overdue', 'scheduled', 'waiting', 'decision', 'blocked', 'completed'];
const ORDER = { overdue: 0, today: 1, decision: 2, blocked: 3, waiting: 4, scheduled: 5, completed: 6 };
const BLOCKED_TASKS = new Set(['template_required', 'send_failed']);
const DECISION_TASKS = new Set(['extra_scope_decision', 'hold_conflict']);
const WAITING_TASKS = new Set(['deposit_missing']);
const DRAFT_BUCKET = {
  draft: 'decision', blocked: 'blocked', template_required: 'blocked', failed: 'blocked',
  queued: 'completed', queued_template: 'completed', provider_submitted: 'completed', delivered: 'completed', read: 'completed', cancelled: 'completed',
};

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
  const open = await ctx.db.query('mediaTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(SCAN);
  const resolved = await ctx.db.query('mediaTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'resolved')).order('desc').take(DONE_SCAN);
  for (const t of [...open, ...resolved]) {
    const p = of.get(`${t.entityType}:${t.entityId}`);
    if (!visible(p)) continue;
    const due = t.snoozedUntil || t.dueAt || t.createdAt;
    const bucket = t.status !== 'open' ? 'completed' : BLOCKED_TASKS.has(t.kind) ? 'blocked' : DECISION_TASKS.has(t.kind) ? 'decision' : WAITING_TASKS.has(t.kind) ? 'waiting' : dueBucket(due, now, today);
    rows.push({ id: t._id, source: 'task', kind: t.kind, reason: t.reason, bucket, dueAt: due, entityType: t.entityType, entityId: t.entityId, productionId: p._id,
      assignedAccountId: t.assignedAccountId || p.producerId || null, version: t.updatedAt, ...(t.snoozedUntil ? { snoozedUntil: t.snoozedUntil } : {}),
      ...(t.resolution ? { resolution: t.resolution, resolvedAt: t.resolvedAt } : {}) });
  }
  for (const d of studio.drafts) {
    const p = of.get(`draft:${d._id}`);
    if (!visible(p)) continue;
    const bucket = DRAFT_BUCKET[d.status] || 'blocked';
    if (bucket === 'completed' && rows.filter(r => r.bucket === 'completed').length >= DONE_SCAN) continue;
    rows.push({ id: d._id, source: 'draft', kind: d.kind, reason: d.ruleId ? `rule:${d.ruleId}` : 'draft', bucket, dueAt: d.approvedAt || d.createdAt, entityType: 'draft', entityId: String(d._id),
      productionId: p._id, assignedAccountId: p.producerId || null, version: d.version, sendStatus: d.status, text: d.text, ...(d.ruleId ? { ruleId: d.ruleId } : {}) });
  }
  // The client owes a decision on the current cut: waiting on the customer until it is due.
  for (const p of studio.productions) {
    if (p.status !== 'review' || !visible(p)) continue;
    const cut = latestCut(studio.cutsOf.get(String(p._id)) || []);
    if (cut?.status === 'in_review' && cut.decisionDueAt >= now) rows.push({ id: cut._id, source: 'cut', kind: 'cut_in_review', reason: `Cut ${cut.label} is with ${cut.approverName}`, bucket: 'waiting',
      dueAt: cut.decisionDueAt, entityType: 'cut', entityId: String(cut._id), productionId: p._id, assignedAccountId: p.producerId || null, version: cut.version });
  }
  const byId = new Map(studio.productions.map(p => [String(p._id), p]));
  const dated = await ctx.db.query('hasibFollowups').withIndex('by_account_due', q => q.eq('accountId', accountId)).order('desc').take(SCAN);
  for (const f of dated) {
    if (f.linkedType !== 'production') continue;
    const p = byId.get(String(f.linkedId));
    if (!visible(p)) continue;
    rows.push({ id: f._id, source: 'followup', kind: 'followup', reason: f.reason, bucket: f.status === 'completed' ? 'completed' : dueBucket(f.dueAt, now, today), dueAt: f.dueAt,
      entityType: 'production', entityId: String(p._id), productionId: p._id, assignedAccountId: p.producerId || null, version: f.version });
  }
  return { rows, studio, byId };
}

export async function mediaFollowupQueue(ctx, tenant, actor, a, now) {
  const filter = a.filter && MEDIA_FILTERS.includes(a.filter) ? a.filter : null;
  const { rows, studio, byId } = await queueRows(ctx, tenant, actor, now);
  const counts = Object.fromEntries(MEDIA_FILTERS.map(f => [f, rows.filter(r => r.bucket === f).length]));
  const chosen = sortQueue(rows.filter(r => (!filter || r.bucket === filter) && (!a.productionId || String(r.productionId) === String(a.productionId))), ORDER).slice(0, 200);
  const cards = new Map((await describe(ctx, tenant.accountId, actor, studio, [...new Set(chosen.map(r => String(r.productionId)))].map(id => byId.get(id)), now)).map(c => [String(c.id), c]));
  const items = chosen.map(r => { const c = cards.get(String(r.productionId)); return { ...r, ref: c?.ref, title: c?.title, contactName: c?.contactName || null, conversationId: c?.conversationId || null, status: c?.status || null, channel: c?.source || null }; });
  return ok({ items, counts, actionable: counts.today + counts.overdue + counts.decision + counts.blocked });
}

async function visibleTask(ctx, tenant, actor, id) {
  const task = await owned(ctx, id, tenant.accountId, 'mediaTasks');
  if (!task) return null;
  const table = { production: 'mediaProductions', cut: 'mediaCuts', change_order: 'mediaChangeOrders', reservation: 'mediaReservations', draft: 'mediaDrafts' }[task.entityType];
  const row = table ? await owned(ctx, task.entityId, tenant.accountId, table) : null;
  const p = row && (table === 'mediaProductions' ? row : await owned(ctx, row.productionId, tenant.accountId, 'mediaProductions'));
  return p && canSeeProduction(actor, p) ? task : null;
}

export async function resolveMediaTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task) return fail('task_not_found');
  if (task.status !== 'open') return ok(publicRow(task));
  await ctx.db.patch(task._id, { status: 'resolved', resolvedAt: now, resolvedBy: String(actor.actorAccountId), resolution: String(a.reason || 'done').slice(0, 200), updatedAt: now });
  await audit(ctx, tenant, actor, 'task_resolved', 'task', task._id, now, task.kind);
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** Moves an open task later. The version is its last update, so a stale screen cannot snooze twice. */
export async function snoozeMediaTask(ctx, tenant, actor, a, now) {
  const task = await visibleTask(ctx, tenant, actor, a.taskId);
  if (!task || task.status !== 'open') return fail('task_not_found');
  if (a.version !== task.updatedAt) return fail('task_conflict');
  if (!validSnooze(a.dueAt, now)) return fail('invalid_snooze');
  await ctx.db.patch(task._id, { snoozedUntil: a.dueAt, updatedAt: now });
  await audit(ctx, tenant, actor, 'task_snoozed', 'task', task._id, now, String(a.dueAt));
  return ok(publicRow(await ctx.db.get(task._id)));
}

/** A customer's productions with the current cut, next shoot and open follow-ups, for Chats and Customers. */
export async function mediaContext(ctx, tenant, actor, a, now) {
  let contactId = a.contactId;
  if (!contactId && a.conversationId) contactId = (await owned(ctx, a.conversationId, tenant.accountId, 'blueConversations'))?.contactId;
  if (!contactId || !await owned(ctx, contactId, tenant.accountId, 'blueContacts')) return ok({ items: [] });
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
