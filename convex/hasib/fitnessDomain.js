// Fitness lifecycle rules (ascend/fitness.md, "Lifecycle, guards and parallel states"), as pure
// functions. Only facts are stored: payment, freezes, check-ins, cancellations. Frozen, grace,
// expired, attendance gap and renewal due are worked out from those facts whenever they are read.

export const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const PLAN_KINDS = ['membership', 'class_pack'];
export const BILLING_MONTHS = [1, 3, 6, 12];
export const ATTENDANCE_SOURCES = ['scan', 'instructor', 'staff'];
export const CLASS_MAX_MS = 4 * HOUR;
// A member is in one of these states; only `pending` and `cancelled` are stored as status.
export const MEMBER_STATES = ['pending', 'upcoming', 'active', 'frozen', 'grace', 'renewed', 'expired', 'cancelled'];

const freezes = m => m.freezes || [];
/** Total frozen time: a freeze moves the end of the term by its own length. */
export const frozenMs = m => freezes(m).reduce((sum, f) => sum + Math.max(0, f.endsAt - f.startsAt), 0);
export const effectiveEnd = m => m.endsAt + frozenMs(m);
export const frozenAt = (m, t) => freezes(m).some(f => f.startsAt <= t && t < f.endsAt);
export const currentFreeze = (m, now) => freezes(m).find(f => f.startsAt <= now && now < f.endsAt) || null;

/**
 * @param {object} m a hasibMemberships row
 * @param {{ renewed: boolean, graceDays: number }} facts whether a live successor exists, the plan's grace
 */
export function memberState(m, { renewed, graceDays }, now) {
  if (m.status === 'cancelled') return 'cancelled';
  if (m.status === 'pending') return 'pending';
  if (now < m.startsAt) return 'upcoming';
  if (frozenAt(m, now)) return 'frozen';
  const end = effectiveEnd(m);
  if (now < end) return 'active';
  if (renewed) return 'renewed';
  return now < end + graceDays * DAY ? 'grace' : 'expired';
}

/** The last time the member was here, counting the end of a freeze as a fresh start for the gap clock. */
export function lastPresence(m) {
  const ends = freezes(m).map(f => f.endsAt);
  return Math.max(m.lastAttendanceAt || 0, m.activatedAt || m.startsAt, ...ends);
}

/** Active, not frozen, observed long enough, and not seen for the configured gap. */
export function inAttendanceGap(m, state, s, now) {
  if (state !== 'active') return false;
  if (now - (m.activatedAt || m.startsAt) < s.minObservationDays * DAY) return false;
  return now - lastPresence(m) >= s.gapDays * DAY;
}

/**
 * Whether a membership covers a class at time `t`: paid, in term, not frozen, and (for a class
 * pack) with a credit left after the seats it already holds.
 */
export function entitlementRefusal(m, t, heldSeats) {
  if (!m || m.status !== 'active') return 'membership_inactive';
  if (t < m.startsAt || t >= effectiveEnd(m)) return 'membership_inactive';
  if (frozenAt(m, t)) return 'membership_frozen';
  if (m.kind === 'lessons' && m.remainingCredits - heldSeats < 1) return 'no_credits_remaining';
  return null;
}

/** Monthly run rate of a membership's recurring fee. */
export const monthlyMinor = m => m.priceMinor && m.billingMonths ? Math.round(m.priceMinor / m.billingMonths) : 0;
