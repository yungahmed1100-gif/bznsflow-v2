// Dental forms → Hasib operations. Times are the clinic's local time; money is entered in OMR.
import { zonedLocalToUtc } from '../timezone.js';

const minor = v => Math.round(Number(v) * 1000);
const int = v => Number.parseInt(v, 10);

/**
 * @param {string} form which form is open
 * @param {object} v its values
 * @returns {{ operation: string, body: object } | null}
 */
export function buildDentalSubmission(form, v, { requestId, timezone }) {
  const at = key => zonedLocalToUtc(v[key], timezone);
  if (form === 'invite') return { operation: 'team_invite', body: { email: v.email } };
  if (form === 'resource') return { operation: 'dental_resource_save', body: { ...(v.resourceId ? { version: v.version } : { requestId }),
    dental: { ...(v.resourceId ? { resourceId: v.resourceId } : { kind: v.kind }), name: v.name, ...(v.resourceId ? { active: v.active !== false } : {}) } } };
  if (form === 'visit') return { operation: 'dental_visit_book', body: { requestId, contactId: v.contactId, dental: {
    providerId: v.providerId, ...(v.chairId ? { chairId: v.chairId } : {}), ...(v.serviceItemId ? { serviceItemId: v.serviceItemId } : {}), startsAt: at('startsAt'),
    ...(v.minutes ? { durationMinutes: int(v.minutes) } : {}), source: v.source || 'staff', ...(v.forMinor ? { forMinor: true, guardianContactId: v.guardianContactId } : {}),
    ...(v.replacementForId ? { replacementForId: v.replacementForId } : {}) } } };
  if (form === 'reschedule') return { operation: 'dental_visit_reschedule', body: { visitId: v.visitId, version: v.version, dental: { startsAt: at('startsAt'),
    ...(v.providerId ? { providerId: v.providerId } : {}), ...(v.minutes ? { durationMinutes: int(v.minutes) } : {}) } } };
  if (form === 'cancel') return { operation: 'dental_visit_status', body: { visitId: v.visitId, version: v.version, status: 'cancelled', reason: v.reason } };
  if (form === 'charge') return { operation: 'dental_charge', body: { requestId, visitId: v.visitId, version: v.version,
    lines: (v.lines || []).filter(l => l.variantId && int(l.qty) > 0).map(l => ({ variantId: l.variantId, qty: int(l.qty), ...(l.price !== '' && l.price != null ? { unitPriceMinor: minor(l.price) } : {}) })) } };
  if (form === 'payment') return { operation: 'dental_payment_record', body: { requestId, visitId: v.visitId, amountMinor: minor(v.amount), method: v.method, ...(v.reference ? { reference: v.reference } : {}) } };
  if (form === 'recall') return { operation: 'dental_recall_set', body: { visitId: v.visitId, version: v.version, dental: v.clear ? { clearRecall: true } : { recallDueAt: zonedLocalToUtc(`${v.recallDate}T09:00`, timezone) } } };
  if (form === 'supply') return { operation: 'stock_move', body: { requestId, variantId: v.variantId, delta: v.direction === 'in' ? int(v.qty) : -int(v.qty), reason: v.direction === 'in' ? 'stock_in' : 'damage' } };
  if (form === 'expense') return { operation: 'expense_create', body: { requestId, category: v.category, amountMinor: minor(v.amount), method: v.method, paidOn: v.paidOn, ...(v.vendor ? { vendor: v.vendor } : {}) } };
  return null;
}
