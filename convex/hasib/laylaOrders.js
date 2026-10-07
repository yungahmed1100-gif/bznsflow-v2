// Layla's commerce turn, run inside message ingest for every customer message.
// From one read of the message she (1) answers from live stock, (2) records the
// demand, (3) files or updates the chat's order and (4) confirms it herself when
// everything is in stock and unambiguous. Anything else waits for the owner with
// a reason. Deterministic: names, sizes, prices and stock come from Hasib rows.
import { phrase } from '../../config/layla-tones.js';
import { extractQualification } from '../../config/layla-qualification.js';
import { isLivePack } from '../../config/hasib-packs.js';
import { hasibEnabled } from './gate.js';
import { planFor, HASIB_PLANS } from './plans.js';
import { packFor } from './shared.js';
import { matchItem } from './matching.js';
import { formatMinor, normalizeDigits } from './money.js';
import { createOrder, updatePendingOrder, changeStatus } from './ordersState.js';
import { recordDemand } from './demandState.js';

// Arabic words are matched whole (with ال/ب prefixes and ها/ه suffixes): "توصلون" contains لون but is not about colour.
const arWord = words => `(?<![\u0600-\u06ff])(?:ال|بال|ب)?(?:${words})(?:ها|ه|هم)?(?![\u0600-\u06ff])`;
const PRICE_OR_OPTION = new RegExp(`\\b(how much|price|size|colou?r|available)\\b|${arWord('كم|سعر|مقاس|لون|متوفر')}`, 'i');
const FOLLOW_UP = new RegExp(`\\b(size|colou?r|qty|quantity|how much|price|order|deliver\\w*|pick ?up|\\d{1,3})\\b|${arWord('مقاس|لون|كم|سعر|اطلب|أطلب|توصيل|استلام')}|[0-9٠-٩]`, 'i');
/** "I want the black abaya" is an order for one; a bare question is not. */
const BUYING = /\b(want|need|order|buy|take|reserve|book|get me)\b|أبغى|ابغى|ابغا|أبغا|أبي|ابي|أريد|اريد|ودي|اطلب|أطلب|احجز|أحجز|بشتري|باخذ|بآخذ/i;
const MAX_QTY = 99, DAY = 86400000;
const OPEN_CONFIRMED = ['confirmed', 'ready', 'out_for_delivery'];
const isArabic = text => /[؀-ۿ]/.test(text || '');
const money = (minor, ar) => `${formatMinor(minor)} ${ar ? 'ر.ع.' : 'OMR'}`;
const nameOf = (item, ar) => (ar ? item.nameAr || item.nameEn : item.nameEn || item.nameAr);
const optionLabel = v => v.options.map(o => o.value).join(' / ');

export function acknowledgement(number, text, tone) {
  return phrase(tone, 'orderReceived', isArabic(text) ? 'ar' : 'en', { number });
}
function confirmation(order, text, tone) {
  const ar = isArabic(text);
  const items = order.lines.map(l => `${l.qty} × ${l.label}`).join(ar ? '، ' : ', ');
  return phrase(tone, 'orderConfirmed', ar ? 'ar' : 'en', { number: order.number, items, total: money(order.totalMinor, ar) });
}

/** What Layla says about a product, read from live stock. Names, options and prices are facts; only the joining words follow the tone. */
export function stockLine(item, variants, text, tone) {
  const ar = isArabic(text), lang = ar ? 'ar' : 'en', name = nameOf(item, ar);
  const inStock = item.trackStock ? variants.filter(v => v.onHand > 0) : variants;
  if (!inStock.length) return phrase(tone, 'outOfStock', lang, { name });
  const prices = inStock.map(v => v.priceMinor), min = Math.min(...prices), max = Math.max(...prices);
  const price = min === max ? money(min, ar) : `${ar ? 'من' : 'from'} ${money(min, ar)}`;
  const labels = [...new Set(inStock.map(optionLabel).filter(Boolean))].slice(0, 8);
  if (!labels.length) return phrase(tone, 'inStock', lang, { name, price });
  return phrase(tone, 'available', lang, { name, price, options: labels.join(ar ? '، ' : ', ') });
}

/** The variant whose option values (size 56, Black, 128GB) are named in the message. */
function pickVariant(variants, text) {
  const words = ` ${normalizeDigits(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const score = v => v.options.filter(o => words.includes(` ${normalizeDigits(o.value).toLowerCase()} `)).length;
  const ranked = variants.map(v => ({ v, n: score(v) })).sort((a, b) => b.n - a.n);
  if (ranked[0]?.n > 0 && ranked[0].n !== ranked[1]?.n) return { variant: ranked[0].v, confirmed: true };
  return { variant: variants.find(v => v.onHand > 0) || variants[0], confirmed: variants.length === 1 };
}

async function commerceContext(ctx, row, secret) {
  if (!(await hasibEnabled(ctx))) return null;
  if (!HASIB_PLANS.includes(await planFor(ctx, row.accountId))) return null;
  const tenant = { accountId: row.accountId, row, secret };
  const pack = await packFor(ctx, tenant);
  // A clinic's stock is its own supplies: Layla never quotes it or files orders from chat.
  if (!isLivePack(pack.id) || pack.modules.orders !== 'available' || pack.internalStock) return null;
  tenant.pack = pack;
  return tenant;
}

/** Confirm the order when every line is in stock and nothing is unclear; otherwise record why not. */
async function confirmOrFlag(ctx, tenant, orderId, now) {
  const order = await ctx.db.get(orderId);
  const flags = new Set(order.flags || []), need = new Map();
  for (const l of order.lines) if (l.variantId) need.set(l.variantId, (need.get(l.variantId) || 0) + l.qty);
  for (const [variantId, qty] of need) {
    const v = await ctx.db.get(variantId);
    if (!v || v.archived || v.onHand < qty) flags.add('out_of_stock');
  }
  if (order.lines.some(l => !l.variantId)) flags.add('needs_review');
  if (flags.size) {
    await ctx.db.patch(order._id, { flags: [...flags] });
    return { confirmed: false };
  }
  // Phones: the oldest units in stock go first.
  const lineSerials = [];
  for (const l of order.lines.filter(x => x.serialized)) {
    const units = (await ctx.db.query('hasibSerials').withIndex('by_variant_status', q => q.eq('variantId', l.variantId).eq('status', 'in_stock')).take(200))
      .filter(u => u.accountId === tenant.accountId).sort((a, b) => a.receivedAt - b.receivedAt || a.serial.localeCompare(b.serial));
    lineSerials.push({ variantId: l.variantId, serials: units.slice(0, l.qty - (l.serials?.length || 0)).map(u => u.serial) });
  }
  const moved = await changeStatus(ctx, tenant.accountId, { orderId: order._id, to: 'confirmed', version: order.version, lineSerials }, now);
  if (!moved.ok) { await ctx.db.patch(order._id, { flags: ['needs_review'] }); return { confirmed: false }; }
  return { confirmed: true, order: await ctx.db.get(order._id) };
}

async function labelled(ctx, order, text) {
  const ar = isArabic(text), lines = [];
  for (const l of order.lines) {
    const item = l.itemId && await ctx.db.get(l.itemId), v = l.variantId && await ctx.db.get(l.variantId);
    lines.push({ qty: l.qty, label: item ? `${nameOf(item, ar)}${v && optionLabel(v) ? ` (${optionLabel(v)})` : ''}` : l.name });
  }
  return { number: order.number, totalMinor: order.totalMinor, lines };
}

/**
 * One commerce turn. Returns `{ photo, facts, ack }` (any may be null), or null when
 * Hasib is off for the account or the message names no stock product.
 */
export async function commerceTurn(ctx, { row, person, contact, text, intent, now, secret }) {
  if (!text || !person) return null;
  const tenant = await commerceContext(ctx, row, secret);
  if (!tenant) return null;
  const { accountId } = tenant;
  const products = (await ctx.db.query('hasibItems').withIndex('by_account_archived_updated', q => q.eq('accountId', accountId).eq('archived', false)).take(300));
  if (!products.length) return null;
  // Read the message as a retail order whatever Layla's own sector is; her questions are untouched.
  const { updates } = extractQualification({ text, sectorId: 'retail', catalog: products.map(p => ({ nameEn: p.nameEn, nameAr: p.nameAr, prices: [] })), asked: [], askedRecently: false, existing: [], intent });
  const field = key => updates.find(u => u.key === key)?.value;
  // "size 52, I want 1" or "كم سعرها؟": no product named, so it is the one this chat was about today.
  const remembered = !field('item') && FOLLOW_UP.test(text) ? contact?.fields?.find(f => f.key === 'item' && now - (f.at || 0) < DAY)?.value : null;
  const named = field('item') || remembered;
  const item = named && await matchItem(ctx, accountId, named);
  if (!item) return null;
  const variants = (await ctx.db.query('hasibVariants').withIndex('by_item', q => q.eq('itemId', item._id)).take(50)).filter(v => !v.archived);
  if (!variants.length) return null;
  const facts = stockLine(item, variants, text, row.profile?.tone);
  // The product photo goes with the answer; ingest sends it once per chat.
  const photo = item.photoId ? { storageId: item.photoId, caption: nameOf(item, isArabic(text)) } : null;
  if (contact) await recordDemand(ctx, { accountId, contact, conversationId: person._id, updates: [{ key: 'item', value: item.nameEn || item.nameAr }], intent: 'catalog_item', at: now });

  if (item.kind !== 'product') return { photo, facts, ack: null };
  const said = parseInt(normalizeDigits(field('quantity') || ''), 10);
  const qty = Number.isSafeInteger(said) && said > 0 ? Math.min(said, MAX_QTY) : BUYING.test(text) ? 1 : 0;
  // A follow-up about delivery repeats nothing; one about price or size gets the stock line again.
  if (!qty) return remembered && !PRICE_OR_OPTION.test(text) ? null : { photo, facts, ack: null };
  const { variant, confirmed } = pickVariant(variants, text);
  const type = ['delivery', 'pickup'].includes(field('fulfilment')) ? field('fulfilment') : undefined, area = field('area');
  const chatOrders = (await ctx.db.query('hasibOrders').withIndex('by_conversation_status', q => q.eq('conversationId', person._id)).take(50))
    .filter(o => o.accountId === accountId && o.source === 'layla');

  // Already confirmed by Layla in this chat and the customer wants something changed: the owner decides.
  const settled = chatOrders.find(o => OPEN_CONFIRMED.includes(o.status) && now - o.createdAt < DAY && o.lines.some(l => l.itemId === item._id));
  if (settled) {
    await ctx.db.patch(settled._id, { flags: [...new Set([...(settled.flags || []), 'change_requested'])], updatedAt: now });
    return { photo, facts: null, ack: null };
  }

  let orderId, fresh = false;
  const open = chatOrders.find(o => o.status === 'pending');
  if (open) {
    const lines = open.lines.map(l => ({ ...(l.variantId ? { variantId: l.variantId } : { name: l.name }), qty: l.qty, unitPriceMinor: l.unitPriceMinor, itemId: l.itemId, ...(l.discountMinor ? { discountMinor: l.discountMinor } : {}), ...(l.role ? { role: l.role } : {}) }));
    const flags = new Set(open.flags || []);
    let at = lines.findIndex(l => l.variantId === variant._id);
    // The customer now names the size Layla had to guess: swap the guessed variant.
    if (at < 0 && confirmed && flags.has('options_unconfirmed')) at = lines.findIndex(l => l.itemId === item._id);
    if (at >= 0) {
      lines[at] = { ...lines[at], variantId: variant._id, unitPriceMinor: variant.priceMinor, ...(field('quantity') ? { qty } : {}) };
      if (confirmed) flags.delete('options_unconfirmed');
    } else lines.push({ variantId: variant._id, qty });
    flags.delete('out_of_stock');
    const fulfilment = type || area ? { type: type || open.fulfilment.type, ...((area || open.fulfilment.area) ? { area: area || open.fulfilment.area } : {}), ...(open.fulfilment.dueAt ? { dueAt: open.fulfilment.dueAt } : {}) } : undefined;
    const updated = await updatePendingOrder(ctx, accountId, open, lines.map(({ itemId, ...l }) => l), now, { allowSerializedDraft: true, fulfilment });
    if (!updated.ok) throw new Error(updated.reason);
    await ctx.db.patch(open._id, { flags: [...flags] });
    orderId = open._id;
  } else {
    const created = await createOrder(ctx, tenant, { requestId: `layla:${person._id}:${now}`, channel: person.channel || 'whatsapp', source: 'layla', conversationId: person._id,
      fulfilment: { type: type || 'pickup', ...(area ? { area } : {}) }, lines: [{ variantId: variant._id, qty }],
      // Shown to the owner in their language; the customer is never told a size Layla guessed.
      ...(confirmed ? {} : { flags: ['options_unconfirmed'] }) }, now, { internal: true });
    if (!created.ok) throw new Error(created.reason);
    orderId = created.value.id;
    fresh = true;
  }
  const result = await confirmOrFlag(ctx, tenant, orderId, now);
  if (result.confirmed) return { photo, facts: null, ack: confirmation(await labelled(ctx, result.order, text), text, row.profile?.tone) };
  const order = await ctx.db.get(orderId);
  return { photo, facts, ack: fresh ? acknowledgement(order.number, text, row.profile?.tone) : null };
}
