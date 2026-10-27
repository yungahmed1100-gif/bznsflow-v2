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
  'attempt_used', 'attempt_expired', 'invalid_state', 'operation_conflict', 'asset_in_use', 'attempt_limit',
  'bzns_conflict', 'bzns_invalid', 'bzns_too_long'];

const AUTH_REASONS = ['too_soon', 'too_many', 'code_invalid', 'email_unverified', 'session_expired', 'draft_not_claimable',
  'draft_expired', 'draft_already_claimed', 'draft_operation_in_progress', 'draft_selection_pending', 'draft_attempt_active', 'draft_details_unconfirmed'];

// A dashboard call that fails for want of a session is a 401, not a conflict:
// the client retries it by signing in, not by changing the request.
// Setup and knowledge rejections: auth 401, entitlement 403, bad input 400, state conflict 409.
const setupStatus = r => r === 'sign_in_required' ? 401 : ['access_required', 'manager_required'].includes(r) ? 403 : /^invalid_|_required$|_not_live$/.test(r) ? 400 : 409;
const signInAware = (reason) => reason === 'sign_in_required' ? 401 : 409;

export const reviewStore = convexStore({ route: 'blue-review', fallback: 'review_backend_unavailable', reasons: REVIEW_REASONS });
export const catalogStore = convexStore({ route: 'blue-catalog', fallback: 'catalog_unavailable' });
export const brainStore = convexStore({ route: 'blue-brain', fallback: 'brain_unavailable' });
export const blueAuthStore = convexStore({ route: 'blue-auth', fallback: 'account_unavailable', timeout: 6000, reasons: AUTH_REASONS });
export const dashboardStore = convexStore({ route: 'blue-dashboard', fallback: 'dashboard_unavailable', status: signInAware });
export const hasibStore = convexStore({ route: 'blue-hasib', fallback: 'hasib_unavailable', status: signInAware });
export const campaignStore = convexStore({ route: 'blue-campaign', fallback: 'campaign_unavailable', timeout: 6000, status: signInAware });
export const messagingStore = convexStore({ route: 'blue-messaging', fallback: 'messaging_unavailable', timeout: 6000 });

export const instagramStore = convexStore({ route: 'blue-instagram', fallback: 'instagram_unavailable', status: signInAware });
export const accessStore = convexStore({ route: 'blue-access', fallback: 'access_unavailable', reasons: ['sign_in_required', 'admin_required', 'invalid_email', 'invalid_plan', 'invalid_pack'] });
export const coreStore = convexStore({ route: 'green-core', fallback: 'core_unavailable', reasons: ['invalid_email', 'invalid_bucket', 'invalid_turn', 'conversation_not_found'] });
export const productSetupStore = convexStore({ route: 'product-setup', fallback: 'setup_unavailable', status: setupStatus });

export const knowledgeStore = convexStore({ route: 'knowledge-sources', fallback: 'knowledge_unavailable', status: setupStatus });

// Online payments: checkout refusals reach the customer; webhook refusals are logged and acknowledged.
const billingStatus = r => r === 'sign_in_required' ? 401 : ['invalid_interval', 'invalid_pack'].includes(r) ? 400 : r === 'too_many' ? 429 : 409;
export const billingStore = convexStore({ route: 'billing', fallback: 'payment_unavailable', status: billingStatus,
  reasons: ['sign_in_required', 'invalid_interval', 'invalid_pack', 'plan_active', 'too_many', 'invalid_state', 'unknown_payment', 'already_paid', 'amount_mismatch'] });

// Ascend website brief (convex/websiteBriefState.js): refusals the form explains to the owner.
export const websiteBriefStore = convexStore({ route: 'website-brief', fallback: 'brief_unavailable', status: setupStatus,
  reasons: ['sign_in_required', 'access_required', 'manager_required', 'upload_limit', 'invalid_file', 'too_many_files', 'invalid_brief', 'brief_too_long', 'brief_required', 'brief_conflict', 'too_many', 'invalid_state'] });
// Ahmed's free-website queue (convex/websiteProjectsState.js).
const websitesStatus = r => r === 'sign_in_required' ? 401 : r === 'admin_required' ? 403 : r === 'project_not_found' ? 404 : 400;
export const websiteAdminStore = convexStore({ route: 'website-admin', fallback: 'websites_unavailable', status: websitesStatus,
  reasons: ['sign_in_required', 'admin_required', 'project_not_found', 'live_url_required', 'invalid_due', 'reason_required', 'invalid_action', 'invalid_state'] });

// The free audit (convex/auditState.js): public booking, and Ahmed's Audits tab.
const auditStatus = r => r === 'sign_in_required' ? 401 : r === 'admin_required' ? 403 : r === 'booking_not_found' ? 404 : ['slot_taken', 'already_booked'].includes(r) ? 409 : 400;
export const auditStore = convexStore({ route: 'audit', fallback: 'audit_unavailable', status: auditStatus,
  reasons: ['invalid_slot', 'invalid_name', 'invalid_email', 'slot_taken', 'already_booked'] });
export const auditAdminStore = convexStore({ route: 'audit-admin', fallback: 'audit_unavailable', status: auditStatus,
  reasons: ['sign_in_required', 'admin_required', 'booking_not_found', 'invalid_range', 'invalid_status', 'slot_taken'] });

// Apex requests (convex/apexState.js): the public request page and Ahmed's /owner/apex queue.
const apexStatus = r => r === 'sign_in_required' ? 401 : r === 'admin_required' ? 403 : r === 'request_not_found' ? 404 : r === 'too_many_requests' ? 429 : 400;
export const apexStore = convexStore({ route: 'apex', fallback: 'apex_unavailable', status: apexStatus,
  reasons: ['invalid_company', 'invalid_name', 'invalid_email', 'invalid_functions', 'invalid_need', 'too_many_requests'] });
export const apexAdminStore = convexStore({ route: 'apex-admin', fallback: 'apex_unavailable', status: apexStatus,
  reasons: ['sign_in_required', 'admin_required', 'request_not_found', 'invalid_status'] });

// Rasil (convex/rasilState.js): the owner's email campaigns, and the server-side worker, webhook and public links.
const RASIL_REASONS = ['sign_in_required', 'access_required', 'plan_required', 'manager_required', 'workspace_access_revoked', 'invalid_domain', 'domain_in_use', 'domain_not_found',
  'domain_required', 'domain_not_verified', 'sender_required', 'invalid_sender', 'campaign_in_progress', 'consent_required', 'invalid_import', 'subscriber_not_found',
  'invalid_subject', 'invalid_body', 'invalid_request', 'confirmation_required', 'no_eligible_recipients', 'monthly_cap', 'invalid_schedule', 'invalid_timezone',
  'campaign_not_found', 'campaign_not_cancellable', 'invalid_action', 'form_unavailable', 'invalid_email', 'too_many', 'invalid_state'];
export const rasilStore = convexStore({ route: 'rasil', fallback: 'email_unavailable', status: setupStatus, reasons: RASIL_REASONS });
export const rasilWorkerStore = convexStore({ route: 'rasil-worker', fallback: 'email_unavailable', timeout: 6000, reasons: RASIL_REASONS });
