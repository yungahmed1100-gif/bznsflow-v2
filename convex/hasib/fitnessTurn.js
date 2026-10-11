// Layla's intake for Fitness: a customer asking about joining becomes one open trial request in
// Memberships → Follow-ups. Nothing the customer wrote is copied into it, so no health detail is
// stored; the request closes itself once they have a trial booking or a membership.
import { sectorTurnPack } from './workspace/turn.js';
import { openTaskOnce } from './workspace/tasks.js';

export async function fitnessTurn(ctx, { row, contact, now, secret }) {
  if (!await sectorTurnPack(ctx, { row, secret, packId: 'fitness' })) return null;
  const fields = new Map((contact.fields || []).map(field => [field.key, field.value]));
  if (!fields.get('need')) return null;
  const members = await ctx.db.query('hasibMemberships').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(5);
  const seats = await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(5);
  if (members.some(m => m.accountId === row.accountId) || seats.some(s => s.accountId === row.accountId)) return null;
  await openTaskOnce(ctx, 'fitnessTasks', { accountId: row.accountId, kind: 'trial_request', entityType: 'contact', entityId: contact._id,
    reason: 'New enquiry from Layla: book a trial class' }, now);
  return { contactId: contact._id };
}
