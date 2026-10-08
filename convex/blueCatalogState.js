// The services-and-prices catalog: Layla quotes only approved entries, word for word.
// Pure executor (Convex ctx in, result out) so tests drive the same code the mutation runs.
//
// An edit to an approved entry is staged in `pending`: Layla keeps quoting the approved values until
// the owner publishes, so a half-finished edit never removes a service from her answers.
import { syncServicesForOwner } from './hasib/serviceSync.js';
import { fenceRepliesForOwner } from './laylaTurn.js';

export const CATALOG_LIMIT = 1000;
const PRICE_TYPES = ['fixed', 'from', 'range', 'free', 'quote', 'recurring', 'unavailable'];
const TEXT_FIELDS = ['category', 'benefitEn', 'benefitAr', 'descriptionEn', 'descriptionAr', 'availability', 'source', 'laylaUseEn', 'laylaUseAr'];
const clean = (s, n) => typeof s === 'string' && s.length <= n && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
export function validEntry(e) {
  return /^[a-f0-9-]{36}$/.test(e?.entryKey || '') && ['service', 'product'].includes(e.kind) && clean(e.nameEn, 160) && clean(e.nameAr, 160) && !!(e.nameEn.trim() || e.nameAr.trim())
    && TEXT_FIELDS.every(k => clean(e[k], 700)) && Number.isFinite(e.confidence) && e.confidence >= 0 && e.confidence <= 1
    && Number.isSafeInteger(e.sortOrder) && e.sortOrder >= 0 && Array.isArray(e.prices) && e.prices.length <= 20
    && e.prices.every(p => PRICE_TYPES.includes(p.type) && clean(p.currency, 8) && clean(p.unit, 80) && clean(p.label, 160));
}
const editable = ({ entryKey, ...rest }) => rest;
/** Approved values with any staged edit applied: what Layla would quote once the owner publishes. */
export const withPending = row => (row?.pending ? { ...row, ...row.pending } : row);
const publicRow = ({ _id, _creationTime, ownerKey, ...row }) => ({ ...row, state: row.status === 'approved' ? (row.pending ? 'changed' : 'published') : 'draft' });

export async function executeCatalog(ctx, args, now = Date.now()) {
  // Owner keys are server-derived (an account id, or review_<setup id> before sign-in), never client input.
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(args.ownerKey || '')) return { ok: false, reason: 'catalog_unauthorized' };
  const owner = args.ownerKey;
  const byStatus = status => ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order', q => q.eq('ownerKey', owner).eq('status', status)).collect();
  const byKey = entryKey => ctx.db.query('blueCatalogEntries').withIndex('by_owner_key', q => q.eq('ownerKey', owner).eq('entryKey', entryKey)).unique();
  const meta = await ctx.db.query('blueCatalogMeta').withIndex('by_owner', q => q.eq('ownerKey', owner)).unique();
  const revision = meta?.revision || 1;
  // Products synced from Stock are edited in Stock only.
  const managed = async entryKey => (await byKey(entryKey))?.source === 'hasib_stock';
  if (['save', 'archive', 'approve'].includes(args.operation) && await managed(args.operation === 'save' ? args.entry?.entryKey || '' : args.entryKey || '')) return { ok: false, reason: 'managed_by_stock' };
  if (args.operation === 'saveMany') { for (const e of args.entries || []) if (await managed(e.entryKey)) return { ok: false, reason: 'managed_by_stock' }; }
  if (args.operation === 'list') {
    const all = [...await byStatus('draft'), ...await byStatus('approved')].sort((a, b) => a.sortOrder - b.sortOrder);
    const start = Math.max(0, args.cursor || 0), limit = Math.min(args.all ? CATALOG_LIMIT : 50, Math.max(1, args.limit || 25));
    return { ok: true, value: { entries: all.slice(start, start + limit).map(publicRow), cursor: start + limit < all.length ? start + limit : null, total: all.length, revision } };
  }
  if (args.operation === 'match') {
    if (!clean(args.query || '', 1000)) return { ok: false, reason: 'invalid_catalog_query' };
    const query = (args.query || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    const matches = (await byStatus('approved')).filter(row => [row.nameEn, row.nameAr].some(name => name.trim() && query.includes(name.toLocaleLowerCase()))).slice(0, 10).map(({ _id, _creationTime, ownerKey, ...row }) => row);
    return { ok: true, value: { entries: matches, revision } };
  }
  let fence = false;
  // Write one entry: an approved row stages the edit; anything else stays a draft until publish.
  const write = async item => {
    const existing = await byKey(item.entryKey);
    if (existing?.status === 'approved') { await ctx.db.patch(existing._id, { pending: editable(item), pendingAt: now, updatedAt: now }); return; }
    const value = { ...item, ownerKey: owner, status: 'draft', revision, updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert('blueCatalogEntries', { ...value, createdAt: now });
  };
  if (args.operation === 'saveMany' || args.operation === 'save') {
    const entries = args.operation === 'save' ? [args.entry] : args.entries || [];
    if (!entries.length || entries.length > 25 || !entries.every(validEntry) || new Set(entries.map(e => e.entryKey)).size !== entries.length) return { ok: false, reason: 'invalid_catalog_entry' };
    const current = [...await byStatus('draft'), ...await byStatus('approved')];
    const keys = new Set(current.map(row => row.entryKey));
    if (current.length + entries.filter(e => !keys.has(e.entryKey)).length > CATALOG_LIMIT) return { ok: false, reason: 'catalog_limit' };
    for (const item of entries) await write(item);
  } else if (['archive', 'approve', 'discard'].includes(args.operation)) {
    const row = await byKey(args.entryKey || '');
    if (!row) return { ok: false, reason: 'catalog_not_found' };
    if (args.operation === 'discard') await ctx.db.patch(row._id, { pending: undefined, pendingAt: undefined, updatedAt: now });
    else {
      fence = row.status === 'approved' || args.operation === 'approve';
      await ctx.db.patch(row._id, { status: args.operation === 'approve' ? 'approved' : 'archived', ...(args.operation === 'approve' && row.pending ? { ...row.pending, pending: undefined, pendingAt: undefined } : {}), updatedAt: now });
    }
  } else if (args.operation === 'publish') {
    for (const row of await byStatus('draft')) await ctx.db.patch(row._id, { status: 'approved', revision: revision + 1, updatedAt: now });
    for (const row of await byStatus('approved')) if (row.pending) await ctx.db.patch(row._id, { ...row.pending, pending: undefined, pendingAt: undefined, revision: revision + 1, updatedAt: now });
    if (meta) await ctx.db.patch(meta._id, { revision: revision + 1, publishedAt: now, updatedAt: now });
    else await ctx.db.insert('blueCatalogMeta', { ownerKey: owner, revision: 2, publishedAt: now, updatedAt: now });
    fence = true;
  } else if (args.operation !== 'summary') return { ok: false, reason: 'invalid_catalog_operation' };
  // What Layla may quote changed: bump the business's profile version so replies written from the
  // old catalog are fenced out at claim and send time, like a bzns.md publish.
  if (fence) await fenceRepliesForOwner(ctx, owner, now);
  // Clinics charge visits from these services: keep Hasib's service items in step. Never blocks the catalog write.
  if (args.operation !== 'summary') try { await syncServicesForOwner(ctx, owner, now); } catch (error) { console.error('hasib_service_sync_failed', error instanceof Error ? error.message : 'unknown'); }
  const approved = await byStatus('approved');
  const summary = approved.slice(0, 100).map(r => `${r.nameEn || r.nameAr}${r.prices[0]?.label ? `: ${r.prices[0].label}` : ''}`).join('; ').slice(0, 350);
  return { ok: true, value: { revision: args.operation === 'publish' ? revision + 1 : revision, summary } };
}
