// Answers from the owner's own bzns.md, quoted verbatim: a reworded FAQ question, or a
// sector section (delivery, returns, viewings…) found through a curated topic lexicon.
// Deterministic and grounded: nothing is generated, and anything unclear returns null so
// the team answers instead.
import { normalizeText } from '../../../src/lib/bzns-doc.js';
import { safeReply } from './reply-guard.js';

const STOP = new Set(['do', 'does', 'did', 'you', 'your', 'yours', 'i', 'im', 'a', 'an', 'the', 'is', 'are', 'am', 'can', 'could', 'we', 'it', 'to', 'of', 'for',
  'in', 'on', 'at', 'with', 'have', 'has', 'any', 'what', 'how', 'there', 'me', 'my', 'please', 'and', 'or', 'be', 'will', 'who', 'this', 'that', 'u', 'pls',
  'هل', 'في', 'من', 'على', 'عن', 'انتم', 'عندكم', 'ممكن', 'ما', 'ماذا', 'كيف', 'و', 'يا', 'لو', 'ابي', 'ابغى', 'اريد', 'انا', 'لي', 'لكم', 'فيه', 'او']);
const stem = word => (/^[a-z]{4,}s$/.test(word) ? word.slice(0, -1) : word.replace(/^(ال|وال)(?=.{2,})/, ''));
const tokens = text => new Set(normalizeText(text).split(' ').filter(w => w && !STOP.has(w)).map(stem));

/** A customer's rewording of an owner FAQ: most of the FAQ's words, and a single clear winner. */
export function matchFaq(text, faqs = []) {
  const asked = tokens(text);
  if (asked.size < 1) return null;
  const scored = faqs.map(faq => {
    const want = tokens(faq.question);
    const shared = [...want].filter(w => asked.has(w)).length;
    return { faq, shared, score: want.size ? shared / Math.max(want.size, asked.size - 1) : 0 };
  }).filter(s => s.score >= 0.75 && s.shared >= Math.min(2, tokens(s.faq.question).size)).sort((x, y) => y.score - x.score);
  if (!scored.length || (scored[1] && scored[1].score === scored[0].score)) return null;
  return scored[0].faq;
}

// Topic: what the customer's question sounds like, and which section headings answer it.
// Ordered from most to least specific; the first topic with exactly one section wins.
const TOPICS = [
  { ask: /\b(trade.?ins?|swap my|exchange my (old )?(phone|device|laptop))\b|استبدال (جهاز|جوال|هاتف)/i, heading: /trade|استبدال الأجهزة|الاستبدال/i },
  { ask: /\b(returns?|returning|refunds?|exchanges?|send (it )?back)\b|استرجاع|ارجاع|إرجاع|استبدال|استرداد|ترجيع/i, heading: /return|exchange|refund|استرجاع|ارجاع|إرجاع|استبدال/i },
  { ask: /\b(deliver(y|ies|s)?|shipping|ship|courier|pick ?up|collect(ion)?)\b|توصيل|توصلون|يوصل|توصل|شحن|استلام|مندوب/i, heading: /deliver|shipping|pick.?up|collection|توصيل|شحن|استلام/i },
  { ask: /\b(pay(ment|ing)?|card|visa|cash|bank transfer|instal+ments?|apple pay)\b|الدفع|ادفع|دفع|كاش|نقد|بطاقة|فيزا|تحويل|أقساط|اقساط/i, heading: /pay|الدفع/i },
  { ask: /\b(warranty|guarantee)\b|ضمان|كفالة/i, heading: /warranty|guarantee|ضمان|كفالة/i },
  { ask: /\b(insurance|insurer|insured)\b|تأمين|التامين|تامين/i, heading: /insurance|تأمين|التامين/i },
  { ask: /\b(viewings?|view the|visit the|see the (property|villa|apartment|flat|house))\b|معاين|اشوف (الشقة|الفيلا|العقار)/i, heading: /viewing|visit|معاين/i },
  { ask: /\b(site visit|visit (the )?site|come to (my|the) site)\b|زيارة (ال)?موقع/i, heading: /site visit|زيار/i },
  { ask: /\b(documents?|papers?|requirements?|what do i need|paperwork)\b|مستندات|اوراق|أوراق|متطلبات|الأوراق المطلوبة/i, heading: /document|requirement|renting|مستندات|متطلبات|الإيجار|الايجار/i },
  { ask: /\b(foreigners?|non.?omanis?|expats? (can )?(buy|own)|freehold|buying (process|steps)|how (do i|to|can i) buy)\b|تملك|غير العمانيين|للوافدين|خطوات الشراء/i, heading: /buying|buy|الشراء|تملك/i },
  { ask: /\b(list (my|our)|sell my|valuations?|apprais\w*|market my)\b|اعرض عقاري|ابيع (عقاري|بيتي|شقتي|فيلتي)|تقييم/i, heading: /list|valuation|عرض عقارك|تقييم/i },
  { ask: /\b(repairs?|fix(ing)?|broken|cracked|screen replacement)\b|صيانة|تصليح|اصلاح|إصلاح|مكسور/i, heading: /repair|صيانة|إصلاح/i },
  { ask: /\b(quotes?|quotations?|estimates?)\b|عرض سعر|عروض الأسعار|تسعيرة/i, heading: /quote|عروض الأسعار|عرض سعر/i },
  { ask: /\b(how long|timeline|duration|turnaround|when will it be (ready|done))\b|كم (مدة|المدة|يوم|يستغرق)|متى (يخلص|يجهز)/i, heading: /timeline|handover|turnaround|المدة|التسليم/i },
  { ask: /\b(parts?|genuine|original|aftermarket)\b|قطع/i, heading: /parts|قطع/i },
  { ask: /\b(first (visit|appointment)|what (should|do) i bring)\b|أول زيارة|اول زيارة|الزيارة الأولى/i, heading: /first visit|الزيارة الأولى/i },
  { ask: /\b(emergenc(y|ies)|urgent)\b|طوارئ|طارئ|مستعجل/i, heading: /emergenc|طوارئ|طارئ/i },
  { ask: /\b(book(ing)?|appointments?|reserv(e|ation)|schedule)\b|حجز|موعد|احجز/i, heading: /book|appointment|reservation|حجز|موعد/i },
  { ask: /\b(how (do|can) i order|ordering|place an order)\b|طريقة الطلب|كيف اطلب|كيف أطلب/i, heading: /order|الطلب/i },
  { ask: /\b(areas?|cover)\b|مناطق|تغطون|تخدمون/i, key: 'areas' },
  { ask: /\b(about (you|your (company|business|shop|clinic))|since when|how long have you been)\b|من انتم|مين انتم|نبذة عنكم/i, key: 'about' },
];
// Sections Layla may quote. Hours, location and services are already profile facts; the
// handoff section is the owner's instructions to Layla and is never shown to a customer.
const QUOTABLE = new Set(['other', 'about', 'areas']);

/** Turn a section body into WhatsApp text: no markdown markers, links as "label: url". */
export const plainSection = body => String(body || '')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1: $2').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^\s*[-*]\s+/gm, '• ').trim();

/** The one owner section that answers this question, or null. */
export function matchSection(text, sections = []) {
  const quotable = sections.filter(s => QUOTABLE.has(s.key) && s.body?.trim());
  for (const topic of TOPICS) {
    if (!topic.ask.test(text)) continue;
    const found = quotable.filter(s => (topic.key ? s.key === topic.key : s.key === 'other' && topic.heading.test(s.heading)));
    if (found.length === 1) return found[0];
  }
  return null;
}

/**
 * @param {string} text The customer's message.
 * @param {{ faqs?: Array<{question: string, answer: string}>, sections?: Array<{key: string, heading: string, body: string}> }} doc
 * @returns {{ text: string, source: 'faq'|'section' } | null}
 */
export function answerFromDocument(text, { faqs = [], sections = [] } = {}) {
  const faq = matchFaq(text, faqs);
  if (faq) return { text: safeReply(faq.answer, 700), source: 'faq' };
  const section = matchSection(text, sections);
  return section ? { text: safeReply(plainSection(section.body), 700), source: 'section' } : null;
}
