// Whether a plan grant gives access right now. Operator grants have no end; a grant paid through
// Paymob (convex/billingState.js) lasts until `paidUntil`, then three days of grace in which the
// owner is warned that access will be denied (Ahmed, 2026-10-18). Every reader of blueAccessGrants asks here.
export const ACCESS_GRACE_MS = 3 * 86400000;

/** When a paid grant stops giving access; null for a grant with no end. */
export const deniedAt = grant => Number.isFinite(grant?.paidUntil) ? grant.paidUntil + ACCESS_GRACE_MS : null;

export function grantLive(grant, now = Date.now()) {
  const end = deniedAt(grant);
  return grant?.status === 'active' && (end === null || now < end);
}
