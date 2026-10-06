import { PilotError } from './layla/config.js';
import { convexEndpoints, convexServiceSecret } from './green-config.js';

export function convexConfigured(env = process.env) {
  try {
    convexEndpoints(env);
    return !!convexServiceSecret(env);
  } catch { return false; }
}

/** The shape a reason code must have to be forwarded to a caller unchanged. */
const REASON_CODE = /^[a-z_]{1,60}$/;

/**
 * Build a server-to-server client for one Convex HTTP route.
 *
 * There were six of these, written separately and drifting: the same
 * "check configured → POST with a bearer and a timeout → reject non-ok → map the
 * reason" body, with a different route, timeout, reason policy and status in
 * each. `convexClient` in layla/dashboard-store.js had already generalised most
 * of it; this is that version, promoted so all six share it.
 *
 * Every difference between the old six is a parameter here, so behaviour is
 * preserved exactly rather than approximately.
 *
 * `redirect: 'error'` matters: a redirect away from the Convex site would carry
 * the bearer token with it.
 *
 * @param {object} config
 * @param {string} config.route       path segment on the configured Convex site
 * @param {string} config.fallback    reason used when the backend is unreachable,
 *                                    unconfigured, or answers with a reason we
 *                                    will not forward
 * @param {number} [config.timeout]   ms
 * @param {string[]|RegExp} [config.reasons] which reasons may cross the boundary:
 *                                    an explicit allowlist, or a shape
 * @param {(reason: string) => number} [config.status] status for a rejected call
 */
function convexStore({ route, fallback, timeout = 8000, reasons = REASON_CODE, status = () => 409 }) {
  const forwards = (reason) => Array.isArray(reasons) ? reasons.includes(reason) : reasons.test(reason || '');

  return ({ env = process.env, fetcher = fetch } = {}) => async (operation, args = {}) => {
    if (!convexConfigured(env)) throw new PilotError(fallback, 503);
    try {
      const { site } = convexEndpoints(env);
      const response = await fetcher(`${site}/${route}`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(timeout),
        headers: { Authorization: `Bearer ${convexServiceSecret(env)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, ...args }),
      });
      if (!response.ok) throw Error('backend');
      // `fetcher` is injectable, so json() is `unknown` to the checker. The shape
      // is the Convex route contract: { ok, reason?, value? }.
      const body = /** @type {{ ok?: boolean, reason?: string, value?: unknown }} */ (await response.json());
      if (!body?.ok) {
        const reason = forwards(body?.reason) ? body.reason : fallback;
        throw new PilotError(reason, status(reason));
      }
      return body.value;
    } catch (error) {
      // A PilotError is already a decided answer; anything else is an
      // infrastructure failure and must not leak its shape to the caller.
      if (error instanceof PilotError) throw error;
      throw new PilotError(fallback, 503);
    }
  };
}

// Reasons the review flow is allowed to show a customer. Anything outside the
// list is a backend detail and collapses to `review_backend_unavailable`.
const REVIEW_REASONS = ['invalid_profile', 'profile_changed', 'refresh_throttled', 'session_expired',
  'attempt_used', 'attempt_expired', 'invalid_state', 'operation_conflict', 'asset_in_use', 'attempt_limit'];

const AUTH_REASONS = ['too_soon', 'too_many', 'code_invalid', 'email_unverified', 'session_expired', 'draft_not_claimable',
  'draft_expired', 'draft_already_claimed', 'draft_operation_in_progress', 'draft_selection_pending', 'draft_attempt_active', 'draft_details_unconfirmed'];

// A dashboard call that fails for want of a session is a 401, not a conflict:
// the client retries it by signing in, not by changing the request.
const signInAware = (reason) => reason === 'sign_in_required' ? 401 : 409;

export const reviewStore = convexStore({ route: 'blue-review', fallback: 'review_backend_unavailable', reasons: REVIEW_REASONS });
export const catalogStore = convexStore({ route: 'blue-catalog', fallback: 'catalog_unavailable' });
export const blueAuthStore = convexStore({ route: 'blue-auth', fallback: 'account_unavailable', timeout: 6000, reasons: AUTH_REASONS });
export const dashboardStore = convexStore({ route: 'blue-dashboard', fallback: 'dashboard_unavailable', status: signInAware });
export const hasibStore = convexStore({ route: 'blue-hasib', fallback: 'hasib_unavailable', status: signInAware });
export const campaignStore = convexStore({ route: 'blue-campaign', fallback: 'campaign_unavailable', timeout: 6000, status: signInAware });
export const messagingStore = convexStore({ route: 'blue-messaging', fallback: 'messaging_unavailable', timeout: 6000 });

export const instagramStore = convexStore({ route: 'blue-instagram', fallback: 'instagram_unavailable', status: signInAware });
export const accessStore = convexStore({ route: 'blue-access', fallback: 'access_unavailable', reasons: ['sign_in_required', 'admin_required', 'invalid_email', 'invalid_plan', 'invalid_pack'] });
export const coreStore = convexStore({ route: 'green-core', fallback: 'core_unavailable', reasons: ['invalid_email', 'invalid_bucket', 'invalid_turn', 'conversation_not_found'] });
export const productSetupStore = convexStore({ route: 'product-setup', fallback: 'setup_unavailable', status: signInAware });

export const knowledgeStore = convexStore({ route: 'knowledge-sources', fallback: 'knowledge_unavailable', status: signInAware });
