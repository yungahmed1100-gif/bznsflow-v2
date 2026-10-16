// The store packs' shared reads for the six-tab Work: open orders, waiting product requests, open
// repairs (phone stores) and low stock, read through their indexes and bounded; the tasks they call
// for (each closes itself once its cause is gone) and the rule drafts. Nothing here sends.
import { owned } from '../blueTenant.js';
import { ensureAutomation } from './workspace/schedule.js';
import { reconcileTasks } from './workspace/tasks.js';
import { reconcileRuleDrafts } from './workspace/drafts.js';
import { conversationOf } from './workspace/conversation.js';
import { settingsFor } from './shared.js';
import { displayName } from '../blueContacts.js';
import { storeSettings } from './retailSettings.js';
import { retailRuleWanted, retailDraftText, enteredAt, RETAIL_RULE_TASK_KINDS } from './retailRules.js';
import { quoteWaiting } from './repairOffer.js';

const CAP = 300, HOUR = 3600000, MAX_NEW_TASKS = 100, ARABIC = /[؀-ۿ]/;
const OPEN_REPAIRS = ['received', 'diagnosing', 'waiting_parts', 'repairing', 'ready'];
export const RETAIL_AUTO_TASKS = new Set(['low_stock', 'ready_uncollected', 'repair_ready_uncollected', ...RETAIL_RULE_TASK_KINDS]);

const byStatus = (ctx, table, accountId, statuses) => Promise.all(statuses.map(status => ctx.db.query(table).withIndex('by_account_status_created', q => q.eq('accountId', accountId).eq('status', status)).order('desc').take(CAP))).then(r => r.flat());

/** The live store, bounded however long its history. */
export async function loadStore(ctx, accountId, packId) {
  const orders = await byStatus(ctx, 'hasibOrders', accountId, ['pending', 'confirmed', 'ready']);
  const requests = (await ctx.db.query('hasibProductRequests').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(500)).filter(r => r.status === 'waiting');
  const repairs = packId === 'retail-tech' ? await byStatus(ctx, 'hasibRepairs', accountId, OPEN_REPAIRS) : [];
  const low = (await ctx.db.query('hasibVariants').withIndex('by_account_low', q => q.eq('accountId', accountId).eq('low', true)).take(100)).filter(v => !v.archived);
  const variants = new Map();
  for (const r of requests) if (!variants.has(String(r.variantId))) variants.set(String(r.variantId), await owned(ctx, r.variantId, accountId, 'hasibVariants'));
  const repairOrders = new Map();
  for (const r of repairs) if (r.status === 'ready' && r.orderId) repairOrders.set(String(r.orderId), await owned(ctx, r.orderId, accountId, 'hasibOrders'));
  const drafts = await ctx.db.query('retailDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(500);
  return { orders, requests, repairs, low, variants, repairOrders, drafts };
}

function currentTasks(store, now, s) {
  const wanted = [], add = (kind, entityType, entity, reason, dueAt) => wanted.push({ kind, entityType, entityId: String(entity._id), reason, dueAt });
  for (const v of store.low) add('low_stock', 'variant', v, `Low stock: ${v.sku || 'a product'} has ${v.onHand} left`, v.updatedAt);
  for (const o of store.orders) if (o.status === 'ready' && o.kind !== 'repair' && o.updatedAt + s.readyUncollectedHours * HOUR <= now)
    add('ready_uncollected', 'order', o, `Order #${o.number} has been ready for ${s.readyUncollectedHours} hours`, o.updatedAt + s.readyUncollectedHours * HOUR);
  for (const r of store.repairs) { const at = enteredAt(r, 'ready'); if (r.status === 'ready' && at && at + s.readyUncollectedHours * HOUR <= now)
    add('repair_ready_uncollected', 'repair', r, `Repair #${r.number} has been ready for ${s.readyUncollectedHours} hours`, at + s.readyUncollectedHours * HOUR); }
  return wanted;
}

async function productName(ctx, accountId, variant, arabic) {
  const item = variant?.itemId ? await owned(ctx, variant.itemId, accountId, 'hasibItems') : null;
  const name = (arabic ? item?.nameAr : item?.nameEn) || item?.nameEn || item?.nameAr || variant?.sku || '';
  // Options are stored as [{ key, value }] (older rows may hold a plain object).
  const raw = variant?.options || [], options = (Array.isArray(raw) ? raw.map(o => o?.value) : Object.values(raw)).filter(Boolean).join(' ');
  return options ? `${name} (${options})` : name;
}

async function insertRuleDraft(ctx, accountId, store, item, now) {
  const contact = await ctx.db.get(item.contactId);
  if (!contact) return;
  const { conversation } = await conversationOf(ctx, accountId, item.contactId);
  const last = conversation ? await ctx.db.query('blueMessages').withIndex('by_conversation_direction_at', q => q.eq('conversationId', conversation._id).eq('direction', 'in')).order('desc').first() : null;
  const arabic = last?.text ? ARABIC.test(last.text) : true, name = contact.state === 'active' ? displayName(contact).name : '';
  const repairOrder = item.repair?.orderId ? store.repairOrders.get(String(item.repair.orderId)) : null;
  const text = retailDraftText(item, { name: name && !/^\+?\d/.test(name) ? name : '', arabic,
    productName: item.variant ? await productName(ctx, accountId, item.variant, arabic) : '', repairTotalMinor: repairOrder ? Math.max(0, repairOrder.totalMinor - (repairOrder.paidMinor || 0)) : 0 });
  await ctx.db.insert('retailDrafts', { accountId, requestId: `rule:${item.key}`, ...(item.order ? { orderId: item.order._id } : {}), ...(item.repair ? { repairId: item.repair._id } : {}),
    ...(item.request ? { productRequestId: item.request._id } : {}), contactId: item.contactId, ...(conversation ? { conversationId: conversation._id } : {}),
    kind: item.rule.id, text, ruleId: item.rule.id, ruleKey: item.key, status: 'draft', version: 1, createdAt: now, updatedAt: now });
}

/** Brings tasks and rule drafts up to date with the records. */
export async function refreshStore(ctx, accountId, packId, now) {
  const store = await loadStore(ctx, accountId, packId), base = await settingsFor(ctx, accountId), s = storeSettings(packId, base);
  const wanted = currentTasks(store, now, s);
  const rules = retailRuleWanted(packId, store, now, base);
  for (const item of rules) if (item.rule.mode === 'task') wanted.push({ kind: item.kind, entityType: item.entityType, entityId: item.entityId, reason: item.reason, dueAt: item.dueAt });
  wanted.sort((x, y) => (x.dueAt || 0) - (y.dueAt || 0));
  await reconcileTasks(ctx, { table: 'retailTasks', accountId, wanted, maxNew: MAX_NEW_TASKS, autoKinds: RETAIL_AUTO_TASKS, ruleKinds: RETAIL_RULE_TASK_KINDS, now });
  await reconcileRuleDrafts(ctx, { rules, drafts: store.drafts, insert: item => insertRuleDraft(ctx, accountId, store, item, now), now });
  // Layla's repair request is done once that customer's device is booked in.
  const inShop = new Set(store.repairs.map(r => String(r.contactId)));
  for (const t of await ctx.db.query('retailTasks').withIndex('by_account_status', q => q.eq('accountId', accountId).eq('status', 'open')).take(500))
    if (t.kind === 'repair_request' && inShop.has(String(t.entityId))) await ctx.db.patch(t._id, { status: 'resolved', resolution: 'repair_received', resolvedBy: 'automation', resolvedAt: now, updatedAt: now });
  await ensureAutomation(ctx, accountId, packId, true, now);
  return { store: { ...store, drafts: await ctx.db.query('retailDrafts').withIndex('by_account_created', q => q.eq('accountId', accountId)).order('desc').take(500) }, settings: s };
}

/** The counts the Needs attention strip reads. */
export function storeAttention(store, actor) {
  return {
    unconfirmed: store.orders.filter(o => o.source === 'layla' && (o.status === 'pending' || (o.flags || []).includes('change_requested')) && (o.flags || []).length).length,
    ready: store.orders.filter(o => o.status === 'ready' && o.kind !== 'repair').length,
    requests: store.requests.length,
    lowStock: store.low.length,
    approvalPending: store.repairs.filter(quoteWaiting).length,
    repairsReady: store.repairs.filter(r => r.status === 'ready').length,
    approvals: actor.role === 'manager' ? store.drafts.filter(d => d.status === 'draft').length : 0,
  };
}
