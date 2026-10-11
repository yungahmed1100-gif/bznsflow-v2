// Media & production board helpers (ascend/media.md, "Productions: daily execution"). Pure functions,
// so the board, filters and forms behave the same in tests and in the browser.
import { zonedLocalToUtc } from '../timezone.js';

// Board columns: the brief and quote (blue, the customer), booking and the shoot (yellow, in progress),
// the client's review and acceptance (orange, the record). Delivered, closed, held and cancelled are filters.
export const MEDIA_COLUMNS = [
  ['brief', ['brief_incomplete'], 'blue'], ['quoted', ['quoted', 'awaiting_acceptance'], 'blue'], ['booked', ['booked', 'preproduction'], 'yellow'],
  ['production', ['shooting', 'editing'], 'yellow'], ['review', ['review'], 'orange'], ['accepted', ['accepted'], 'orange'],
];
export const CLOSED_FILTERS = ['delivered', 'closed', 'on_hold', 'cancelled'];
export const MEDIA_QUICK = ['all', 'mine', 'brief_incomplete', 'shoot_at_risk', 'cut_awaiting', 'extra_scope'];
// The moves a person makes on a card; quote, acceptance, cuts, shoot completion and handoff have their own forms.
export const MEDIA_MANUAL_NEXT = { quoted: ['awaiting_acceptance'], awaiting_acceptance: ['booked'], booked: ['preproduction'], preproduction: ['shooting'], delivered: ['closed'] };
export const PREP_KEYS = ['crew_confirmed', 'location_permission', 'equipment_ready', 'client_assets', 'talent_releases'];

/** Productions grouped into the board's columns. */
export function columnsOf(rows) {
  return Object.fromEntries(MEDIA_COLUMNS.map(([id, statuses]) => [id, rows.filter(p => statuses.includes(p.status))]));
}

/** The quick filters: mine, brief incomplete, shoot at risk, cut awaiting approval, extra scope. */
export function mediaQuickFilter(rows, quick, { actorAccountId } = {}) {
  if (quick === 'mine') return rows.filter(p => String(p.producerId || '') === String(actorAccountId || ''));
  if (quick === 'brief_incomplete') return rows.filter(p => p.status === 'brief_incomplete');
  if (quick === 'shoot_at_risk') return rows.filter(p => p.blocker === 'prep_missing' || p.blocker === 'shoot_completion_missing');
  if (quick === 'cut_awaiting') return rows.filter(p => p.status === 'review');
  if (quick === 'extra_scope') return rows.filter(p => p.proposedChanges > 0);
  return rows;
}

/** "2 × video (90s), 1 × stills set": what is being made, in one line. */
export function deliverablesLine(deliverables = [], formatLabel = f => f) {
  return deliverables.map(d => `${d.quantity} × ${formatLabel(d.format)}${d.durationSeconds ? ` (${d.durationSeconds}s)` : ''}`).join(', ');
}

const omr = value => Math.round(Number(value || 0) * 1000);
const at = (value, timezone) => value ? zonedLocalToUtc(value, timezone) : undefined;

/**
 * The operation and body for a Media form. `values` are the form's strings; times are read in the
 * studio's timezone. Returns null when the form is unknown.
 */
export function buildMediaSubmission(form, values, { requestId, timezone = 'Asia/Muscat' }) {
  const v = values;
  switch (form) {
    case 'invite': return { operation: 'team_invite', body: { email: v.email } };
    case 'brief': return { operation: 'media_production_save', body: {
      ...(v.productionId ? { productionId: v.productionId, version: Number(v.version) } : { requestId }),
      media: {
        ...(v.productionId ? {} : { contactId: v.contactId }), title: v.title, purpose: v.purpose || undefined,
        ...(v.locked ? {} : { productionType: v.productionType, deliverables: [{ format: v.format, quantity: Number(v.quantity || 1), language: v.language || 'ar', ...(v.durationSeconds ? { durationSeconds: Number(v.durationSeconds) } : {}) }],
          shootStartsAt: at(v.shootStartsAt, timezone), shootEndsAt: at(v.shootEndsAt, timezone), revisionAllowance: v.revisionAllowance === '' || v.revisionAllowance == null ? undefined : Number(v.revisionAllowance) }),
        location: v.location, deliveryDueAt: at(v.deliveryDueAt, timezone), firstCutDueAt: at(v.firstCutDueAt, timezone),
        ...(v.producerId !== undefined ? { producerId: v.producerId } : {}), nextAction: v.nextAction || undefined,
        usageRights: { channels: v.channels || [], clearance: v.clearance || 'unknown', ...(v.territory ? { territory: v.territory } : {}), ...(v.termEndsAt ? { termEndsAt: at(`${v.termEndsAt}T23:59`, timezone) } : {}) },
      } } };
    case 'quote': return { operation: 'media_quote', body: { productionId: v.productionId, version: Number(v.version), media: { quoteMinor: omr(v.quote), ...(v.deposit !== '' && v.deposit != null ? { depositMinor: omr(v.deposit) } : {}) } } };
    case 'accept': return { operation: 'media_accept', body: { productionId: v.productionId, version: Number(v.version), media: { quoteVersion: Number(v.quoteVersion), acceptedBy: v.acceptedBy, evidenceSource: v.evidenceSource } } };
    case 'payment': return { operation: 'media_payment_record', body: { requestId, productionId: v.productionId, amountMinor: omr(v.amount), method: v.method, reference: v.reference || undefined, ...(v.changeOrderId ? { media: { changeOrderId: v.changeOrderId } } : {}) } };
    case 'cut': return { operation: 'media_cut_submit', body: { requestId, productionId: v.productionId, version: Number(v.version), media: { label: v.label || undefined, assetRef: v.assetRef, approverName: v.approverName, ...(v.decisionDueAt ? { decisionDueAt: at(v.decisionDueAt, timezone) } : {}) } } };
    case 'decision': return { operation: 'media_cut_decide', body: { cutId: v.cutId, version: Number(v.version), media: { decision: v.decision, approverName: v.approverName, evidenceSource: v.evidenceSource, ...(v.feedback ? { feedback: v.feedback } : {}) } } };
    case 'change': return { operation: 'media_change_order_save', body: { requestId, productionId: v.productionId, media: { kind: v.kind, description: v.description, priceMinor: omr(v.price),
      ...(v.kind === 'new_deliverable' ? { deliverable: { format: v.format, quantity: Number(v.quantity || 1), language: v.language || 'ar' } } : {}) } } };
    case 'change_decide': return { operation: 'media_change_order_decide', body: { changeOrderId: v.changeOrderId, version: Number(v.version), media: { decision: v.decision, ...(v.customerApproval ? { customerApproval: v.customerApproval } : {}) } } };
    case 'hold': return { operation: 'media_reservation_save', body: { requestId, productionId: v.productionId, mediaResourceId: v.mediaResourceId, media: { startsAt: at(v.startsAt, timezone), endsAt: at(v.endsAt, timezone) } } };
    case 'resource': return { operation: 'media_resource_save', body: { ...(v.mediaResourceId ? { mediaResourceId: v.mediaResourceId, version: Number(v.version) } : { requestId }), media: { name: v.name, category: v.category, active: v.active !== false && v.active !== 'false', ...(v.rate ? { internalRateMinor: omr(v.rate) } : {}) } } };
    case 'cost': return { operation: 'media_cost_save', body: { requestId, productionId: v.productionId, media: { category: v.category, label: v.label, amountMinor: omr(v.amount), costKind: v.costKind || 'actual',
      ...(v.hours ? { hours: Number(v.hours) } : {}), extraScope: v.extraScope === true, ...(v.changeOrderId ? { changeOrderId: v.changeOrderId } : {}) } } };
    case 'handoff': return { operation: 'media_handoff', body: { productionId: v.productionId, version: Number(v.version), media: { link: v.link } } };
    case 'cancel': return { operation: 'media_production_status', body: { productionId: v.productionId, version: Number(v.version), status: 'cancelled', reason: v.reason } };
    case 'draft': return { operation: 'media_draft_save', body: { requestId, productionId: v.productionId, media: { text: v.text, ...(v.templateId ? { templateId: v.templateId } : {}) } } };
    case 'followup': return { operation: 'followup_save', body: { requestId, contactId: v.contactId, reason: v.reason, dueAt: at(v.dueAt, timezone), linkedType: 'production', linkedId: v.productionId } };
    default: return null;
  }
}
