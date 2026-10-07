// bzns.md: the one document an owner writes about how their business works.
//
// Shared by the browser editor, the API and Convex, so it must stay free of Node
// and browser APIs. Products, prices and stock never live here — they come from
// Hasib or Services & Prices — so money amounts are refused at validation.
import { BUSINESS_INDUSTRIES } from './industries.js';
import { toneOf } from '../../config/layla-tones.js';

export const BZNS_MAX_CHARS = 10000;
const MAX_SECTIONS = 40;
const PROFILE_FIELD_MAX = 350;
const FAQ_PROFILE_MAX = 12;

export const normalizeText = text => String(text || '').normalize('NFKC').toLowerCase()
  .replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();

// Heading aliases in both languages. A section is recognised when its heading starts with one.
const ALIASES = {
  about: ['about us', 'about', 'who we are', 'من نحن', 'عن الشركة', 'نبذة', 'عنا'],
  offer: ['what we offer', 'our services', 'services', 'products and services', 'what we sell', 'ما نقدمه', 'خدماتنا', 'الخدمات', 'منتجاتنا', 'المنتجات والخدمات'],
  areas: ['areas we cover', 'areas', 'service area', 'delivery areas', 'المناطق', 'مناطق التغطية', 'مناطق التوصيل'],
  hours: ['hours', 'working hours', 'opening hours', 'business hours', 'ساعات العمل', 'أوقات العمل', 'مواعيد العمل', 'ساعات الدوام'],
  location: ['location', 'address', 'where to find us', 'branches', 'الموقع', 'العنوان', 'الفروع', 'موقعنا'],
  handoff: ['when layla should hand over', 'hand over', 'handoff', 'human handoff', 'متى تحوّل ليلى', 'تحويل المحادثة', 'التحويل للفريق'],
  faq: ['faq', 'faqs', 'frequently asked questions', 'common questions', 'الأسئلة الشائعة', 'أسئلة متكررة'],
};
const ALIAS_LIST = Object.entries(ALIASES).flatMap(([key, names]) => names.map(name => [key, normalizeText(name)]))
  .sort((a, b) => b[1].length - a[1].length);
// Layla answers 24/7, so business hours are optional facts, not a recommended section.
export const RECOMMENDED_SECTIONS = Object.freeze(['about', 'offer', 'location', 'handoff', 'faq']);

const sectionKey = heading => {
  const h = normalizeText(heading);
  return ALIAS_LIST.find(([, alias]) => h === alias || h.startsWith(`${alias} `))?.[0] || 'other';
};

function parseMeta(lines) {
  const meta = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z؀-ۿ_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = { 'الاسم': 'name', 'القطاع': 'sector', 'اللغات': 'languages', 'الأسلوب': 'tone' }[m[1]] || m[1].toLowerCase();
    if (['name', 'sector', 'languages', 'handoff', 'tone'].includes(key)) meta[key] = m[2].trim();
  }
  return meta;
}

const FAQ_Q = /^\s*(?:\*\*)?\s*(?:Q|س)\s*[:：]\s*(?:\*\*)?\s*(.+)$/i;
const FAQ_A = /^\s*(?:\*\*)?\s*(?:A|ج)\s*[:：]\s*(?:\*\*)?\s*(.+)$/i;
function parseFaqs(body) {
  const faqs = [];
  let current = null;
  for (const line of body.split('\n')) {
    const q = line.match(FAQ_Q), a = line.match(FAQ_A);
    if (q) { current = { question: q[1].replace(/\*\*/g, '').trim(), answer: '' }; faqs.push(current); }
    else if (a && current) current.answer = a[1].replace(/\*\*/g, '').trim();
    else if (current?.answer && line.trim()) current.answer += ` ${line.trim()}`;
  }
  return faqs.filter(f => f.question && f.answer);
}

/** Splits a document into front matter, a title and `##` sections. */
export function parseBzns(markdown) {
  const source = String(markdown || '').replace(/\r\n?/g, '\n');
  let body = source, meta = {};
  const front = source.match(/^\s*---\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (front) { meta = parseMeta(front[1].split('\n')); body = source.slice(front[0].length); }
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  if (!meta.name && title && !/\[[^\]]*\]/.test(title)) meta.name = title;
  const sections = [];
  let current = null;
  const intro = [];
  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) { current = { heading: heading[1].trim(), key: sectionKey(heading[1]), lines: [] }; sections.push(current); }
    else if (current) current.lines.push(line);
    else if (!/^#\s/.test(line)) intro.push(line);
  }
  const rows = sections.map(({ lines, ...s }) => ({ ...s, body: lines.join('\n').trim() }));
  const introText = intro.join('\n').trim();
  if (introText) rows.unshift({ heading: title || meta.name || 'Introduction', key: 'about', body: introText });
  const faqs = rows.filter(s => s.key === 'faq').flatMap(s => parseFaqs(s.body));
  return { meta, title, sections: rows, faqs, length: source.length };
}

const CURRENCY = '(?:OMR|R\\.?O\\.?|AED|SAR|QAR|KWD|BHD|USD|EUR|GBP|ريال|ر\\.?\\s?ع\\.?|درهم|دولار|دينار|بيسة|[$€£])';
const NUMBER = '[\\d\\u0660-\\u0669][\\d\\u0660-\\u0669,.\\s]*';
const MONEY = new RegExp(`(?:${NUMBER}\\s*${CURRENCY}(?![A-Za-z]))|(?:(?<![A-Za-z])${CURRENCY}\\s*[\\d\\u0660-\\u0669])`, 'i');
const PERCENT = /[\d٠-٩]+(?:[.,][\d٠-٩]+)?\s*[%٪]/;
const FEE_WORDS = /\b(?:commission|fees?|deposit|charges?|cost)\b|عمولة|رسوم|عربون|تأمين|دفعة/i;
const hasMoney = text => text.split('\n').some(line => MONEY.test(line) || (PERCENT.test(line) && FEE_WORDS.test(line)));
const PLACEHOLDER = /\[[^\]\n]{1,200}\](?!\()/;
const HTML = /<\/?[a-z][^>]*>/i;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

/**
 * Checks a document before it can be published. Every error names the section to fix
 * (an empty section means the whole document or its front matter).
 */
export function validateBzns(markdown) {
  const text = String(markdown || '');
  const parsed = parseBzns(text);
  const errors = [];
  if (text.length > BZNS_MAX_CHARS) errors.push({ code: 'bzns_too_long', section: '' });
  if (CONTROL.test(text)) errors.push({ code: 'bzns_invalid_characters', section: '' });
  if (!parsed.meta.name) errors.push({ code: 'bzns_name_required', section: '' });
  else if (parsed.meta.name.length > 100) errors.push({ code: 'bzns_name_too_long', section: '' });
  if (!parsed.meta.sector) errors.push({ code: 'bzns_sector_required', section: '' });
  if (!parsed.sections.some(s => s.key === 'offer' && s.body)) errors.push({ code: 'bzns_offer_required', section: 'offer' });
  if (parsed.sections.length > MAX_SECTIONS) errors.push({ code: 'bzns_too_many_sections', section: '' });
  if (PLACEHOLDER.test(`${parsed.meta.name || ''} ${parsed.meta.sector || ''}`)) errors.push({ code: 'bzns_placeholder', section: 'meta' });
  for (const s of parsed.sections) {
    const all = `${s.heading}\n${s.body}`;
    if (PLACEHOLDER.test(all)) errors.push({ code: 'bzns_placeholder', section: s.key, heading: s.heading });
    if (HTML.test(all)) errors.push({ code: 'bzns_html', section: s.key, heading: s.heading });
    if (hasMoney(all)) errors.push({ code: 'bzns_money', section: s.key, heading: s.heading });
  }
  // A section counts as written only once its template hints are replaced.
  const checklist = RECOMMENDED_SECTIONS.map(key => ({ key, present: parsed.sections.some(s => s.key === key && s.body && !PLACEHOLDER.test(s.body)) }));
  return { ok: errors.length === 0, errors, checklist, parsed };
}

// Markdown to plain sentences for the short profile fields used by the existing reply rules.
const plain = body => body.split('\n').map(line => line.trim()
  .replace(/^#{1,6}\s+/, '').replace(/^(?:[-*•]|\d+[.)])\s+/, '')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/\*\*|__|`/g, '').trim()).filter(Boolean);
function summary(body) {
  const joined = plain(body).join('; ');
  if (joined.length <= PROFILE_FIELD_MAX) return joined;
  const cut = joined.slice(0, PROFILE_FIELD_MAX - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), PROFILE_FIELD_MAX - 40))}…`;
}
const firstBody = (parsed, key) => parsed.sections.find(s => s.key === key && s.body)?.body || '';

/** The short profile the existing rule-based replies, readiness checks and validators expect. */
export function deriveProfile(parsed, { reviewed = true } = {}) {
  const ar = isArabic(parsed.sections.map(s => s.body).join(' '));
  const industry = BUSINESS_INDUSTRIES.find(row => row.id === parsed.meta.sector);
  return {
    businessName: String(parsed.meta.name || '').trim().slice(0, 100),
    profile: {
      sector: (industry ? (ar ? industry.ar : industry.en) : String(parsed.meta.sector || '')).slice(0, PROFILE_FIELD_MAX),
      services: summary(firstBody(parsed, 'offer')),
      prices: '',
      hours: summary(firstBody(parsed, 'hours')),
      location: summary(firstBody(parsed, 'location')),
      humanContact: '',
      handoffMode: 'inbox',
      tone: toneOf(parsed.meta.tone),
      faqs: parsed.faqs.slice(0, FAQ_PROFILE_MAX).map(f => ({ question: f.question.slice(0, 200), answer: f.answer.slice(0, 700) })),
      reviewed,
    },
  };
}

const isArabic = text => (String(text).match(/[؀-ۿ]/g) || []).length > (String(text).match(/[A-Za-z]/g) || []).length;
// cyrb53: a small stable content hash; identity only, not security.
function contentHash(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const ch = text.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** One retrieval row per section for blueKnowledgeChunks, scoped to one tenant and revision. */
export function bznsChunks(parsed, { tenantId, revision, now }) {
  const name = parsed.meta.name || 'Business';
  return parsed.sections.filter(s => s.body).map(s => {
    const text = `# ${name} > ${s.heading}\n\n${s.body}`.slice(0, 12000);
    return { tenantId, revision, locale: isArabic(s.body) ? 'ar' : 'en', text, searchText: normalizeText(`${s.heading} ${s.body}`),
      source: 'bzns', docType: s.key, sectionPath: s.heading.slice(0, 200), approved: true, contentHash: contentHash(text), updatedAt: now };
  });
}

const HEADINGS = {
  offer: { en: 'What we offer', ar: 'خدماتنا' },
  hours: { en: 'Hours', ar: 'ساعات العمل' },
  location: { en: 'Location', ar: 'الموقع' },
  faq: { en: 'FAQ', ar: 'الأسئلة الشائعة' },
};
const FIELD_SECTION = { services: 'offer', hours: 'hours', location: 'location' };
const faqLines = (faqs, ar) => faqs.map(f => `${ar ? 'س' : 'Q'}: ${f.question}\n${ar ? 'ج' : 'A'}: ${f.answer}`).join('\n\n');

function splitBlocks(markdown) {
  const preamble = [], sections = [];
  for (const line of String(markdown || '').replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) sections.push({ heading: line, key: sectionKey(heading[1]), lines: [] });
    else (sections.at(-1)?.lines || preamble).push(line);
  }
  return { preamble, sections };
}
const joinBlocks = ({ preamble, sections }) => [preamble.join('\n').trimEnd(), ...sections.map(s => `${s.heading}\n${s.lines.join('\n').trim()}`)]
  .filter(Boolean).join('\n\n') + '\n';

/**
 * Writes guided-setup answers into the matching sections, replacing their text or adding
 * the section. Prices are ignored on purpose: they belong in Hasib or Services & Prices.
 */
export function applySections(markdown, patch, lang = 'en') {
  const ar = lang === 'ar', blocks = splitBlocks(markdown);
  const sections = blocks.sections.map(s => ({ ...s, lines: [...s.lines] }));
  const upsert = (key, body) => {
    const found = sections.find(s => s.key === key);
    if (found) found.lines = [body];
    else sections.push({ heading: `## ${HEADINGS[key][ar ? 'ar' : 'en']}`, key, lines: [body] });
  };
  for (const [field, key] of Object.entries(FIELD_SECTION)) {
    const text = String(patch?.[field] || '').trim();
    if (text) upsert(key, text);
  }
  const known = new Set(parseBzns(markdown).faqs.map(f => normalizeText(f.question)));
  const fresh = (patch?.faqs || []).filter(f => f?.question?.trim() && f?.answer?.trim() && !known.has(normalizeText(f.question)));
  if (fresh.length) {
    const faq = sections.find(s => s.key === 'faq');
    const lines = faqLines(fresh, ar);
    if (faq) faq.lines = [faq.lines.join('\n').trim(), lines].filter(Boolean);
    else sections.push({ heading: `## ${HEADINGS.faq[ar ? 'ar' : 'en']}`, key: 'faq', lines: [lines] });
  }
  return joinBlocks({ preamble: blocks.preamble, sections });
}

/**
 * Starts a bzns.md for an existing customer from their saved profile and published Q&A.
 * Price text is left out and the owner is pointed to Services & Prices instead.
 */
export function profileToBzns({ businessName = '', profile = {}, answers = [], lang = 'en' }) {
  const ar = lang === 'ar';
  const industry = BUSINESS_INDUSTRIES.find(row => [row.id, row.en, row.ar].includes(profile.sector));
  const seen = new Set();
  const faqs = [...(profile.faqs || []), ...answers].filter(f => {
    const key = normalizeText(f?.question);
    if (!key || !f.answer?.trim() || seen.has(key) || hasMoney(`${f.question}\n${f.answer}`)) return false;
    seen.add(key); return true;
  });
  const sections = [
    ['offer', profile.services], ['hours', profile.hours], ['location', profile.location],
  ].filter(([, text]) => String(text || '').trim()).map(([key, text]) => `## ${HEADINGS[key][ar ? 'ar' : 'en']}\n${String(text).trim()}`);
  if (faqs.length) sections.push(`## ${HEADINGS.faq[ar ? 'ar' : 'en']}\n${faqLines(faqs, ar)}`);
  return [`---\nname: ${businessName}\nsector: ${industry?.id || profile.sector || ''}\n---`, `# ${businessName}`, ...sections].join('\n\n') + '\n';
}

/**
 * Sets one front-matter line (e.g. `tone: sweet`), replacing it if present and adding
 * the front matter if the document has none. The rest of the document is untouched.
 * @param {string} markdown @param {string} key @param {string} value
 */
export function setMeta(markdown, key, value) {
  const source = String(markdown || '').replace(/\r\n?/g, '\n');
  const front = source.match(/^(\s*---\n)([\s\S]*?)(\n---\s*(?:\n|$))/);
  if (!front) return `---\n${key}: ${value}\n---\n\n${source.replace(/^\n+/, '')}`;
  const lines = front[2].split('\n');
  const at = lines.findIndex(line => new RegExp(`^\\s*${key}\\s*:`).test(line));
  if (at >= 0) lines[at] = `${key}: ${value}`; else lines.push(`${key}: ${value}`);
  return `${front[1]}${lines.join('\n')}${front[3]}${source.slice(front[0].length)}`;
}
