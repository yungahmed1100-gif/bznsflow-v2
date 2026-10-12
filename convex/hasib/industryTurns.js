// Layla's intake for the workshop and the contractor: a customer asking for a service or a project
// becomes one open request in Follow-ups for the team to book. Only the already validated fields
// count as intent; nothing the customer wrote is copied, and nothing is booked or priced here.
import { sectorTurnPack } from './workspace/turn.js';
import { openTaskOnce } from './workspace/tasks.js';

const fieldsOf = contact => new Map((contact.fields || []).map(field => [field.key, field.value]));

async function automotiveTurn(ctx, { row, contact, now, secret }) {
  if (!await sectorTurnPack(ctx, { row, secret, packId: 'automotive' })) return null;
  const fields = fieldsOf(contact);
  if (!fields.get('service') && !fields.get('date') && !fields.get('time')) return null;
  // A customer who already has a booking coming up needs no new request.
  const vehicles = (await ctx.db.query('automotiveVehicles').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(20)).filter(x => x.accountId === row.accountId);
  if (vehicles.length) {
    const ids = new Set(vehicles.map(x => String(x._id)));
    const coming = await ctx.db.query('automotiveAppointments').withIndex('by_account_start', q => q.eq('accountId', row.accountId).gte('startsAt', now)).take(500);
    if (coming.some(x => ids.has(String(x.vehicleId)) && ['scheduled', 'confirmed'].includes(x.status))) return null;
  }
  await openTaskOnce(ctx, 'automotiveTasks', { accountId: row.accountId, kind: 'chat_booking_request', entityType: 'contact', entityId: contact._id,
    reason: 'Service request from Layla: offer the customer a slot' }, now);
  return { contactId: contact._id };
}

async function constructionTurn(ctx, { row, contact, now, secret }) {
  if (!await sectorTurnPack(ctx, { row, secret, packId: 'construction' })) return null;
  const fields = fieldsOf(contact);
  if (!fields.get('service') && !fields.get('project_type')) return null;
  const projects = await ctx.db.query('constructionProjects').withIndex('by_account_status', q => q.eq('accountId', row.accountId).eq('status', 'tender')).take(200);
  if (projects.some(p => String(p.contactId) === String(contact._id))) return null;
  await openTaskOnce(ctx, 'constructionTasks', { accountId: row.accountId, kind: 'site_visit_request', entityType: 'contact', entityId: contact._id,
    reason: 'Project enquiry from Layla: arrange a site visit' }, now);
  return { contactId: contact._id };
}

/** Both intakes; each runs only for its own sector. */
export async function industryTurns(ctx, args) {
  await automotiveTurn(ctx, args);
  await constructionTurn(ctx, args);
}
