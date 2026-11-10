// A permission change interrupted by account re-verification is finished on
// return instead of being asked for again.
const PENDING_POLICY_KEY = "bf_mcp_pending_policy";
const PENDING_POLICY_MS = 10 * 60000;
export function readPendingPolicy() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_POLICY_KEY));
    sessionStorage.removeItem(PENDING_POLICY_KEY);
    return value && Date.now() - value.at < PENDING_POLICY_MS ? value : null;
  } catch {
    return null;
  }
}
export function keepPendingPolicy(body) {
  try {
    sessionStorage.setItem(
      PENDING_POLICY_KEY,
      JSON.stringify({ ...body, at: Date.now() }),
    );
  } catch {
    // Without storage the owner simply saves again after verifying.
  }
}
