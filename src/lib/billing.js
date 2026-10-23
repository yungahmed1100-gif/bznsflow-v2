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

// A visitor who picks a plan signs in first; the choice waits in this tab and is used once on return.
const INTENT = 'bf_checkout';
const INTENT_TTL_MS = 30 * 60000;

/** @param {{ plan: 'catalyst'|'ascend', interval: 'monthly'|'yearly', packId?: string }} choice */
export function rememberCheckout(choice) {
  try { sessionStorage.setItem(INTENT, JSON.stringify({ ...choice, at: Date.now() })); } catch { /* storage blocked: they pick again */ }
}

/** The plan picked before signing in, if it is for `plan` and recent; it is cleared once read. */
export function takeCheckout(plan) {
  let choice = null;
  try { choice = JSON.parse(sessionStorage.getItem(INTENT) || 'null'); } catch { return null; }
  if (!choice || choice.plan !== plan) return null;
  try { sessionStorage.removeItem(INTENT); } catch { /* nothing to undo */ }
  const fresh = Date.now() - Number(choice.at) < INTENT_TTL_MS && ['monthly', 'yearly'].includes(choice.interval);
  return fresh ? choice : null;
}

/** Leave for sign-in, coming back to the plans. */
export function signInToPay(lang) {
  const home = lang === 'ar' ? '/' : '/en';
  window.location.assign(`${lang === 'ar' ? '' : '/en'}/signin?next=${encodeURIComponent(home)}`);
}
