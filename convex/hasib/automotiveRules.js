// Automotive's four follow-up rules (ascend/automotive.md, "Follow-ups within Workshop").
// Messages carry recorded facts only: the plate, the estimate number and total, the balance and dates.
// "Ready" is said only after a recorded quality check, so a failed or missing check never tells the
// customer the car is ready (acceptance scenario).
import { automotiveSettings } from './automotiveSettings.js';
import { greeting, localWhen as when } from './workspace/text.js';

const MIN = 60000, DAY = 86400000;
// Switching a rule on never digs up last month's records.
const STALE_MS = 30 * DAY;
export const AUTOMOTIVE_RULE_KINDS = Object.freeze({
  ready_for_collection: 'rule_ready_for_collection', estimate_reminder: 'rule_estimate_reminder', service_due: 'rule_service_due', promise_risk: 'rule_promise_risk',
});
export const AUTOMOTIVE_RULE_TASK_KINDS = new Set(Object.values(AUTOMOTIVE_RULE_KINDS));
const REASONS = {
  ready_for_collection: 'The vehicle passed its quality check and is ready: tell the customer',
  estimate_reminder: 'The estimate is still waiting for the customer’s decision',
  service_due: 'The vehicle’s next service is coming up',
  promise_risk: 'The promised time is close and the vehicle is not ready yet',
};
const OPEN_WORK = new Set(['intake', 'inspection', 'awaiting_approval', 'approved', 'in_progress', 'quality_check']);

/** The latest estimate of each work order. */
export function latestEstimates(estimates) {
  const latest = new Map();
  for (const e of estimates) {
    const k = String(e.workOrderId), cur = latest.get(k);
    if (!cur || e.estimateNumber > cur.estimateNumber) latest.set(k, e);
  }
  return latest;
}

/**
 * What each enabled rule calls for right now.
 * @param {{ workOrders: object[], estimates: object[], vehicles: object[], orders: Map<string, object> }} records
 */
export function automotiveRuleWanted({ workOrders, estimates, vehicles, orders }, now, settings) {
  const rules = Object.fromEntries(automotiveSettings(settings).rules.filter(r => r.enabled).map(r => [r.id, r]));
  const latest = latestEstimates(estimates);
  const vehicleOf = new Map(vehicles.map(x => [String(x._id), x]));
  const out = [];
  const push = (rule, entityType, entity, dueAt, extra) => out.push({ rule, kind: AUTOMOTIVE_RULE_KINDS[rule.id], entityType, entityId: String(entity._id), dueAt,
    reason: REASONS[rule.id], key: `${AUTOMOTIVE_RULE_KINDS[rule.id]}:${entity._id}:${dueAt}`, ...extra });
  const fresh = at => now >= at && now - at <= STALE_MS;

  const ready = rules.ready_for_collection;
  if (ready) for (const w of workOrders) {
    if (w.status !== 'ready' || !w.qualityCheckedAt || !w.readyAt) continue;
    const at = w.readyAt + ready.offsetMinutes * MIN, order = w.orderId ? orders.get(String(w.orderId)) : null;
    if (fresh(at)) push(ready, 'work_order', w, at, { workOrder: w, vehicle: vehicleOf.get(String(w.vehicleId)), contactId: w.contactId, balanceMinor: order ? Math.max(0, order.totalMinor - order.paidMinor) : null });
  }
  const reminder = rules.estimate_reminder;
  if (reminder) for (const w of workOrders) {
    const e = latest.get(String(w._id));
    if (w.status !== 'awaiting_approval' || e?.status !== 'issued' || !e.issuedAt) continue; // only ever the current version
    const at = e.issuedAt + reminder.offsetMinutes * MIN;
    if (fresh(at)) push(reminder, 'estimate', e, at, { workOrder: w, estimate: e, vehicle: vehicleOf.get(String(w.vehicleId)), contactId: w.contactId });
  }
  const due = rules.service_due;
  if (due) {
    const busy = new Set(workOrders.filter(w => OPEN_WORK.has(w.status)).map(w => String(w.vehicleId)));
    for (const x of vehicles) {
      if (!x.nextServiceAt || x.nextServiceAt <= now || busy.has(String(x._id))) continue; // never after the date, never while it is in the workshop
      const at = x.nextServiceAt - due.offsetMinutes * MIN;
      if (now >= at) push(due, 'vehicle', x, at, { vehicle: x, contactId: x.contactId });
    }
  }
  const risk = rules.promise_risk;
  if (risk) for (const w of workOrders) {
    if (!OPEN_WORK.has(w.status) || !w.promisedAt || w.promisedAt <= now) continue;
    const at = w.promisedAt - risk.offsetMinutes * MIN;
    // A promise at risk is the team's to manage: it is a task in every mode.
    if (now >= at) push({ ...risk, mode: 'task' }, 'work_order', w, at, { workOrder: w, contactId: w.contactId, assignedAccountId: w.assignedAdvisorAccountId });
  }
  return out;
}

const omr = (minor, arabic) => `${(minor / 1000).toFixed(3)} ${arabic ? 'ر.ع.' : 'OMR'}`;
const car = x => x ? `${x.make} ${x.model} (${x.plate})` : '';

/** A rule's draft from the recorded facts only. */
export function automotiveDraftText(item, { name, timezone, arabic }) {
  const hello = greeting(name, arabic), v = car(item.vehicle);
  if (item.rule.id === 'ready_for_collection') {
    const balance = Number.isInteger(item.balanceMinor) && item.balanceMinor > 0 ? item.balanceMinor : null;
    return arabic ? `${hello} سيارتك ${v} جاهزة للاستلام بعد اجتياز فحص الجودة.${balance ? ` المبلغ المتبقي ${omr(balance, true)}.` : ''}`
      : `${hello} your ${v} has passed its quality check and is ready for collection.${balance ? ` The balance due is ${omr(balance, false)}.` : ''}`;
  }
  if (item.rule.id === 'estimate_reminder') {
    const e = item.estimate;
    return arabic ? `${hello} عرض السعر رقم ${e.estimateNumber} لسيارتك ${v} بمبلغ ${omr(e.totalMinor, true)} بانتظار موافقتك. نبدأ العمل بعد موافقتك.`
      : `${hello} estimate ${e.estimateNumber} for your ${v}, ${omr(e.totalMinor, false)}, is waiting for your approval. We start the work once you approve.`;
  }
  return arabic ? `${hello} موعد الصيانة القادم لسيارتك ${v} في ${when(item.vehicle.nextServiceAt, timezone)}. هل تودّ حجز موعد؟`
    : `${hello} your ${v} is due for its next service on ${when(item.vehicle.nextServiceAt, timezone)}. Would you like to book a slot?`;
}
