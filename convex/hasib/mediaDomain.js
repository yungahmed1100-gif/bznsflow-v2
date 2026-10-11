// Media & production rules with no database access (ascend/media.md, "Lifecycle, guards and
// parallel states"). Everything a production may do next is decided here from its records.

export const DAY = 86400000, HOUR = 3600000, MIN = 60000;
export const STATUSES = ['brief_incomplete', 'quoted', 'awaiting_acceptance', 'booked', 'preproduction', 'shooting', 'editing', 'review', 'accepted', 'delivered', 'closed', 'on_hold', 'cancelled'];
export const ACTIVE = ['brief_incomplete', 'quoted', 'awaiting_acceptance', 'booked', 'preproduction', 'shooting', 'editing', 'review', 'accepted'];
export const DONE = ['delivered', 'closed'];
export const PRODUCTION_TYPES = ['photo', 'video', 'podcast', 'social_package', 'live_capture'];
export const FORMATS = ['video', 'photo', 'audio', 'social_cut', 'stills_set', 'livestream'];
export const RESOURCE_CATEGORIES = ['crew', 'camera', 'lighting', 'audio', 'location', 'other'];
export const COST_CATEGORIES = ['crew_time', 'vendor', 'equipment', 'location', 'licensing', 'travel', 'editing', 'outsourced'];
export const RIGHTS_CHANNELS = ['web', 'social', 'broadcast', 'print', 'outdoor', 'internal'];
export const CLEARANCE = ['unknown', 'pending', 'cleared'];
export const MAX_RESERVATION_MS = 14 * DAY;
// Preproduction checklist: critical items block shooting; client items are asked of the customer.
export const PREP_ITEMS = [
  { key: 'crew_confirmed', critical: true, clientInput: false },
  { key: 'location_permission', critical: true, clientInput: false },
  { key: 'equipment_ready', critical: true, clientInput: false },
  { key: 'client_assets', critical: false, clientInput: true },
  { key: 'talent_releases', critical: true, clientInput: true },
];

// Moves a person makes on the board. Quote, acceptance, cuts, shoot completion and handoff have their own operations.
export const MANUAL_NEXT = {
  quoted: ['awaiting_acceptance'], awaiting_acceptance: ['booked'], booked: ['preproduction'], preproduction: ['shooting'], delivered: ['closed'],
};

/** The brief fields a quote needs, in the order they are asked for. */
export function briefGaps(p) {
  return [
    !PRODUCTION_TYPES.includes(p.productionType) && 'production_type', !p.deliverables?.length && 'deliverables',
    !(p.shootStartsAt > 0 && p.shootEndsAt > p.shootStartsAt) && 'shoot_dates', !p.location && 'location', !(p.deliveryDueAt > 0) && 'delivery_due',
  ].filter(Boolean);
}

export const prepMissing = (p, { critical, clientInput } = {}) => p.prep.filter(i => !i.verifiedAt && (critical === undefined || i.critical === critical) && (clientInput === undefined || i.clientInput === clientInput));
export const depositFor = (quoteMinor, percent) => Math.round(quoteMinor * percent / 100);
export const latestCut = cuts => cuts.reduce((best, c) => !best || c.revision > best.revision ? c : best, null);
export const needsClearance = p => p.usageRights.channels.length > 0;

/**
 * Why a production cannot move on, or null. `facts` holds the production's linked records:
 * { order, reservations, cuts, changeOrders, now }.
 */
export function blocker(p, { order, reservations, cuts, changeOrders, now }) {
  const live = reservations.filter(r => r.status === 'held' || r.status === 'confirmed');
  if (p.status === 'brief_incomplete') return 'brief_incomplete';
  if (p.status === 'quoted') return 'quote_not_presented';
  if (p.status === 'awaiting_acceptance') {
    if (p.acceptedQuoteVersion !== p.quoteVersion) return 'acceptance_missing';
    if (!order || order.paidMinor < p.depositMinor) return 'deposit_missing';
    if (!live.length || live.some(r => r.status !== 'confirmed')) return 'holds_unconfirmed';
    return null;
  }
  if (changeOrders.some(c => c.status === 'proposed')) return 'extra_scope_decision';
  if (['booked', 'preproduction'].includes(p.status)) return prepMissing(p, { critical: true }).length ? 'prep_missing' : null;
  if (p.status === 'shooting') return p.shootEndsAt && p.shootEndsAt < now && !p.shootCompletedAt ? 'shoot_completion_missing' : null;
  if (p.status === 'editing') return cuts.length ? null : 'first_cut_due';
  if (p.status === 'review') return 'cut_awaiting_approval';
  if (p.status === 'accepted') return needsClearance(p) && p.usageRights.clearance !== 'cleared' ? 'rights_not_cleared' : 'handoff_missing';
  return null;
}

/**
 * Whether a manual board move is allowed now; returns a refusal reason or null.
 * Booking needs the current quote accepted, the deposit received and every live hold confirmed.
 */
export function manualMoveRefusal(p, to, facts) {
  if (to === 'cancelled') return DONE.includes(p.status) || p.status === 'cancelled' ? 'invalid_status_transition' : null;
  if (to === 'on_hold') return ACTIVE.includes(p.status) ? null : 'invalid_status_transition';
  if (p.status === 'on_hold') return to === p.holdFrom ? null : 'invalid_status_transition';
  if (!(MANUAL_NEXT[p.status] || []).includes(to)) return 'invalid_status_transition';
  if (to === 'booked') {
    if (p.acceptedQuoteVersion !== p.quoteVersion) return 'acceptance_required';
    if (!facts.order || facts.order.paidMinor < p.depositMinor) return 'deposit_required';
    const live = facts.reservations.filter(r => r.status === 'held' || r.status === 'confirmed');
    if (!live.length) return 'holds_required';
    if (live.some(r => r.status !== 'confirmed')) return 'holds_unconfirmed';
  }
  if (to === 'shooting' && prepMissing(p, { critical: true }).length) return 'prep_incomplete';
  return null;
}

/** Validates the deliverables list: 1–20 rows, known formats, bounded quantity and duration. */
export function cleanDeliverables(list, bounded) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 20) return null;
  const out = [];
  for (const d of list) {
    const format = d?.format, quantity = d?.quantity, language = bounded(d?.language, 20) || 'ar';
    if (!FORMATS.includes(format) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return null;
    if (d.durationSeconds !== undefined && (!Number.isSafeInteger(d.durationSeconds) || d.durationSeconds < 1 || d.durationSeconds > 86400)) return null;
    const aspectRatio = bounded(d.aspectRatio, 12);
    out.push({ format, quantity, language, ...(aspectRatio ? { aspectRatio } : {}), ...(d.durationSeconds ? { durationSeconds: d.durationSeconds } : {}), ...(d.changeOrderId ? { changeOrderId: String(d.changeOrderId) } : {}) });
  }
  return out;
}

/** Usage rights as saved: known channels, bounded territory, a clearance state. */
export function cleanRights(r, bounded) {
  if (!r || typeof r !== 'object') return null;
  const channels = Array.isArray(r.channels) ? [...new Set(r.channels)].filter(c => RIGHTS_CHANNELS.includes(c)) : [];
  if (Array.isArray(r.channels) && channels.length !== new Set(r.channels).size) return null;
  const clearance = r.clearance ?? 'unknown';
  if (!CLEARANCE.includes(clearance) || (r.termEndsAt !== undefined && !Number.isSafeInteger(r.termEndsAt))) return null;
  const territory = bounded(r.territory, 80);
  return { channels, clearance, ...(territory ? { territory } : {}), ...(r.termEndsAt ? { termEndsAt: r.termEndsAt } : {}) };
}

/** A handoff link must be an https address; nothing else is stored as delivery evidence. */
export const validLink = link => typeof link === 'string' && link.length <= 500 && /^https:\/\/[^\s]+$/.test(link);
