// Layla's intake for Media: a customer's project message becomes (or updates) one open brief.
// Only facts the customer gave are copied; a shoot date in free text is kept as their words,
// never turned into a booked time.
import { sectorTurnPack } from './workspace/turn.js';
import { workspaceForManager } from './workspaceState.js';
import { executeMedia } from './mediaState.js';
import { automationActor } from './workspace/automation.js';
import { namedItems } from '../../config/layla-prices.js';
import { productionTypeFor } from '../../config/media-intake.js';

const amount = value => {
  const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : undefined;
};
// A request id derived from the conversation, so a repeated message replays instead of duplicating.
const hash8 = value => { let h = 2166136261; for (const c of String(value || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
const requestId = (person, now) => { const s = now.toString(16).padStart(12, '0').slice(-12); return `${hash8(person._id)}-${hash8('media').slice(0, 4)}-4${s.slice(0, 3)}-8${s.slice(3, 6)}-${s.slice(6)}${hash8(person._id).slice(0, 6)}`; };

export async function mediaTurn(ctx, { row, person, contact, now, secret, text = '', catalog = [] }) {
  const pack = await sectorTurnPack(ctx, { row, secret, packId: 'media' });
  if (!pack) return null;
  const tenant = { accountId: row.accountId, row, secret, pack };
  const fields = new Map((contact.fields || []).map(field => [field.key, field.value]));
  if (!fields.get('need')) return null;
  const workspace = await workspaceForManager(ctx, row.accountId, now);
  // Layla acts here, named as herself in the activity; Media allows her the brief and nothing more.
  const actor = automationActor(workspace, row.accountId, 'layla');
  // One open brief per customer: a reply updates it rather than opening another.
  const open = (await ctx.db.query('mediaProductions').withIndex('by_contact', q => q.eq('contactId', contact._id)).take(20)).find(p => p.accountId === row.accountId && p.status === 'brief_incomplete');
  const media = { purpose: String(fields.get('need')).slice(0, 240), ...(fields.get('area') ? { location: String(fields.get('area')).slice(0, 160) } : {}),
    ...(fields.get('date_needed') ? { dateNeeded: String(fields.get('date_needed')).slice(0, 80) } : {}), ...(amount(fields.get('budget')) ? { budgetMinor: amount(fields.get('budget')) } : {}) };
  const saved = await executeMedia(ctx, tenant, actor, open
    ? { operation: 'media_production_save', productionId: open._id, version: open.version, media }
    : { operation: 'media_production_save', requestId: requestId(person, now), media: { ...media, contactId: contact._id, conversationId: person._id, source: person.channel || 'whatsapp', title: String(fields.get('need')).slice(0, 120),
      ...(productionTypeFor(fields.get('need')) ? { productionType: productionTypeFor(fields.get('need')) } : {}) } }, now);
  if (!saved?.ok) return null;
  // The catalog services the customer named, kept on the brief so a quote can be priced from them.
  const named = namedItems(catalog.filter(r => r.entryKey), text).map(r => r.entryKey);
  if (named.length) {
    const p = await ctx.db.get(saved.value.id);
    const keys = [...new Set([...(p.catalogEntryKeys || []), ...named])].slice(0, 10);
    if (keys.length !== (p.catalogEntryKeys || []).length) await ctx.db.patch(p._id, { catalogEntryKeys: keys });
  }
  return { productionId: saved.value.id };
}
