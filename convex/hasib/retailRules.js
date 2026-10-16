// The store packs' follow-up rules. Messages carry recorded facts only: the order or repair number,
// the device, the product asked for and the balance due. Each firing is keyed by its record, so a
// customer gets one message per event however often the records are refreshed.
import { storeSettings } from './retailSettings.js';
import { greeting } from './workspace/text.js';

const MIN = 60000, DAY = 86400000, STALE_MS = 30 * DAY;
export const RETAIL_RULE_KINDS = Object.freeze({
  ready_for_collection: 'rule_ready_for_collection', back_in_stock: 'rule_back_in_stock', order_unconfirmed: 'rule_order_unconfirmed',
  repair_ready: 'rule_repair_ready', repair_quote_reminder: 'rule_repair_quote_reminder', overdue_repair: 'rule_overdue_repair',
});
export const RETAIL_RULE_TASK_KINDS = new Set(Object.values(RETAIL_RULE_KINDS));
const REASONS = {
  ready_for_collection: 'The order is ready for collection: tell the customer',
  back_in_stock: 'A product the customer asked for is in stock again',
  order_unconfirmed: 'Layla could not confirm this order: check it',
  repair_ready: 'The repair is ready: tell the customer',
  repair_quote_reminder: 'The repair quote is still waiting for the customer’s approval',
  overdue_repair: 'The repair is past its promised date',
};
/** When a repair last entered a status, from its own history. */
export const enteredAt = (repair, status) => [...(repair.history || [])].reverse().find(h => h.status === status)?.at || null;

/**
 * What each enabled rule calls for right now.
 * @param {{ orders: object[], requests: object[], repairs: object[], variants: Map<string, object> }} records
 */
export function retailRuleWanted(packId, { orders, requests, repairs, variants }, now, settings) {
  const rules = Object.fromEntries(storeSettings(packId, settings).rules.filter(r => r.enabled).map(r => [r.id, r]));
  const out = [];
  const push = (rule, entityType, entity, dueAt, extra) => out.push({ rule, kind: RETAIL_RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt,
    reason: REASONS[rule.id], key: `${RETAIL_RULE_KINDS[rule.id]}:${entity._id}`, ...extra });
  const fresh = at => now >= at && now - at <= STALE_MS;

  const ready = rules.ready_for_collection;
  if (ready) for (const o of orders) {
    if (o.status !== 'ready' || o.fulfilment?.type === 'delivery' || !o.contactId || o.kind === 'repair') continue;
    if (fresh(o.updatedAt + ready.offsetMinutes * MIN)) push(ready, 'order', o, o.createdAt, { order: o, contactId: o.contactId, balanceMinor: Math.max(0, o.totalMinor - (o.paidMinor || 0)) });
  }
  const unconfirmed = rules.order_unconfirmed;
  if (unconfirmed) for (const o of orders) {
    const flagged = o.source === 'layla' && (o.status === 'pending' || (o.flags || []).includes('change_requested')) && (o.flags || []).length;
    if (flagged && now >= o.createdAt + unconfirmed.offsetMinutes * MIN) push({ ...unconfirmed, mode: 'task' }, 'order', o, o.createdAt + unconfirmed.offsetMinutes * MIN, { order: o });
  }
  const back = rules.back_in_stock;
  if (back) for (const r of requests) {
    const variant = variants.get(String(r.variantId));
    if (r.status !== 'waiting' || !variant || !(variant.onHand >= r.qty)) continue;
    // Keyed by the request: one message however often the stock moves.
    if (now >= r.createdAt + back.offsetMinutes * MIN) push(back, 'request', r, r.createdAt, { request: r, variant, contactId: r.contactId });
  }
  const repaired = rules.repair_ready;
  if (repaired) for (const r of repairs) {
    const at = enteredAt(r, 'ready');
    if (r.status !== 'ready' || !at || !r.contactId) continue;
    if (fresh(at + repaired.offsetMinutes * MIN)) push(repaired, 'repair', r, at, { repair: r, contactId: r.contactId });
  }
  const quote = rules.repair_quote_reminder;
  if (quote) for (const r of repairs) {
    if ((r.approvalStatus || 'awaiting') !== 'awaiting' || r.underWarranty || !(r.labourMinor > 0) || !r.contactId || !['diagnosing', 'waiting_parts'].includes(r.status)) continue;
    const at = r.updatedAt + quote.offsetMinutes * MIN;
    if (fresh(at)) push(quote, 'repair', r, r.updatedAt, { repair: r, contactId: r.contactId });
  }
  const overdue = rules.overdue_repair;
  if (overdue) for (const r of repairs) {
    if (!r.dueAt || ['ready', 'collected', 'cancelled'].includes(r.status)) continue;
    const at = r.dueAt + overdue.offsetMinutes * MIN;
    if (now >= at) push({ ...overdue, mode: 'task' }, 'repair', r, at, { repair: r });
  }
  return out;
}

const omr = (minor, arabic) => `${(minor / 1000).toFixed(3)} ${arabic ? 'ر.ع.' : 'OMR'}`;

/** A rule's draft from the recorded facts only. */
export function retailDraftText(item, { name, arabic, productName, repairTotalMinor }) {
  const hello = greeting(name, arabic);
  if (item.rule.id === 'ready_for_collection') {
    const due = item.balanceMinor > 0 ? item.balanceMinor : null;
    return arabic ? `${hello} طلبك رقم ${item.order.number} جاهز للاستلام.${due ? ` المبلغ المتبقي ${omr(due, true)}.` : ''}`
      : `${hello} your order #${item.order.number} is ready for collection.${due ? ` The balance due is ${omr(due, false)}.` : ''}`;
  }
  if (item.rule.id === 'back_in_stock') return arabic ? `${hello} ${productName} الذي سألت عنه متوفر الآن. هل تودّ حجزه؟` : `${hello} the ${productName} you asked about is back in stock. Would you like us to keep one for you?`;
  const r = item.repair;
  if (item.rule.id === 'repair_ready') return arabic ? `${hello} صيانة ${r.device} (رقم ${r.number}) جاهزة للاستلام.${repairTotalMinor > 0 ? ` المبلغ المتبقي ${omr(repairTotalMinor, true)}.` : ''}`
    : `${hello} your ${r.device} repair (#${r.number}) is ready for collection.${repairTotalMinor > 0 ? ` The balance due is ${omr(repairTotalMinor, false)}.` : ''}`;
  return arabic ? `${hello} عرض صيانة ${r.device} (رقم ${r.number}) بانتظار موافقتك. نبدأ الإصلاح بعد موافقتك.` : `${hello} the quote for your ${r.device} repair (#${r.number}) is waiting for your approval. We start the repair once you approve.`;
}
