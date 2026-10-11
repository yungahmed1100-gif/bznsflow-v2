// Layla's intake for a dental clinic: a patient asking to book becomes one open visit request in
// Visits → Follow-ups. Only the already validated service and preferred-time fields count as
// intent; nothing the patient wrote is copied, so no clinical detail is stored. The request
// closes itself once the patient has a visit booked after it.
import { isLivePack } from '../../config/hasib-packs.js';
import { hasibEnabled } from './gate.js';
import { HASIB_PLANS, planFor } from './plans.js';
import { packFor } from './shared.js';
import { openTaskOnce } from './workspace/tasks.js';

export async function dentalTurn(ctx, { row, contact, now, secret }) {
  if (!(await hasibEnabled(ctx)) || !HASIB_PLANS.includes(await planFor(ctx, row.accountId))) return null;
  const pack = await packFor(ctx, { accountId: row.accountId, row, secret });
  if (pack.id !== 'dental' || !(isLivePack(pack.id) || ctx.hasibPreview === true)) return null;
  const fields = new Map((contact.fields || []).map(field => [field.key, field.value]));
  if (!fields.get('service') && !fields.get('preferred_time')) return null;
  const visits = await ctx.db.query('dentalVisits').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(50);
  if (visits.some(v => v.accountId === row.accountId && ['booked', 'confirmed', 'arrived'].includes(v.status) && v.endsAt > now)) return null;
  await openTaskOnce(ctx, 'dentalTasks', { accountId: row.accountId, kind: 'visit_request', entityType: 'contact', entityId: contact._id,
    reason: 'Visit request from Layla: book a time' }, now);
  return { contactId: contact._id };
}
