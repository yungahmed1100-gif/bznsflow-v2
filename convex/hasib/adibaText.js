// Adiba's offer wording: deterministic, so every figure in it is a priced line and every term is the
// owner's own bzns.md text quoted word for word (bzns.md never holds amounts). No model writes this.
import { parseBzns } from '../../src/lib/bzns-doc.js';

const TERMS_HEADING = /payment|cancel|deposit|terms|polic|refund|الدفع|إلغاء|الغاء|العربون|الشروط|السياسات|الاسترداد/i;
const TERMS_MAX = 400;

/** "450.000 OMR" — three decimals, as Omani prices are written. */
export const money = (minor, currency = 'OMR') => `${(minor / 1000).toFixed(3)} ${currency}`;

/** The owner's terms that apply to an offer: up to two bzns.md sections about payment, cancellation or policies. */
export function termsFrom(markdown) {
  return parseBzns(markdown || '').sections.filter(s => s.body && TERMS_HEADING.test(s.heading)).slice(0, 2)
    .map(s => ({ heading: s.heading, body: s.body.length > TERMS_MAX ? `${s.body.slice(0, TERMS_MAX - 1)}…` : s.body }));
}

/** The words a customer accepts with. Plain "yes" works when this is the only open offer in the chat. */
export const acceptPhrase = (ref, ar) => (ar ? `موافق ${ref}` : `YES ${ref}`);

/**
 * The offer as the customer reads it. Every amount is from a priced line, the total or the deposit.
 * @param {{ ref: string, lines: {name:string, qty:number, unitPriceMinor:number}[], totalMinor: number, depositMinor?: number, currency: string, validUntil: number, business?: string }} offer
 * @param {{ ar?: boolean, terms?: {heading:string, body:string}[], timezone?: string, note?: string }} [o]
 */
export function offerText(offer, { ar = false, terms = [], timezone = 'Asia/Muscat', note = '' } = {}) {
  const date = new Date(offer.validUntil).toLocaleDateString(ar ? 'ar-OM' : 'en-GB', { timeZone: timezone, day: 'numeric', month: 'long', year: 'numeric' });
  const lines = offer.lines.map(l => `• ${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}: ${money(l.unitPriceMinor * l.qty, offer.currency)}`);
  const deposit = offer.depositMinor ? (ar ? `العربون عند القبول: ${money(offer.depositMinor, offer.currency)}` : `Deposit on acceptance: ${money(offer.depositMinor, offer.currency)}`) : '';
  const head = ar ? `عرض ${offer.ref}${offer.business ? ` من ${offer.business}` : ''}` : `Offer ${offer.ref}${offer.business ? ` from ${offer.business}` : ''}`;
  const total = ar ? `الإجمالي: ${money(offer.totalMinor, offer.currency)}` : `Total: ${money(offer.totalMinor, offer.currency)}`;
  const valid = ar ? `العرض ساري حتى ${date}.` : `Valid until ${date}.`;
  const accept = ar ? `للقبول، ردّ بـ: ${acceptPhrase(offer.ref, true)}` : `To accept, reply: ${acceptPhrase(offer.ref, false)}`;
  const termLines = terms.map(t => `${t.heading}: ${t.body.replace(/\s*\n\s*/g, ' ')}`);
  return [head, ...lines, total, deposit, note, valid, ...termLines, accept].filter(Boolean).join('\n');
}

/** What Layla may say about an open offer (its figures pass her price check as a live fact). */
export const offerFact = offer => `Offer ${offer.ref}: ${offer.lines.map(l => `${l.name} ${money(l.unitPriceMinor * l.qty, offer.currency)}`).join('; ')}; total ${money(offer.totalMinor, offer.currency)}${offer.depositMinor ? `; deposit ${money(offer.depositMinor, offer.currency)}` : ''}. Status: ${offer.status}.`;

/** The acknowledgement Layla adds, word for word, when a customer accepts. */
export const acceptedAck = (offer, ar) => ar
  ? `تم تسجيل قبولك للعرض ${offer.ref}. الإجمالي ${money(offer.totalMinor, offer.currency)}${offer.depositMinor ? `، والعربون المستحق ${money(offer.depositMinor, offer.currency)}` : ''}.`
  : `Recorded: you accepted ${offer.ref}. Total ${money(offer.totalMinor, offer.currency)}${offer.depositMinor ? `; deposit due ${money(offer.depositMinor, offer.currency)}` : ''}.`;
