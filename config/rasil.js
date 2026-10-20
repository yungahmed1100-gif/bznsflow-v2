// Rasil: email campaigns an Ascend owner approves, sent from the owner's own domain
// (Ahmed, 2026-10-20). Fixed rules live here so Convex, the Vercel API and the browser
// agree on limits, valid input and what an email looks like. No AI decides any of it.

const DAY = 86400000;

// Included in Ascend: 2,000 emails a month per account. A new domain warms up over three
// weeks (50, 150, 400 a day) before it may send its whole allowance in a day.
export const RASIL_MONTHLY_CAP = 2000;
export const WARMUP_DAILY = Object.freeze([50, 150, 400]);
export const RASIL_PER_MINUTE = 60;
export const MAX_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = Object.freeze([60000, 300000, 900000]);
export const SUBJECT_MAX = 150;
export const BODY_MAX = 20000;
export const NAME_MAX = 80;
export const IMPORT_MAX = 500;

export const monthKey = now => new Date(now).toISOString().slice(0, 7);
export const dayKey = now => new Date(now).toISOString().slice(0, 10);
export const nextDayStart = now => (Math.floor(now / DAY) + 1) * DAY;

/** Emails a domain may send today: the warm-up step for its week, then the whole monthly allowance. */
export function dailyLimit(warmupStartedAt, now) {
  if (!Number.isFinite(warmupStartedAt)) return 0;
  const week = Math.floor(Math.max(0, now - warmupStartedAt) / (7 * DAY));
  return week < WARMUP_DAILY.length ? WARMUP_DAILY[week] : RASIL_MONTHLY_CAP;
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
export function validEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[a-z0-9._%+-]{1,64}@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(email);
}

// The sending domain is the owner's. BznsFlow's own domain is never lent to a customer.
const RESERVED = /(^|\.)(bznsflowai\.com|bznsflow\.com|resend\.dev|vercel\.app|gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com)$/;
export function normalizeDomain(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') : '';
}
export function validDomain(value) {
  const domain = normalizeDomain(value);
  return domain.length <= 253 && /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(domain) && !RESERVED.test(domain);
}
export const validLocalPart = value => typeof value === 'string' && /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(value);
export const validSenderName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= NAME_MAX && !/[<>"\r\n]/.test(value);

/** DMARC is not one of Resend's records, but Gmail and Yahoo expect it from bulk senders. */
export const DMARC_RECORD = Object.freeze({ type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none;', status: 'recommended' });

/** A campaign's subject and body, trimmed; plain text only. `{{name}}` is the one personal field. */
export function campaignContent({ subject, body } = {}) {
  const s = typeof subject === 'string' ? subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const b = typeof body === 'string' ? body.replace(/\r\n?/g, '\n').trim() : '';
  if (!s || s.length > SUBJECT_MAX) return { ok: false, reason: 'invalid_subject' };
  if (!b || b.length > BODY_MAX) return { ok: false, reason: 'invalid_body' };
  return { ok: true, subject: s, body: b };
}

const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g;
const linkify = escaped => escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, url => `<a href="${url}" style="color:#2f6ea3">${url}</a>`);
const FALLBACK_NAME = { en: 'there', ar: 'عزيزي العميل' };
const FOOTER = {
  en: (business, address) => `You receive this because you subscribed to emails from ${business}.${address ? ` ${address}.` : ''}`,
  ar: (business, address) => `وصلتك هذه الرسالة لأنك اشتركت في رسائل ${business}.${address ? ` ${address}.` : ''}`,
};
const UNSUBSCRIBE = { en: 'Unsubscribe', ar: 'إلغاء الاشتراك' };

/**
 * The email as sent: subject, HTML and plain text. Owner text is escaped and never treated as HTML;
 * every email ends with who sent it, why, and a working unsubscribe link.
 * @param {{ subject: string, body: string, name?: string, business: string, address?: string, unsubscribeUrl: string, lang?: string }} input
 */
export function renderEmail({ subject, body, name, business, address = '', unsubscribeUrl, lang = 'en' }) {
  const l = lang === 'ar' ? 'ar' : 'en';
  const who = String(name || '').trim().slice(0, NAME_MAX) || FALLBACK_NAME[l];
  const personal = text => text.replace(/\{\{\s*name\s*\}\}/g, who);
  const text = personal(body);
  const footer = FOOTER[l](business, String(address || '').trim());
  const paragraphs = text.split(/\n{2,}/).map(p => `<p style="margin:0 0 16px">${linkify(escape(p)).replace(/\n/g, '<br>')}</p>`).join('');
  const dir = l === 'ar' ? 'rtl' : 'ltr';
  const html = `<!doctype html><html lang="${l}" dir="${dir}"><body style="margin:0;padding:24px;background:#f6efdf">`
    + `<div style="max-width:600px;margin:0 auto;background:#ffffff;padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;text-align:${l === 'ar' ? 'right' : 'left'}">`
    + paragraphs
    + `<hr style="border:0;border-top:1px solid #e5ddca;margin:24px 0 12px"><p style="margin:0;font-size:12px;color:#6b665b">${escape(footer)} `
    + `<a href="${escape(unsubscribeUrl)}" style="color:#6b665b">${UNSUBSCRIBE[l]}</a></p></div></body></html>`;
  return { subject: personal(subject), html, text: `${text}\n\n--\n${footer}\n${UNSUBSCRIBE[l]}: ${unsubscribeUrl}` };
}

/** Links an owner wrote, so the preview can list them. */
export const bodyLinks = body => [...new Set(String(body || '').match(URL_RE) || [])];
