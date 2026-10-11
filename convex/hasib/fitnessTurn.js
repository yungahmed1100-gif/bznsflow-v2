// Layla's intake for Fitness: a customer asking about joining becomes one open trial request in
// Memberships → Follow-ups. Nothing the customer wrote is copied into it, so no health detail is
// stored; the request closes itself once they have a trial booking or a membership.
import { isLivePack } from '../../config/hasib-packs.js';
import { hasibEnabled } from './gate.js';
import { HASIB_PLANS, planFor } from './plans.js';
import { packFor } from './shared.js';
import { openTaskOnce } from './workspace/tasks.js';

export async function fitnessTurn(ctx, { row, contact, now, secret }) {
  if (!(await hasibEnabled(ctx)) || !HASIB_PLANS.includes(await planFor(ctx, row.accountId))) return null;
  const pack = await packFor(ctx, { accountId: row.accountId, row, secret });
  if (pack.id !== 'fitness' || !(isLivePack(pack.id) || ctx.hasibPreview === true)) return null;
  const fields = new Map((contact.fields || []).map(field => [field.key, field.value]));
  if (!fields.get('need')) return null;
  const members = await ctx.db.query('hasibMemberships').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(5);
  const seats = await ctx.db.query('fitnessSeats').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(5);
  if (members.some(m => m.accountId === row.accountId) || seats.some(s => s.accountId === row.accountId)) return null;
  await openTaskOnce(ctx, 'fitnessTasks', { accountId: row.accountId, kind: 'trial_request', entityType: 'contact', entityId: contact._id,
    reason: 'New enquiry from Layla: book a trial class' }, now);
  return { contactId: contact._id };
}
