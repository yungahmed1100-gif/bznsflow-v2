// A phone store's repair quote as an Adiba offer (ascend/retail-tech.md). The labour figure is the
// technician's, so the owner always approves the offer; a part keeps the price on its stock line.
// An offer is tied to the exact quote it was made from: the customer's yes approves that quote and
// no other, and a revised quote withdraws the offer.
import { owned } from '../blueTenant.js';
import { executeRepairs } from './repairsState.js';
import { stableRequestId } from './workspace/records.js';

export const REPAIR_SUBJECT = 'repair';
const QUOTED = ['diagnosing', 'waiting_parts'];

/** A repair whose quote is with the customer: labour to pay, not under warranty, not yet approved. */
export const quoteWaiting = r => (r.approvalStatus || 'awaiting') === 'awaiting' && !r.underWarranty && r.labourMinor > 0 && QUOTED.includes(r.status);

/** The quote's identity: labour and each part with its price. Any change gives a different key. */
export const quoteKey = (repair, partPrices = []) => stableRequestId(`${repair.labourMinor}|${repair.parts.map((p, i) => `${p.variantId}:${p.qty}:${partPrices[i] ?? ''}`).join(',')}`);
export const offerRequestId = (repair, partPrices) => `auto-repair:${repair._id}:${quoteKey(repair, partPrices)}`;

/** The price each part is charged at: the one recorded on the repair, else its stock line's. */
export async function partPrices(ctx, accountId, repair) {
  const out = [];
  for (const p of repair.parts) {
    const variant = p.variantId ? await owned(ctx, p.variantId, accountId, 'hasibVariants') : null;
    out.push(p.unitPriceMinor ?? variant?.priceMinor ?? null);
  }
  return out;
}

/** Offer lines: labour from the technician (the owner's to approve), parts at their stock price. */
export async function repairOfferLines(ctx, accountId, repair) {
  const lines = [{ key: 'labour', name: repair.device, qty: 1, ownerMinor: repair.labourMinor }];
  for (const [i, p] of repair.parts.entries()) {
    const variant = p.variantId ? await owned(ctx, p.variantId, accountId, 'hasibVariants') : null;
    const name = variant?.sku || `Part ${i + 1}`, base = { key: `p${i + 1}`, name, qty: p.qty || 1 };
    if (p.unitPriceMinor === undefined && Number.isInteger(variant?.priceMinor)) lines.push({ ...base, catalogPrices: [{ type: 'fixed', amount: variant.priceMinor / 1000 }] });
    else lines.push({ ...base, ...(Number.isInteger(p.unitPriceMinor ?? variant?.priceMinor) ? { ownerMinor: p.unitPriceMinor ?? variant.priceMinor } : {}) });
  }
  return lines;
}

/** The repair an offer was made from, while its quote is still the one the offer carries. */
async function currentQuote(ctx, tenant, offer) {
  const repair = await owned(ctx, offer.subjectId, tenant.accountId, 'hasibRepairs');
  if (!repair) return { ok: false, reason: 'repair_not_found' };
  if (offer.requestId !== offerRequestId(repair, await partPrices(ctx, tenant.accountId, repair))) return { ok: false, reason: 'repair_quote_changed' };
  return { ok: true, repair };
}

export const repairSubject = {
  /** Approve = the owner's figures become the repair's quote (a changed price re-saves it), then Adiba sends it. */
  async approve(ctx, tenant, actor, offer, now) {
    const current = await currentQuote(ctx, tenant, offer);
    if (!current.ok) return current;
    const { repair } = current;
    if (!quoteWaiting(repair)) return { ok: false, reason: 'repair_not_awaiting' };
    const priced = new Map(offer.lines.map(l => [l.key, l.unitPriceMinor]));
    const labourMinor = priced.get('labour') ?? repair.labourMinor;
    const parts = repair.parts.map((p, i) => ({ variantId: p.variantId, qty: p.qty, ...(priced.has(`p${i + 1}`) ? { unitPriceMinor: priced.get(`p${i + 1}`) } : p.unitPriceMinor !== undefined ? { unitPriceMinor: p.unitPriceMinor } : {}) }));
    const before = await partPrices(ctx, tenant.accountId, repair);
    if (labourMinor === repair.labourMinor && parts.every((p, i) => (p.unitPriceMinor ?? before[i]) === before[i])) return { ok: true };
    const saved = await executeRepairs(ctx, tenant, { operation: 'repair_update', repairId: repair._id, version: repair.version, labourMinor, parts }, now);
    if (!saved.ok) return saved;
    const next = await ctx.db.get(repair._id);
    await ctx.db.patch(offer._id, { requestId: offerRequestId(next, await partPrices(ctx, tenant.accountId, next)) });
    return { ok: true };
  },
  /** Accept = the customer's recorded yes approves the quote they were sent; the repair can then start. */
  async accept(ctx, tenant, actor, offer, { by }, now) {
    const current = await currentQuote(ctx, tenant, await ctx.db.get(offer._id) || offer);
    if (!current.ok) return current;
    if (!quoteWaiting(current.repair)) return { ok: false, reason: 'repair_not_awaiting' };
    return executeRepairs(ctx, tenant, { operation: 'repair_approval', repairId: current.repair._id, version: current.repair.version, approvedBy: `${by} · ${offer.ref}`.slice(0, 100) }, now);
  },
};
