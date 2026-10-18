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
});

// Email labels, in the order Ahmed reads them.
export const BRIEF_LABELS = Object.freeze([
  ['nameEn', 'Business name (English)'], ['nameAr', 'Business name (Arabic)'], ['about', 'What the business does'],
  ['services', 'Services or products to feature'], ['phone', 'Phone / WhatsApp'], ['email', 'Email'], ['address', 'Address'],
  ['mapUrl', 'Map link'], ['hours', 'Opening hours'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
  ['otherSocial', 'Other social'], ['domainStatus', 'Domain'], ['domain', 'Domain name'], ['languages', 'Website languages'],
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
    value[key] = text;
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
  if (input.designLogo !== undefined && typeof input.designLogo !== 'boolean') return bad('designLogo');
  if (input.designLogo) value.designLogo = true;
  // What Ahmed cannot build without.
  if (!value.nameEn && !value.nameAr) return bad('nameEn', 'brief_required');
  if (!value.phone) return bad('phone', 'brief_required');
  if (!value.languages) return bad('languages', 'brief_required');
  return { ok: true, value };
}
