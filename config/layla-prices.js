// Layla's money check: an amount she states must be the price of the item it is said about,
// keep its qualifier ("from", a range), or come from a live fact or an order line. Pure, so the
// API preview, Convex and the tests share it.

const toLatin = s => String(s || '').replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0));
const norm = s => toLatin(s).normalize('NFKC').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const CURRENCY = /(omr|r\.?o\.?|rial|riyal|baisa|aed|sar|usd|\$|€|£|ر\.?\s?ع|ريال|بيسة|درهم|%)/i;
const MONEY = new RegExp(`(\\d[\\d.,]*)\\s*${CURRENCY.source}|${CURRENCY.source}\\s*(\\d[\\d.,]*)`, 'gi');
const FROM = /\b(from|starting|starts?\s+at|as low as|minimum)\b|يبدا|يبدأ|ابتداء|اعتبارا|من\s*\d|من\s+/i;
const RANGE_IN_LABEL = /(\d[\d.,]*)\s*(?:-|–|—|to|الى|إلى)\s*(\d[\d.,]*)/i;
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'for', 'with', 'per', 'ال']);

/** "1,200" → 1200, "25.000" → 25, "8" → 8. */
export const amountOf = text => {
  const n = Number(toLatin(text).replace(/,/g, '').replace(/[.]+$/, ''));
  return Number.isFinite(n) ? n : null;
};
const numbersIn = text => [...toLatin(text).matchAll(/\d[\d.,]*/g)].map(m => amountOf(m[0])).filter(n => n !== null);

/** One catalog row as the check sees it: the words that name it and the amounts it may be quoted at. */
function priced(row) {
  const names = [row.nameEn, row.nameAr].filter(Boolean).map(norm).filter(Boolean);
  const heads = names.map(n => n.split(' ').filter(w => !STOP.has(w) && w.length >= 3).at(-1)).filter(Boolean);
  const amounts = new Set(), mins = new Set(), ranges = [];
  for (const p of row.prices || []) {
    if (!p) continue;
    const label = String(p.label || '');
    const type = p.type || (RANGE_IN_LABEL.test(toLatin(label)) ? 'range' : FROM.test(label) ? 'from' : 'fixed');
    if (['free', 'quote', 'unavailable'].includes(type)) continue;
    if (type === 'range') {
      const m = toLatin(label).match(RANGE_IN_LABEL);
      const lo = p.minimum ?? (m ? amountOf(m[1]) : null), hi = p.maximum ?? (m ? amountOf(m[2]) : null);
      if (lo !== null && hi !== null) { ranges.push([lo, hi]); amounts.add(lo); amounts.add(hi); }
      continue;
    }
    const values = p.amount != null || p.minimum != null ? [p.amount ?? p.minimum] : numbersIn(label);
    for (const v of values) { amounts.add(v); if (type === 'from') mins.add(v); }
  }
  return { names, heads, amounts, mins, ranges };
}

const mentions = (item, text) => {
  const t = ` ${norm(text)} `;
  return item.names.some(n => t.includes(` ${n} `)) || item.heads.some(h => t.includes(` ${h} `));
};
const sentencesOf = reply => toLatin(reply).split(/(?<=[.!?؟\n])\s+/).filter(s => s.trim());

/** Whether an amount said in `sentence` is a true price of `item`, qualifier included. */
function truePrice(item, amount, sentence) {
  if (!item.amounts.has(amount)) return false;
  if (item.mins.has(amount) && !FROM.test(sentence)) return false;
  for (const [lo, hi] of item.ranges) {
    if (amount !== lo && amount !== hi) continue;
    const said = new Set(numbersIn(sentence));
    if (said.has(lo) && said.has(hi)) return true;
    if (amount === lo && FROM.test(sentence)) return true;
    return false;
  }
  return true;
}

/**
 * The first amount in `reply` that is not a traceable price, or null when every amount is.
 * @param {string} reply
 * `cited` holds the catalog rows the model named as its sources (BznsBrain mode); they bind an
 * amount when the sentence itself names no item.
 * @param {{ catalog?: object[], cited?: object[], facts?: string[], acks?: string[], history?: {role:string,text:string}[] }} ctx
 * @returns {string|null}
 */
export function untracedAmount(reply, ctx) {
  const items = (ctx.catalog || []).map(priced), cited = (ctx.cited || []).map(priced);
  const live = new Set([...(ctx.facts || []), ...(ctx.acks || [])].flatMap(numbersIn));
  const lastCustomer = (ctx.history || []).filter(h => h.role === 'customer').at(-1)?.text || '';
  const sentences = sentencesOf(reply);
  for (const [i, sentence] of sentences.entries()) {
    for (const m of sentence.matchAll(MONEY)) {
      const amount = amountOf(m[1] || m[3] || '');
      if (amount === null || live.has(amount)) continue;
      // The item it is said about: named in this sentence, else the one before, else a cited source, else the customer's question.
      const inScope = scope => items.filter(item => mentions(item, scope));
      const named = [inScope(sentence), inScope(sentences[i - 1] || ''), cited, inScope(lastCustomer)].find(list => list.length) || [];
      if (!named.some(item => truePrice(item, amount, sentence))) return m[0];
    }
  }
  return null;
}
