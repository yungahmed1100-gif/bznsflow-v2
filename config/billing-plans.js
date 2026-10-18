// What a customer can pay for online, and the only place its price lives (Ahmed, 2026-10-18).
// Catalyst is OMR 9 a month; paid yearly it is a fixed OMR 89 (save OMR 19 on 12 × 9).
// Ascend is OMR 29 a month or OMR 289 a year (save OMR 59 on 12 × 29), bought with a live industry pack.
// Money is integer baisa, as everywhere else in the app.
//
// Both the checkout route and Convex read this table, so the browser never names an amount.

export const BILLING_CURRENCY = 'OMR';

export const BILLING_PLANS = Object.freeze({
  catalyst: Object.freeze({
    monthly: Object.freeze({ baisa: 9000, months: 1 }),
    yearly: Object.freeze({ baisa: 89000, months: 12 }),
  }),
  ascend: Object.freeze({
    monthly: Object.freeze({ baisa: 29000, months: 1 }),
    yearly: Object.freeze({ baisa: 289000, months: 12 }),
  }),
});

export const BILLING_PLAN_IDS = Object.freeze(Object.keys(BILLING_PLANS));

/** @returns {{ baisa: number, months: number } | null} */
export const billingPrice = (plan, interval) => BILLING_PLANS[plan]?.[interval] || null;

// Paymob's `amount` is in the currency's minor unit: baisa for OMR. Confirmed 2026-10-18 with a sandbox
// intention: 9000 showed as 9.000 OMR on Paymob Oman's checkout.
export const PAYMOB_UNITS_PER_OMR = 1000;
export const paymobAmount = baisa => Math.round(baisa * PAYMOB_UNITS_PER_OMR / 1000);

// A paid period: whole calendar months from `from`, in UTC.
export function addMonths(from, months) {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}
