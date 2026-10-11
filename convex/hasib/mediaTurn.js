// Layla's intake for Media: a customer's project message becomes (or updates) one open brief.
// Only facts the customer gave are copied; a shoot date in free text is kept as their words,
// never turned into a booked time.
import { isLivePack } from '../../config/hasib-packs.js';
import { hasibEnabled } from './gate.js';
import { HASIB_PLANS, planFor } from './plans.js';
import { packFor } from './shared.js';
import { workspaceForManager } from './workspaceState.js';
import { executeMedia } from './mediaState.js';

const amount = value => {
  const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : undefined;
};
// A request id derived from the conversation, so a repeated message replays instead of duplicating.
const hash8 = value => { let h = 2166136261; for (const c of String(value || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
const requestId = (person, now) => { const s = now.toString(16).padStart(12, '0').slice(-12); return `${hash8(person._id)}-${hash8('media').slice(0, 4)}-4${s.slice(0, 3)}-8${s.slice(3, 6)}-${s.slice(6)}${hash8(person._id).slice(0, 6)}`; };

export async function mediaTurn(ctx, { row, person, contact, now, secret }) {
  if (!(await hasibEnabled(ctx)) || !HASIB_PLANS.includes(await planFor(ctx, row.accountId))) return null;
  const tenant = { accountId: row.accountId, row, secret }, pack = await packFor(ctx, tenant);
  // Media is not a live pack yet: this runs only in the synthetic preview harness.
  if (pack.id !== 'media' || !(isLivePack(pack.id) || ctx.hasibPreview === true)) return null;
  tenant.pack = pack;
  const fields = new Map((contact.fields || []).map(field => [field.key, field.value]));
  if (!fields.get('need')) return null;
  const workspace = await workspaceForManager(ctx, row.accountId, now);
  const actor = { workspace, role: 'manager', actorAccountId: row.accountId };
  // One open brief per customer: a reply updates it rather than opening another.
  const open = (await ctx.db.query('mediaProductions').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(20)).find(p => p.accountId === row.accountId && p.status === 'brief_incomplete');
  const media = { purpose: String(fields.get('need')).slice(0, 240), ...(fields.get('area') ? { location: String(fields.get('area')).slice(0, 160) } : {}),
    ...(fields.get('date_needed') ? { dateNeeded: String(fields.get('date_needed')).slice(0, 80) } : {}), ...(amount(fields.get('budget')) ? { budgetMinor: amount(fields.get('budget')) } : {}) };
  const saved = await executeMedia(ctx, tenant, actor, open
    ? { operation: 'media_production_save', productionId: open._id, version: open.version, media }
    : { operation: 'media_production_save', requestId: requestId(person, now), media: { ...media, contactId: contact._id, conversationId: person._id, source: person.channel || 'whatsapp', title: String(fields.get('need')).slice(0, 120) } }, now);
  return saved?.ok ? { productionId: saved.value.id } : null;
}
