// Dental visit lifecycle (ascend/dental.md, "Lifecycle, guards and parallel states"), as pure
// functions. Only recorded facts are stored: a booking, its confirmation, arrival, completion,
// a missed or cancelled outcome, charges and a clinician-set recall date. Whether attendance is
// unrecorded, a confirmation is due, a balance is overdue or a patient is new is worked out on read.

export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const VISIT_MAX_MS = 8 * HOUR;
export const RESOURCE_KINDS = ['provider', 'chair'];
export const VISIT_STATUSES = ['booked', 'confirmed', 'arrived', 'completed', 'missed', 'cancelled'];
// A slot is held by these; a missed, cancelled or completed visit frees nothing it still needs.
export const HOLDS_SLOT = new Set(['booked', 'confirmed', 'arrived']);
export const CANCEL_REASONS = ['patient_request', 'clinic_request', 'provider_unavailable', 'duplicate', 'other_operational'];
// Allowed moves. A visit marked missed in error can be corrected to arrived (audited).
export const TRANSITIONS = {
  booked: ['confirmed', 'arrived', 'missed', 'cancelled'], confirmed: ['arrived', 'missed', 'cancelled'], arrived: ['completed'],
  completed: [], missed: ['arrived'], cancelled: [],
};
// Orders that no longer carry a collectible balance.
export const CLOSED_ORDERS = new Set(['returned', 'cancelled']);

/** Past its end with no recorded outcome: attendance is unknown, never assumed missed. */
export const outcomeUnknown = (v, now) => ['booked', 'confirmed'].includes(v.status) && v.endsAt <= now;

/** Why a transition is refused, or null. Arrival and completion need the visit to have started; missed needs it to have ended. */
export function transitionRefusal(v, to, now) {
  if (!TRANSITIONS[v.status]?.includes(to)) return 'invalid_transition';
  if (['arrived', 'completed'].includes(to) && now < v.startsAt - HOUR) return 'visit_not_started';
  if (to === 'missed' && v.endsAt > now) return 'visit_not_finished';
  if (to === 'cancelled' && v.endsAt <= now) return 'visit_finished';
  return null;
}

/** A cancellation inside the clinic's cutoff, fixed when it is recorded so later setting changes do not rewrite history. */
export const isLateCancel = (v, cancelledAt, cutoffHours) => cancelledAt > v.startsAt - cutoffHours * HOUR;

/** The order's open balance (0 for a returned or cancelled order). */
export const balanceOf = order => !order || CLOSED_ORDERS.has(order.status) ? 0 : Math.max(0, (order.totalMinor || 0) - (order.paidMinor || 0));

/** A recorded charge balance past its due date that nobody disputes. */
export const balanceOverdue = (v, order, now) => !!order && !v.disputed && !!v.chargeDueAt && v.chargeDueAt <= now && balanceOf(order) > 0;

/** Morning, afternoon or evening in the clinic's timezone (local hour from `hourOf`). */
export const timeOfDay = hour => hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

/** The patient's visits that count towards "new vs returning": every visit not cancelled. */
export const countedVisits = visits => visits.filter(v => v.status !== 'cancelled').sort((x, y) => x.startsAt - y.startsAt || x.createdAt - y.createdAt);
