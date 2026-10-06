import { send, sendPilotError } from './_lib/http.js';
import { isGreenRuntime, greenDataReady } from './_lib/green-config.js';
import { createInstagramApi } from './_lib/layla/instagram.js';
import { createMessagingApi } from './_lib/layla/blue-messaging.js';
import { createDashboardApi } from './_lib/layla/dashboard-api.js';
import { createHasibApi } from './_lib/hasib/hasib-api.js';
import { createProductSetupApi } from './_lib/product-setup-api.js';
import { createKnowledgeApi } from './_lib/knowledge-api.js';
import { createReviewHandler, reviewAvailable } from './_lib/layla/review-api.js';

export function requestSurface(req) {
  const params = new URL(req.url || '/', 'https://internal.invalid').searchParams;
  const surface = req.query?.surface || params.get('surface');
  if (surface) return surface;
  const isInstagramReturn = req.method === 'GET' && /^[a-f0-9]{64}$/.test(params.get('state') || '') && (params.has('code') || params.has('error'));
  return isInstagramReturn ? 'instagram-callback' : null;
}

// All active surfaces use authenticated Convex clients. Retired pilot routes
// return 410 instead of falling back to another database.
const INSTAGRAM_SURFACES = ['instagram', 'instagram-callback', 'instagram-deauthorize', 'instagram-delete', 'instagram-deletion-status'];
export const SURFACES = ['dashboard', 'hasib', 'messaging', 'customer', 'customer-review', 'product-setup', 'knowledge', ...INSTAGRAM_SURFACES, 'customer-status', 'activation', 'test']; // activation and test are retired (410) but still rewritten

export function createHandler({ env = process.env, fetcher = fetch, surfaces = {} } = {}) {
  const customer = createReviewHandler({ env, fetcher, reviewMode: false });
  const review = createReviewHandler({ env, fetcher, reviewMode: true });
  const handlers = {
    dashboard: createDashboardApi({ env, fetcher }),
    hasib: createHasibApi({ env, fetcher }),
    messaging: createMessagingApi({ env, fetcher }),
    customer,
    'customer-review': review,
    'product-setup': createProductSetupApi({ env, fetcher }),
    knowledge: createKnowledgeApi({ env, fetcher }),
  };
  Object.assign(handlers, surfaces);
  return async (req, res) => {
    try {
      if ((isGreenRuntime(env) || env.GREEN_CONVEX_CUTOVER === 'true') && !greenDataReady(env)) {
        return send(res, 503, { ok: false, reason: 'green_state_migration_required' });
      }
      const surface = requestSurface(req);
      if (Object.hasOwn(handlers, surface)) return await handlers[surface](req, res);
      if (INSTAGRAM_SURFACES.includes(surface)) {
        return await createInstagramApi({ env, fetcher })(req, res, surface);
      }
      if (surface === 'customer-status') {
        if (req.method !== 'GET') {
          res.setHeader('Allow', 'GET');
          return send(res, 405, { ok: false, reason: 'method' });
        }
        return send(res, 200, { ok: true, available: reviewAvailable(env) }, { vary: 'Cookie' });
      }
      return send(res, 410, { ok: false, reason: 'pilot_retired' });
    } catch (error) {
      return sendPilotError(res, error, { fallback: 'unavailable', vary: 'Cookie' });
    }
  };
}
export default createHandler();
