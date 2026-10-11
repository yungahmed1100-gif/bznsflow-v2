// Media's shared reads: who may see a production, its linked records as one readable card,
// the tasks the records call for, and the Productions overview.
import { owned } from '../blueTenant.js';
import { ok, settingsFor } from './shared.js';
import { businessTimezone } from './expensesState.js';
import { displayName } from '../blueContacts.js';
import { publicRow } from './workspace/rows.js';
import { orderProfit } from './profit.js';
import { reconcileTasks } from './workspace/tasks.js';
import { mediaSettings } from './mediaSettings.js';
import { mediaRuleWanted, mediaDraftText, MEDIA_RULE_TASK_KINDS } from './mediaRules.js';
import { DAY, HOUR, ACTIVE, blocker, latestCut, prepMissing } from './mediaDomain.js';

const SCAN = 2000, ARABIC = /[؀-ۿ]/;
// Tasks the records open by themselves; each closes itself once its cause is gone.
export const MEDIA_AUTO_TASKS = new Set(['brief_incomplete', 'deposit_missing', 'shoot_at_risk', 'cut_overdue', 'extra_scope_decision', 'hold_expiring', 'hold_conflict',
  'shoot_completion_missing', 'costs_not_final', 'delivery_overdue', ...MEDIA_RULE_TASK_KINDS]);

/** Producers work their own productions and unassigned ones; managers see the whole studio. */
export const canSeeProduction = (actor, row) => actor.role !== 'employee' || !row.producerId || String(row.producerId) === String(actor.actorAccountId);

export async function visibleProduction(ctx, tenant, actor, id) {
  const row = id ? await owned(ctx, id, tenant.accountId, 'mediaProductions') : null;
  return row && canSeeProduction(actor, row) ? row : null;
}

const scan = (ctx, table, accountId, index = 'by_account_created') => ctx.db.query(table).withIndex(index, q => q.eq('accountId', accountId)).order('desc').take(SCAN);

/** Every Media record of the studio, read once, grouped by production. */
export async function loadStudio(ctx, accountId) {
  const [productions, cuts, changeOrders, reservations, costs, drafts, resources] = [await scan(ctx, 'mediaProductions', accountId), await scan(ctx, 'mediaCuts', accountId),
    await scan(ctx, 'mediaChangeOrders', accountId), await scan(ctx, 'mediaReservations', accountId, 'by_account_start'), await scan(ctx, 'mediaCosts', accountId),
    await scan(ctx, 'mediaDrafts', accountId), await ctx.db.query('mediaResources').withIndex('by_account', q => q.eq('accountId', accountId)).take(SCAN)];
  const orders = new Map();
  const orderIds = [...productions.map(p => p.orderId), ...changeOrders.map(c => c.orderId)].filter(Boolean);
  for (const id of orderIds) if (!orders.has(String(id))) orders.set(String(id), await owned(ctx, id, accountId, 'hasibOrders'));
  const group = rows => { const m = new Map(); for (const r of rows) m.set(String(r.productionId), [...(m.get(String(r.productionId)) || []), r]); return m; };
  const complete = [productions, cuts, changeOrders, reservations, costs].every(rows => rows.length < SCAN);
  return { productions, cuts, changeOrders, reservations, costs, drafts, resources, orders, complete,
    cutsOf: group(cuts), changesOf: group(changeOrders), holdsOf: group(reservations), costsOf: group(costs) };
}

/** The same shape as loadStudio for a few productions, read through their own indexes. */
export async function studioFor(ctx, accountId, productions) {
  const by = async table => (await Promise.all(productions.map(p => ctx.db.query(table).withIndex('by_production', q => q.eq('productionId', p._id)).take(500)))).flat();
  const [cuts, changeOrders, reservations, costs, drafts] = [await by('mediaCuts'), await by('mediaChangeOrders'), await by('mediaReservations'), await by('mediaCosts'), await by('mediaDrafts')];
  const orders = new Map();
  for (const id of [...productions.map(p => p.orderId), ...changeOrders.map(c => c.orderId)].filter(Boolean)) orders.set(String(id), await owned(ctx, id, accountId, 'hasibOrders'));
  const group = rows => { const m = new Map(); for (const r of rows) m.set(String(r.productionId), [...(m.get(String(r.productionId)) || []), r]); return m; };
  return { productions, cuts, changeOrders, reservations, costs, drafts, resources: [], orders, complete: true,
    cutsOf: group(cuts), changesOf: group(changeOrders), holdsOf: group(reservations), costsOf: group(costs) };
}

/** The production's linked records, as `blocker` and the cards read them. */
export function factsOf(studio, p, now) {
  const id = String(p._id);
  return { order: p.orderId ? studio.orders.get(String(p.orderId)) || null : null, reservations: studio.holdsOf.get(id) || [], cuts: studio.cutsOf.get(id) || [],
    changeOrders: studio.changesOf.get(id) || [], costs: studio.costsOf.get(id) || [], now };
}

/** Money for one production: the production order plus approved change orders; costs net of voided rows. */
export function moneyOf(studio, p, facts = factsOf(studio, p, 0)) {
  const orders = [facts.order, ...facts.changeOrders.filter(c => c.status === 'approved' && c.orderId).map(c => studio.orders.get(String(c.orderId)))].filter(Boolean);
  const live = facts.costs.filter(c => !c.voidedAt);
  const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);
  return { quoteMinor: p.quoteMinor, depositMinor: p.depositMinor, totalMinor: sum(orders, o => o.totalMinor), paidMinor: sum(orders, o => o.paidMinor),
    balanceMinor: sum(orders, o => Math.max(0, o.totalMinor - o.paidMinor)), depositMet: !!facts.order && facts.order.paidMinor >= p.depositMinor,
    revenueNetMinor: sum(orders.filter(o => !['cancelled', 'returned'].includes(o.status)), o => orderProfit(o).revenue),
    actualCostMinor: sum(live.filter(c => c.kind === 'actual'), c => c.amountMinor), committedCostMinor: sum(live.filter(c => c.kind === 'committed'), c => c.amountMinor) };
}

/** Cards the board, records and Chats read: customer name, current cut, holds, the blocker and (managers) money. */
export async function describe(ctx, accountId, actor, studio, rows, now) {
  const contacts = new Map(), out = [];
  for (const p of rows) {
    if (!contacts.has(String(p.contactId))) contacts.set(String(p.contactId), await owned(ctx, p.contactId, accountId, 'blueContacts'));
    const contact = contacts.get(String(p.contactId)), facts = factsOf(studio, p, now), cut = latestCut(facts.cuts);
    const holds = facts.reservations.filter(r => ['held', 'confirmed'].includes(r.status));
    const { quoteMinor, depositMinor, ...row } = publicRow(p);
    out.push({ ...row, contactName: contact?.state === 'active' ? displayName(contact).name : null,
      currentCut: cut ? { id: cut._id, revision: cut.revision, label: cut.label, status: cut.status, decisionDueAt: cut.decisionDueAt } : null,
      holds: { held: holds.filter(r => r.status === 'held').length, confirmed: holds.filter(r => r.status === 'confirmed').length },
      blocker: blocker(p, facts), proposedChanges: facts.changeOrders.filter(c => c.status === 'proposed').length,
      prepMissing: prepMissing(p, { critical: true }).length,
      ...(actor.role === 'manager' ? { money: moneyOf(studio, p, facts) } : {}) });
  }
  return out;
}

/** The tasks the records call for right now. */
function currentTasks(studio, now, s) {
  const wanted = [], add = (kind, entityType, entity, reason, dueAt, assignedAccountId) => wanted.push({ kind, entityType, entityId: String(entity._id), reason, dueAt, assignedAccountId });
  for (const p of studio.productions) {
    const facts = factsOf(studio, p, now), cut = latestCut(facts.cuts), producer = p.producerId;
    if (p.status === 'brief_incomplete' && now - p.createdAt > DAY) add('brief_incomplete', 'production', p, 'The brief is still incomplete a day after it arrived', p.createdAt + DAY, producer);
    if (p.status === 'awaiting_acceptance' && p.acceptedQuoteVersion === p.quoteVersion && !(facts.order && facts.order.paidMinor >= p.depositMinor))
      add('deposit_missing', 'production', p, 'The quote is accepted but the deposit has not been received', p.acceptedAt, producer);
    const checkpoint = p.shootStartsAt ? p.shootStartsAt - s.prepCutoffHours * HOUR : null;
    if (['booked', 'preproduction'].includes(p.status) && checkpoint && now >= checkpoint && now < p.shootStartsAt && prepMissing(p, { critical: true }).length)
      add('shoot_at_risk', 'production', p, 'Critical preparation is missing before the shoot', checkpoint, producer);
    if (p.status === 'review' && cut?.status === 'in_review' && cut.decisionDueAt < now) add('cut_overdue', 'cut', cut, 'The client decision on the current cut is overdue', cut.decisionDueAt, producer);
    for (const c of facts.changeOrders) if (c.status === 'proposed') add('extra_scope_decision', 'change_order', c, 'Extra scope needs a priced decision before more work', c.createdAt, undefined);
    if (p.status === 'shooting' && p.shootEndsAt && p.shootEndsAt < now && !p.shootCompletedAt) add('shoot_completion_missing', 'production', p, 'The shoot time passed without a recorded completion', p.shootEndsAt, producer);
    if (p.status === 'delivered' && !p.costsFinal) add('costs_not_final', 'production', p, 'Delivered: confirm the cost record is complete', (p.deliveredAt || now) + DAY, undefined);
    if (ACTIVE.includes(p.status) && p.deliveryDueAt && p.deliveryDueAt < now) add('delivery_overdue', 'production', p, 'The approved delivery date has passed', p.deliveryDueAt, producer);
  }
  const held = studio.reservations.filter(r => r.status === 'held');
  for (const r of held) {
    if (r.holdExpiresAt && r.holdExpiresAt - now <= DAY) add('hold_expiring', 'reservation', r, 'A tentative hold expires within a day: confirm or release it', r.holdExpiresAt, undefined);
    // The later of two clashing holds carries the task (creation time, then id, decide which is later).
    const earlier = o => o.createdAt < r.createdAt || (o.createdAt === r.createdAt && String(o._id) < String(r._id));
    const clash = held.find(o => o !== r && String(o.resourceId) === String(r.resourceId) && o.startsAt < r.endsAt && o.endsAt > r.startsAt && earlier(o));
    if (clash) add('hold_conflict', 'reservation', r, 'Two tentative holds want the same resource at the same time', r.createdAt, undefined);
  }
  return wanted;
}

/** A rule draft in the customer's language, from the production's recorded facts only. */
async function insertRuleDraft(ctx, accountId, item, timezone, now) {
  const p = item.production, contact = await ctx.db.get(p.contactId);
  const last = p.conversationId ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', p.conversationId).eq('direction', 'in')).order('desc').first() : null;
  const name = contact?.state === 'active' ? displayName(contact).name : '';
  const text = mediaDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', timezone, arabic: last?.text ? ARABIC.test(last.text) : true });
  await ctx.db.insert('mediaDrafts', { accountId, requestId: `rule:${item.key}`, productionId: p._id, ...(p.conversationId ? { conversationId: p.conversationId } : {}),
    kind: item.rule.id, text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Expires lapsed holds, then brings tasks and rule drafts up to date with the records. */
export async function refreshStudio(ctx, accountId, now) {
  for (const r of await scan(ctx, 'mediaReservations', accountId, 'by_account_start'))
    if (r.status === 'held' && r.holdExpiresAt && r.holdExpiresAt <= now) await ctx.db.patch(r._id, { status: 'expired', version: r.version + 1, updatedAt: now });
  const studio = await loadStudio(ctx, accountId), base = await settingsFor(ctx, accountId), s = mediaSettings(base), timezone = await businessTimezone(ctx, accountId);
  const wanted = currentTasks(studio, now, s);
  const rules = mediaRuleWanted(studio, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt, assignedAccountId: item.production.producerId });
  await reconcileTasks(ctx, { table: 'mediaTasks', accountId, wanted, autoKinds: MEDIA_AUTO_TASKS, ruleKinds: MEDIA_RULE_TASK_KINDS, now });
  // Draft-mode rules: one draft per firing; an unsent one is cancelled once its cause is gone.
  const draftKeys = new Set(rules.filter(i => i.rule.mode === 'draft').map(i => i.key));
  const existing = new Map(studio.drafts.filter(d => d.ruleKey).map(d => [d.ruleKey, d]));
  for (const d of existing.values()) if (d.status === 'draft' && !draftKeys.has(d.ruleKey)) await ctx.db.patch(d._id, { status: 'cancelled', version: d.version + 1, updatedAt: now });
  for (const item of rules) if (item.rule.mode === 'draft' && !existing.has(item.key)) await insertRuleDraft(ctx, accountId, item, timezone, now);
  return { studio: { ...studio, drafts: await scan(ctx, 'mediaDrafts', accountId) }, settings: s, timezone };
}

/** Counts the Needs attention strip and the board header read. */
export async function mediaOverview(ctx, tenant, actor, now) {
  const { studio, settings } = await refreshStudio(ctx, tenant.accountId, now);
  const mine = studio.productions.filter(p => canSeeProduction(actor, p));
  const blockers = mine.map(p => [p, blocker(p, factsOf(studio, p, now))]);
  const count = b => blockers.filter(([, x]) => x === b).length;
  const ids = new Set(mine.map(p => String(p._id)));
  return ok({ workspaceRole: actor.role, settings,
    pipeline: Object.fromEntries(['brief_incomplete', 'quoted', 'awaiting_acceptance', 'booked', 'preproduction', 'shooting', 'editing', 'review', 'accepted', 'delivered', 'closed', 'on_hold', 'cancelled']
      .map(st => [st, mine.filter(p => p.status === st).length])),
    attention: {
      deliveryOverdue: mine.filter(p => ACTIVE.includes(p.status) && p.deliveryDueAt && p.deliveryDueAt < now).length,
      cutAwaitingApproval: count('cut_awaiting_approval'), shootAtRisk: mine.filter(p => ['booked', 'preproduction'].includes(p.status) && p.shootStartsAt && p.shootStartsAt - settings.prepCutoffHours * HOUR <= now && prepMissing(p, { critical: true }).length).length,
      extraScope: count('extra_scope_decision'), holdsExpiring: studio.reservations.filter(r => r.status === 'held' && ids.has(String(r.productionId)) && r.holdExpiresAt - now <= DAY).length,
      approvals: actor.role === 'manager' ? studio.drafts.filter(d => d.status === 'draft' && ids.has(String(d.productionId))).length : 0,
      briefIncomplete: count('brief_incomplete'),
    },
    resources: { active: studio.resources.filter(r => r.active).length } });
}
