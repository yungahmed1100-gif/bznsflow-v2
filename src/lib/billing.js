// Online payment: ask the server for a Paymob checkout, then leave for it.
// The server names the amount; the browser only says which plan, monthly or yearly, and Ascend's industry.
import { ApiError, callApi } from './api-client.js';

/**
 * @param {'catalyst'|'ascend'} plan @param {'monthly'|'yearly'} interval @param {'ar'|'en'} lang
 * @param {string} [packId] Ascend's live industry pack
 */
export async function startCheckout(plan, interval, lang, packId) {
  const session = await callApi('/api/auth-session', { fallback: 'payment_unavailable' });
  const body = { plan, interval, lang, ...(packId ? { packId } : {}) };
  const { url } = await callApi('/api/paymob-checkout', { body, csrf: session.csrfToken, fallback: 'payment_unavailable' });
  // Only ever navigate to Paymob's own hosted page.
  let target;
  try { target = new URL(url); } catch { throw new ApiError('payment_unavailable', 0); }
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.paymob.com')) throw new ApiError('payment_unavailable', 0);
  window.location.assign(target.toString());
}

// A paid plan inside this window offers to extend before it ends.
export const RENEW_WINDOW_MS = 14 * 86400000;

export const paidDate = (ms, lang) => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' }).format(new Date(ms));
