// The free business audit (Ahmed, 2026-10-24): 30 minutes, Sunday to Thursday 10:00–17:00 Muscat, booked
// at least 12 hours ahead and up to 3 weeks out. One definition for Convex, the API and the booking page.
import { INDUSTRY_IDS } from '../src/lib/industries.js';

export const AUDIT_SLOT_MIN = 30;
export const AUDIT_OPEN = 10, AUDIT_CLOSE = 17; // Muscat hours; the last slot starts at 16:30
export const AUDIT_LEAD_H = 12;
export const AUDIT_HORIZON_DAYS = 21;
export const AUDIT_RECIPIENT = 'ahmed@bznsflowai.com';
export const AUDIT_STATUSES = ['booked', 'done', 'cancelled'];

const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const MUSCAT = 4 * HOUR; // Asia/Muscat is UTC+4 all year.
const SLOT = AUDIT_SLOT_MIN * MIN;
const working = localMidnight => new Date(localMidnight).getUTCDay() <= 4; // Sunday to Thursday
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>.]+(\.[^\s@<>.]+)+$/;
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Every slot start (UTC ms) inside the booking window that is not in `taken`. */
export function auditSlots(now, taken = []) {
  const busy = new Set(taken);
  const earliest = now + AUDIT_LEAD_H * HOUR, latest = now + AUDIT_HORIZON_DAYS * DAY;
  const local = now + MUSCAT;
  const slots = [];
  for (let day = local - (local % DAY); day - MUSCAT <= latest; day += DAY) {
    if (!working(day)) continue;
    for (let at = day + AUDIT_OPEN * HOUR; at < day + AUDIT_CLOSE * HOUR; at += SLOT) {
      const start = at - MUSCAT;
      if (start >= earliest && start <= latest && !busy.has(start)) slots.push(start);
    }
  }
  return slots;
}

/** A start the booking page could have offered at `now`, ignoring who else booked it. */
export const validAuditSlot = (start, now) => Number.isSafeInteger(start) && auditSlots(now).includes(start);

/**
 * The visitor's details, trimmed and bounded. Returns `{ ok: false, reason }` for a missing name or a
 * bad email; optional fields that don't fit are dropped rather than refused.
 */
export function normalizeAuditBooking(input = {}) {
  const name = clean(input.name, 80), email = clean(input.email, 254).toLowerCase();
  if (!name) return { ok: false, reason: 'invalid_name' };
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'invalid_email' };
  const digits = String(input.phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const industry = clean(input.industry, 40);
  const booking = {
    name, email, lang: input.lang === 'ar' ? 'ar' : 'en',
    ...(digits.length >= 4 && digits.length <= 15 ? { phone: `+${digits}` } : {}),
    ...(clean(input.business, 80) ? { business: clean(input.business, 80) } : {}),
    ...(INDUSTRY_IDS.has(industry) ? { industry } : {}),
    ...(clean(input.note, 500) ? { note: clean(input.note, 500) } : {}),
  };
  return { ok: true, booking };
}
