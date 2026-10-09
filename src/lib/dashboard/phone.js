// WhatsApp number rules shared by the dashboard importer, manual entry and the
// server. A wa_id is the E.164 number without "+": 8–15 digits, country code first.
import { COUNTRIES, COUNTRY_CODES, dialFor } from '../countries.js';

const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b[1].length - a[1].length);
const toLatinDigits = value => String(value ?? '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/** Longest dial-code match; +1 resolves to US/CA, which share the same code. */
export function countryForWaId(waId) {
  const found = BY_DIAL_LENGTH.find(([, dial]) => String(waId).startsWith(dial));
  return found ? (found[1] === '1' ? 'US' : found[0]) : '';
}
// Longest national number (without trunk 0) per country; anything longer already carries a country code.
const NATIONAL_MAX = { OM: 8, BH: 8, QA: 8, KW: 8, SA: 9, AE: 9, JO: 9, LB: 8, EG: 10, IQ: 10, YE: 9, SY: 9, MA: 9, DZ: 9, TN: 8, SD: 9, LY: 10, IN: 10, PK: 10, BD: 10, PH: 10, GB: 10, US: 10, CA: 10, DE: 11, AT: 13 };
export const isValidWaId = waId => /^[1-9]\d{7,14}$/.test(waId || '');

/**
 * Normalize user input to a wa_id.
 * International forms ("+968…", "00968…") win; otherwise the country supplies
 * the dial code and a national trunk "0" is dropped.
 * @returns {{ waId: string, countryIso: string } | { error: string }}
 */
export function normalizePhone(input, countryIso = '') {
  const raw = toLatinDigits(input).trim();
  if (!raw || raw.length > 32 || /[^\d\s+().-]/.test(raw)) return { error: 'invalid_phone' };
  const digits = raw.replace(/\D/g, '');
  let waId;
  if (raw.startsWith('+')) waId = digits;
  else if (digits.startsWith('00')) waId = digits.slice(2);
  else {
    const iso = COUNTRY_CODES.has(countryIso) ? countryIso : '';
    const dial = iso ? dialFor(iso) : '';
    if (!dial) return { error: 'missing_country' };
    const national = digits.replace(/^0+/, '');
    // A pasted "968 9123 4567" already carries the code; keep it once.
    if (national.startsWith(dial) && national.length - dial.length >= 7) waId = national;
    // Longer than any local number here: it is a full international number written
    // without "+" (e.g. 966502886202 in a list whose fallback country is Oman).
    else if (national.length > (NATIONAL_MAX[iso] || 10) && countryForWaId(national) && isValidWaId(national)) waId = national;
    else waId = `${dial}${national}`;
  }
  if (!isValidWaId(waId)) return { error: 'invalid_phone' };
  const detected = countryForWaId(waId);
  if (!detected) return { error: 'invalid_phone' };
  const dial = dialFor(detected) || '1';
  if (waId.length - dial.length < 6) return { error: 'invalid_phone' };
  return { waId, countryIso: COUNTRY_CODES.has(countryIso) && waId.startsWith(dialFor(countryIso)) ? countryIso : detected };
}

// Mobile number plans (wa_id form) for the markets we serve. WhatsApp accounts sit on mobile
// numbers; a landline or toll-free number here cannot receive a broadcast. Other countries
// are not checked (null), so nothing valid is ever thrown away for lack of a rule.
const MOBILE = {
  SA: /^9665\d{8}$/, AE: /^9715\d{8}$/, OM: /^968[79]\d{7}$/, BH: /^973[36]\d{7}$/, QA: /^974[3567]\d{7}$/,
  KW: /^965[4569]\d{7}$/, EG: /^201[0125]\d{8}$/, JO: /^9627[789]\d{7}$/,
};
/** true: a mobile number; false: a landline, toll-free or short number; null: no rule for this country. */
export function isMobileNumber(waId) {
  const rule = MOBILE[countryForWaId(waId)];
  return rule ? rule.test(waId) : null;
}

/** "+968 9123 4567" style display; never used as an identifier. */
export function formatPhone(waId) {
  if (!isValidWaId(waId)) return waId ? `+${waId}` : '';
  const iso = countryForWaId(waId), dial = dialFor(iso) || '1';
  const national = waId.slice(dial.length);
  const groups = national.length <= 8 ? national.match(/.{1,4}/g) : [national.slice(0, national.length - 7), national.slice(-7, -4), national.slice(-4)];
  return `+${dial} ${groups.join(' ')}`;
}

/** WhatsApp does not deliver marketing templates to US numbers. +1 cannot tell US from Canada, so this warns. */
export const mayBeUsNumber = waId => String(waId || '').startsWith('1') && countryForWaId(waId) === 'US';
