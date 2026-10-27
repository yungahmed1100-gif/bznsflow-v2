// Apex (Ahmed, 2026-10-27): custom enterprise solutions, by request with a custom quote. A company names the
// agent functions it needs; Ahmed scopes and quotes. One definition for Convex, the API and the request page.

export const APEX_RECIPIENT = 'ahmed@bznsflowai.com';
export const APEX_FUNCTIONS = Object.freeze(['erp', 'branches', 'workflows', 'channels', 'other']);
export const APEX_SIZES = Object.freeze(['1', '2-5', '6-20', '21+']);
export const APEX_SYSTEMS = Object.freeze(['odoo', 'other_erp', 'none']);
export const APEX_STATUSES = Object.freeze(['new', 'contacted', 'scoped', 'closed']);
export const APEX_NEED_MAX = 2000;
export const APEX_PER_EMAIL_PER_DAY = 3;

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>.]+(\.[^\s@<>.]+)+$/;
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '';
const line = (value, max) => clean(value, max).replace(/\s+/g, ' ');
const one = (value, allowed) => allowed.includes(value) ? value : undefined;

/**
 * The company's request, trimmed and bounded. Company, name, a valid email, at least one function and the
 * need are required; optional fields that don't fit are dropped rather than refused.
 */
export function normalizeApexRequest(input = {}) {
  const company = line(input.company, 120), name = line(input.name, 80), email = line(input.email, 254).toLowerCase();
  const need = clean(input.need, APEX_NEED_MAX).replace(/\n{3,}/g, '\n\n');
  const functions = [...new Set(Array.isArray(input.functions) ? input.functions : [])].filter(f => APEX_FUNCTIONS.includes(f));
  if (!company) return { ok: false, reason: 'invalid_company' };
  if (!name) return { ok: false, reason: 'invalid_name' };
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'invalid_email' };
  if (!functions.length) return { ok: false, reason: 'invalid_functions' };
  if (need.length < 10) return { ok: false, reason: 'invalid_need' };
  const digits = String(input.phone ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const request = {
    company, name, email, functions, need, lang: input.lang === 'ar' ? 'ar' : 'en',
    ...(digits.length >= 7 && digits.length <= 15 ? { phone: `+${digits}` } : {}),
    ...(one(input.branches, APEX_SIZES) ? { branches: input.branches } : {}),
    ...(one(input.staff, APEX_SIZES) ? { staff: input.staff } : {}),
    ...(one(input.system, APEX_SYSTEMS) ? { system: input.system } : {}),
    ...(line(input.systemNote, 200) ? { systemNote: line(input.systemNote, 200) } : {}),
  };
  return { ok: true, request };
}
