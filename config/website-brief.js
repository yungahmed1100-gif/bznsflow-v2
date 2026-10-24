// The website brief an Ascend owner sends for the free lead-capture website (Ahmed, 2026-10-18).
// One definition for every reader: Convex validates and stores with it, the API emails it to Ahmed with
// its labels, and the dashboard form is built from it. Nothing here is free-form beyond its stated limit.

export const BRIEF_RECIPIENT = 'ahmed@bznsflowai.com';
export const BRIEF_MAX_PHOTOS = 5;
export const BRIEF_STYLES = Object.freeze(['modern', 'classic', 'playful', 'minimal', 'luxury']);
export const BRIEF_PAGES = Object.freeze(['home', 'about', 'services', 'gallery', 'contact', 'faq']);
export const BRIEF_LANGUAGES = Object.freeze(['ar', 'en', 'both']);
export const BRIEF_DOMAIN = Object.freeze(['have', 'need']);

// key → [max length, kind]. `url` must be http(s); `email` must look like one.
export const BRIEF_TEXT = Object.freeze({
  nameEn: [120, 'text'], nameAr: [120, 'text'], about: [1500, 'text'], services: [2000, 'text'],
  phone: [40, 'text'], email: [254, 'email'], address: [300, 'text'], mapUrl: [500, 'url'], hours: [300, 'text'],
  instagram: [300, 'text'], facebook: [300, 'text'], tiktok: [300, 'text'], otherSocial: [300, 'text'],
  domain: [253, 'text'], fontNotes: [300, 'text'], notes: [2000, 'text'],
  domainChoice: [80, 'domain'], mailboxLocal: [64, 'local'], recoveryEmail: [254, 'email'],
});

// Email labels, in the order Ahmed reads them.
export const BRIEF_LABELS = Object.freeze([
  ['nameEn', 'Business name (English)'], ['nameAr', 'Business name (Arabic)'], ['about', 'What the business does'],
  ['services', 'Services or products to feature'], ['phone', 'Phone / WhatsApp'], ['email', 'Email'], ['address', 'Address'],
  ['mapUrl', 'Map link'], ['hours', 'Opening hours'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
  ['otherSocial', 'Other social'], ['domainChoice', 'Domain to register'], ['domainAlternates', 'If taken, these instead'],
  ['mailboxLocal', 'Mailbox name'], ['recoveryEmail', 'Recovery email'], ['domainStatus', 'Domain'], ['domain', 'Domain name'], ['languages', 'Website languages'],
  ['style', 'Style'], ['colors', 'Brand colours'], ['fontNotes', 'Fonts'], ['references', 'Reference websites'],
  ['pages', 'Pages'], ['designLogo', 'Needs a simple logo designed'], ['notes', 'Anything else'],
]);

const URL_RE = /^https?:\/\/[^\s<>"']+$/i;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const clean = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

/**
 * Validate and normalise a submitted brief.
 * @returns {{ ok: true, value: object } | { ok: false, reason: string, field: string }}
 */
export function normalizeBrief(input) {
  const bad = (field, reason = 'invalid_brief') => ({ ok: false, reason, field });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return bad('brief');
  const value = {};
  for (const [key, [max, kind]] of Object.entries(BRIEF_TEXT)) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (typeof raw !== 'string') return bad(key);
    const text = clean(raw);
    if (text.length > max) return bad(key, 'brief_too_long');
    if (!text) continue;
    if (kind === 'url' && !URL_RE.test(text)) return bad(key);
    if (kind === 'email' && !EMAIL_RE.test(text)) return bad(key);
    if (kind === 'domain' && !websiteDomain(text)) return bad(key);
    if (kind === 'local' && !LOCAL_RE.test(text.toLowerCase())) return bad(key);
    value[key] = kind === 'domain' || kind === 'local' ? text.toLowerCase() : text;
  }
  const pick = (key, allowed) => {
    if (input[key] === undefined || input[key] === '') return true;
    if (!allowed.includes(input[key])) return false;
    value[key] = input[key];
    return true;
  };
  if (!pick('domainStatus', BRIEF_DOMAIN)) return bad('domainStatus');
  if (!pick('languages', BRIEF_LANGUAGES)) return bad('languages');
  if (!pick('style', BRIEF_STYLES)) return bad('style');
  const list = (key, max, ok) => {
    const raw = input[key] ?? [];
    if (!Array.isArray(raw) || raw.length > max) return false;
    const items = [...new Set(raw.map(x => (typeof x === 'string' ? clean(x) : '')).filter(Boolean))];
    if (!items.every(ok)) return false;
    if (items.length) value[key] = items;
    return true;
  };
  if (!list('colors', 3, x => HEX_RE.test(x))) return bad('colors');
  if (!list('references', 3, x => x.length <= 300 && URL_RE.test(x))) return bad('references');
  if (!list('pages', BRIEF_PAGES.length, x => BRIEF_PAGES.includes(x))) return bad('pages');
  if (!list('domainAlternates', 2, websiteDomain)) return bad('domainAlternates');
  if (value.domainAlternates) value.domainAlternates = value.domainAlternates.map(d => d.toLowerCase()).filter(d => d !== value.domainChoice);
  if (value.domainAlternates && !value.domainAlternates.length) delete value.domainAlternates;
  if (input.designLogo !== undefined && typeof input.designLogo !== 'boolean') return bad('designLogo');
  if (input.designLogo) value.designLogo = true;
  // What Ahmed cannot build without.
  if (!value.nameEn && !value.nameAr) return bad('nameEn', 'brief_required');
  if (!value.phone) return bad('phone', 'brief_required');
  if (!value.languages) return bad('languages', 'brief_required');
  if (!value.domainChoice) return bad('domainChoice', 'brief_required');
  if (!value.mailboxLocal) return bad('mailboxLocal', 'brief_required');
  return { ok: true, value };
}

// ── The domain and mailbox BznsFlow registers for the website (Ahmed, 2026-10-23) ──────────────

/** Endings we register through Vercel Domains. Not .om, which needs an Omani registrar and papers. */
export const WEBSITE_TLDS = Object.freeze(['com', 'net', 'co']);
/** Above this yearly price (USD) a name is not offered; premium names never are. */
export const WEBSITE_DOMAIN_MAX_USD = 20;
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const DOMAIN_RE = new RegExp(`^${LABEL}\\.(${WEBSITE_TLDS.join('|')})$`);
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const RESERVED = /^(bznsflow|bznsflowai)\./;
export const websiteDomain = value => typeof value === 'string' && DOMAIN_RE.test(value.trim().toLowerCase()) && !RESERVED.test(value.trim().toLowerCase());

/**
 * The names to look up for what the owner typed: "Nour Abayas", "nourabayas.net" or "https://www.nour.co/x"
 * becomes nour-abayas.com, .net, .co, with an ending they typed first. Nothing for text without Latin letters.
 */
export function domainCandidates(input) {
  const raw = String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');
  const [name, tld] = raw.includes('.') ? [raw.slice(0, raw.lastIndexOf('.')), raw.slice(raw.lastIndexOf('.') + 1)] : [raw, ''];
  const label = name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63).replace(/-+$/, '');
  if (!label) return [];
  const order = WEBSITE_TLDS.includes(tld) ? [tld, ...WEBSITE_TLDS.filter(t => t !== tld)] : WEBSITE_TLDS;
  return order.map(t => `${label}.${t}`).filter(websiteDomain);
}

// ── Delivery: the website is promised within three business days of the brief ────────────────

export const WEBSITE_STAGES = Object.freeze(['received', 'domain', 'mailbox', 'building', 'live']);
export const WEBSITE_DELIVERY_DAYS = 3;
const HOUR = 3600000, DAY = 24 * HOUR;
const MUSCAT = 4 * HOUR; // Asia/Muscat is UTC+4 all year.
const DUE_HOUR = 17;
const working = localMidnight => new Date(localMidnight).getUTCDay() <= 4; // Sunday to Thursday

/**
 * 17:00 Muscat on the nth working day after the day the brief arrives. Oman works Sunday to Thursday, so
 * a brief sent on Sunday is due Wednesday and one sent from Thursday to Saturday is due Tuesday. Public
 * holidays are not modelled: Ahmed moves the date with a reason the owner sees.
 */
export function addBusinessDays(at, days = WEBSITE_DELIVERY_DAYS) {
  const local = at + MUSCAT;
  let day = local - (local % DAY);
  for (let count = 0; count < days; count++) do day += DAY; while (!working(day));
  return day + DUE_HOUR * HOUR - MUSCAT;
}
