// Adiba's pricing rules, shared by Convex, the API and the screens. Adiba drafts quotes and offers
// for the owner's approval; she never invents a number. A line is priced only from a fixed catalog
// price or a value the owner set in settings; anything else stays unpriced for the owner to fill.

/** Why an offer needs the owner, in the order they are shown. */
export const OFFER_REASONS = Object.freeze(['unpriced_line', 'price_from', 'price_range', 'price_quote', 'custom_deliverable', 'rush', 'above_limit', 'auto_quote_off', 'extra_scope', 'discount_requested']);
export const PRICE_SOURCES = Object.freeze(['catalog_fixed', 'settings', 'owner', 'unpriced']);
const MAX_MINOR = 1e10;

/**
 * A catalog price in baisa only when it is a fixed amount; null for from, range, quote, free,
 * recurring and unavailable, because those are not a price Adiba may promise.
 * (Dental keeps servicePriceMinor, which takes the low end for its visit charges.)
 * @param {{type?: string, amount?: number}[]} prices
 * @returns {number|null}
 */
export function fixedPriceMinor(prices = []) {
  const fixed = (prices || []).filter(p => p?.type === 'fixed' && Number.isFinite(p.amount) && p.amount >= 0);
  if (fixed.length !== 1) return null;
  const minor = Math.round(fixed[0].amount * 1000);
  return minor < MAX_MINOR ? minor : null;
}

/** The reason a catalog price is not fixed, or null when it is. */
export function priceReason(prices = []) {
  if (fixedPriceMinor(prices) !== null) return null;
  const types = new Set((prices || []).map(p => p?.type));
  if (types.has('range')) return 'price_range';
  if (types.has('from')) return 'price_from';
  if (types.has('quote')) return 'price_quote';
  return 'unpriced_line';
}

/**
 * Prices each requested line. `source` says where the price came from; a line with no fixed
 * source keeps `unitPriceMinor` undefined.
 * @param {{ name: string, qty?: number, catalogPrices?: object[], settingsMinor?: number, ownerMinor?: number, custom?: boolean }[]} lines
 */
export function priceLines(lines = []) {
  return lines.map(l => {
    const qty = Number.isInteger(l.qty) && l.qty > 0 ? l.qty : 1;
    if (Number.isInteger(l.ownerMinor) && l.ownerMinor >= 0) return { name: l.name, qty, unitPriceMinor: l.ownerMinor, priceSource: 'owner' };
    if (Number.isInteger(l.settingsMinor) && l.settingsMinor >= 0) return { name: l.name, qty, unitPriceMinor: l.settingsMinor, priceSource: 'settings' };
    const fixed = l.custom ? null : fixedPriceMinor(l.catalogPrices);
    if (fixed !== null) return { name: l.name, qty, unitPriceMinor: fixed, priceSource: 'catalog_fixed' };
    return { name: l.name, qty, priceSource: 'unpriced', reason: l.custom ? 'custom_deliverable' : priceReason(l.catalogPrices) };
  });
}

/** Sum of priced lines, or null while any line is unpriced. */
export function offerTotal(lines = []) {
  if (!lines.length || lines.some(l => !Number.isInteger(l.unitPriceMinor))) return null;
  return lines.reduce((sum, l) => sum + l.unitPriceMinor * l.qty, 0);
}

/**
 * Why this offer goes to the owner. An empty list means Hasib may quote it himself.
 * @param {object[]} priced lines from priceLines
 * @param {{ limitMinor?: number, rush?: boolean, extraScope?: boolean, discountRequested?: boolean }} [flags]
 */
export function offerReasons(priced, { limitMinor = 0, rush = false, extraScope = false, discountRequested = false } = {}) {
  const reasons = new Set(priced.filter(l => l.priceSource === 'unpriced').map(l => l.reason || 'unpriced_line'));
  const total = offerTotal(priced);
  // The automatic-quote limit is about quotes; extra scope is always the owner's decision.
  if (!extraScope && total !== null && !(limitMinor > 0)) reasons.add('auto_quote_off');
  else if (!extraScope && total !== null && total > limitMinor) reasons.add('above_limit');
  if (rush) reasons.add('rush');
  if (extraScope) reasons.add('extra_scope');
  if (discountRequested) reasons.add('discount_requested');
  return OFFER_REASONS.filter(r => reasons.has(r));
}

/** A deposit from a percentage, rounded to the baisa; never above the total. */
export const depositMinor = (totalMinor, percent) => Math.min(totalMinor, Math.round(totalMinor * Math.max(0, Math.min(100, percent || 0)) / 100));
