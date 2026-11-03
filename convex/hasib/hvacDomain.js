// Air-conditioning job lifecycle (ascend/hvac.md, "Lifecycle and guards"), as pure functions. Only
// recorded facts are stored: a request, a triage, an estimate version and the customer's yes, a
// visit window, an arrival, the technician's checklist, tested and completed. Whether a visit is
// late, an estimate has expired, a contract visit is due or a balance is overdue is worked out on read.

export const MIN = 60000, HOUR = 3600000, DAY = 86400000, YEAR = 365 * DAY;
export const VISIT_MAX_MS = 12 * HOUR;
export const JOB_TYPES = ['repair', 'gas_refill', 'cleaning', 'install', 'inspection', 'amc_visit'];
export const UNIT_TYPES = ['split', 'ducted', 'central', 'window', 'cassette', 'package', 'other'];
// What the customer reported, never a diagnosis: "not cooling" is a priority, not a fault.
export const SYMPTOMS = ['not_cooling', 'leak', 'noise', 'not_working', 'other'];
export const SOURCES = ['layla', 'phone', 'walk_in', 'contract', 'staff'];
export const JOB_STATES = ['requested', 'triaged', 'estimate_pending', 'approved', 'scheduled', 'on_site', 'repairing', 'waiting_parts', 'on_hold', 'tested', 'completed', 'cancelled'];
export const OPEN_JOB = new Set(JOB_STATES.filter(s => !['completed', 'cancelled'].includes(s)));
export const PAUSES = new Set(['waiting_parts', 'on_hold']);
export const CANCEL_REASONS = ['customer_request', 'duplicate', 'out_of_area', 'no_access', 'declined_estimate', 'other_operational'];
export const VISIT_STATES = ['scheduled', 'arrived', 'done', 'missed', 'cancelled'];
export const ACTIVE_VISIT = new Set(['scheduled', 'arrived']);
export const VISIT_OUTCOMES = ['fixed', 'needs_parts', 'needs_return', 'no_access'];
export const CHECK_RESULTS = ['pass', 'fail', 'na'];
export const LINE_KINDS = ['labour', 'part', 'service', 'gas', 'other'];
export const COST_KINDS = ['parts', 'gas', 'labour', 'subcontract', 'other'];
export const EVIDENCE = ['in_person', 'phone', 'whatsapp', 'instagram', 'email', 'signed'];
export const CONTRACT_STATES = ['draft', 'active', 'expired', 'renewed', 'cancelled'];
export const CLOSED_ORDERS = new Set(['returned', 'cancelled']);

// The moves a person records with hvac_job_status. Scheduling, arrival and approval have their own
// operations (a visit, an approval record), so they are not listed here.
const MOVES = {
  requested: ['triaged', 'cancelled'],
  triaged: ['estimate_pending', 'on_hold', 'cancelled'],
  estimate_pending: ['on_hold', 'cancelled'],
  approved: ['repairing', 'on_hold', 'cancelled'],
  scheduled: ['on_hold', 'cancelled'],
  on_site: ['estimate_pending', 'repairing', 'tested', 'waiting_parts', 'on_hold', 'cancelled'],
  repairing: ['tested', 'waiting_parts', 'on_hold'],
  waiting_parts: ['cancelled'],
  on_hold: ['cancelled'],
  tested: ['completed', 'repairing'],
  completed: [],
  cancelled: [],
};

/** Covered by its contract: an AMC visit needs no estimate for the contract's scope. */
export const contractCovered = job => job.jobType === 'amc_visit' && !!job.contractId;

/** The latest estimate version of a job that was sent to the customer (issued or approved), else null. */
export const latestSent = estimates => [...estimates].filter(e => ['issued', 'approved'].includes(e.status)).sort((x, y) => y.estimateNumber - x.estimateNumber)[0] || null;
export const latestOf = estimates => [...estimates].sort((x, y) => y.estimateNumber - x.estimateNumber)[0] || null;
export const estimateExpired = (e, now) => e.status === 'issued' && !!e.validUntil && e.validUntil <= now;

/** The job's billable scope is approved: its latest sent estimate is the one the customer said yes to. */
export function scopeApproved(job, estimates) {
  if (contractCovered(job)) return true;
  const sent = latestSent(estimates);
  return !!sent && sent.status === 'approved' && sent.estimateNumber === job.approvedEstimateNumber;
}

/**
 * Why a recorded move is refused, or null. `onSite` says a visit is in progress (arrived) right now.
 * @param {object} job @param {string} to @param {{ estimates: object[], onSite: boolean }} facts
 */
export function moveRefusal(job, to, { estimates, onSite }) {
  if (to === 'resume') return PAUSES.has(job.status) && job.holdFrom ? null : 'invalid_transition';
  if (!MOVES[job.status]?.includes(to)) return 'invalid_transition';
  if (to === 'repairing' && !scopeApproved(job, estimates)) return 'estimate_not_approved';
  if (to === 'repairing' && job.status === 'approved' && !onSite) return 'visit_not_started';
  // Straight from site to tested: an inspection or a contract visit, whose work is the check itself.
  if (to === 'tested' && job.status === 'on_site' && !['inspection', 'amc_visit'].includes(job.jobType) && !scopeApproved(job, estimates)) return 'estimate_not_approved';
  if (to === 'tested' && !job.checklist.length) return 'checklist_required';
  if (to === 'completed' && job.checklist.some(c => c.result === 'fail')) return 'check_failed';
  return null;
}

/** A visit may be booked while the job waits for one: triaged, approved, or back for parts or a return. */
export const SCHEDULABLE = new Set(['triaged', 'approved', 'waiting_parts', 'repairing', 'on_hold']);
/** The job's state once the technician arrives: a first visit puts it on site; a return visit resumes the work. */
export const stateOnArrival = (job, estimates) => job.status === 'scheduled' ? 'on_site'
  : PAUSES.has(job.status) ? (scopeApproved(job, estimates) ? 'repairing' : 'on_site') : job.status;
/** Arrival may be recorded from two hours before the window. */
export const arrivalRefusal = (visit, now) => visit.status !== 'scheduled' ? 'invalid_transition' : now < visit.startsAt - 2 * HOUR ? 'visit_not_started' : null;
/** On time: arrived no later than the window's end plus the grace the business set. */
export const onTime = (visit, graceMinutes) => !!visit.arrivedAt && visit.arrivedAt <= visit.endsAt + graceMinutes * MIN;
/** Past its window with no arrival recorded: attendance is unknown, never assumed missed. */
export const arrivalUnrecorded = (visit, now) => visit.status === 'scheduled' && visit.endsAt <= now;

/** A contract's visit due dates: evenly spaced through its term, the first one at its start. */
export function contractVisitDates(c) {
  const span = c.endsAt - c.startsAt, n = Math.max(1, Math.min(12, c.visitsPerYear || 1));
  return Array.from({ length: n }, (_, k) => c.startsAt + Math.round(k * span / n));
}

/** The order's open balance (0 for a returned or cancelled order). */
export const balanceOf = order => !order || CLOSED_ORDERS.has(order.status) ? 0 : Math.max(0, (order.totalMinor || 0) - (order.paidMinor || 0));
export const paymentStatus = order => !order || CLOSED_ORDERS.has(order.status) ? 'none' : (order.paidMinor || 0) <= 0 ? 'unpaid' : balanceOf(order) > 0 ? 'part_paid' : 'paid';
export const linesTotal = lines => lines.reduce((sum, l) => sum + l.qty * l.unitPriceMinor, 0);
export const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;

export const isTechnician = actor => actor.role === 'employee' && actor.operationalRole === 'technician';
export const isManager = actor => actor.role === 'manager';
export const assignedTo = (actor, job) => !isTechnician(actor) || String(job.technicianAccountId) === String(actor.actorAccountId);
