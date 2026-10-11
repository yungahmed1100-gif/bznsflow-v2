// Fitness forms → Hasib operations. Times are the business's local time; money is entered in OMR.
import { zonedLocalToUtc } from '../timezone.js';

const minor = v => Math.round(Number(v) * 1000);
const int = v => Number.parseInt(v, 10);

/**
 * @param {string} form which form is open
 * @param {object} v its values
 * @returns {{ operation: string, body: object } | null}
 */
export function buildFitnessSubmission(form, v, { requestId, timezone }) {
  const at = key => zonedLocalToUtc(v[key], timezone);
  if (form === 'invite') return { operation: 'team_invite', body: { email: v.email } };
  if (form === 'membership') return { operation: 'fitness_membership_save', body: { requestId, contactId: v.contactId, planId: v.planId } };
  if (form === 'plan') return { operation: 'fitness_plan_save', body: { ...(v.planId ? { planId: v.planId, version: v.version } : { requestId }), fitness: {
    name: v.name, kind: v.kind || 'membership', termDays: int(v.termDays), billingMonths: int(v.billingMonths || 1), priceMinor: minor(v.price || 0),
    ...(v.kind === 'class_pack' ? { credits: int(v.credits) } : {}), freezeMaxDays: int(v.freezeMaxDays || 0), graceDays: int(v.graceDays ?? 7), active: v.active !== false } } };
  if (form === 'class') {
    const startsAt = at('startsAt');
    return { operation: 'fitness_class_save', body: { ...(v.classId ? { classId: v.classId, version: v.version } : { requestId }), fitness: {
      title: v.title, classType: v.classType || 'class', startsAt, endsAt: startsAt + int(v.minutes || 60) * 60000, capacity: int(v.capacity), coachName: v.coachName || '' } } };
  }
  if (form === 'cancel_class') return { operation: 'fitness_class_save', body: { classId: v.classId, version: v.version, reason: v.reason, fitness: { cancel: true } } };
  if (form === 'book') return { operation: 'fitness_seat_book', body: { requestId, classId: v.classId, contactId: v.contactId, fitness: { trial: !!v.trial, ...(v.trial && v.source ? { source: v.source } : {}) } } };
  if (form === 'payment') return { operation: 'fitness_payment_record', body: { requestId, membershipId: v.membershipId, amountMinor: minor(v.amount), method: v.method, ...(v.reference ? { reference: v.reference } : {}) } };
  if (form === 'freeze') return { operation: 'fitness_freeze', body: { membershipId: v.membershipId, version: v.version, reason: v.reason || undefined, fitness: { days: int(v.days), ...(v.startsAt ? { startsAt: at('startsAt') } : {}) } } };
  if (form === 'cancel') return { operation: 'fitness_cancel', body: { membershipId: v.membershipId, version: v.version, reason: v.reason } };
  if (form === 'renew') return { operation: 'fitness_renew', body: { requestId, membershipId: v.membershipId, version: v.version, ...(v.planId ? { planId: v.planId } : {}) } };
  return null;
}
