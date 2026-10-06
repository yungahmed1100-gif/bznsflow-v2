import { createHash, randomBytes } from 'node:crypto';
import { productSetupStore } from './_lib/convex.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from './_lib/cookies.js';
import { isAllowedOrigin } from './_lib/guard.js';
import { readBody, send } from './_lib/http.js';
export function createProductSetupApi({ store = productSetupStore() } = {}) {
  return async (req, res) => {
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { ok: false, reason: 'method' });
    if (!isAllowedOrigin(req)) return send(res, 403, { ok: false, reason: 'origin' });
    const token = parseCookies(req).bf_session;
    if (!/^[a-f0-9]{64}$/.test(token || '')) return send(res, 401, { ok: false, reason: 'sign_in_required' });
    if (req.method === 'POST' && !verifyCsrf(req)) return send(res, 403, { ok: false, reason: 'csrf' });
    try {
      const body = req.method === 'POST' ? readBody(req) : {};
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > 4000) return send(res, 400, { ok: false, reason: 'invalid_body' });
      const product = req.method === 'GET' ? new URL(req.url, 'https://local.invalid').searchParams.get('product') : body.product;
      if (!['catalyst', 'ascend'].includes(product)) return send(res, 400, { ok: false, reason: 'invalid_product' });
      const args = { sessionHash: createHash('sha256').update(token).digest('hex'), product };
      if (req.method === 'POST') {
        for (const key of ['step', 'version', 'requestId', 'completed', 'packId', 'stockPolicy', 'vat']) if (body[key] !== undefined) args[key] = body[key];
        args.draftHash = randomBytes(32).toString('hex');
      }
      const result = await store(req.method === 'GET' ? 'get' : 'save', args);
      return send(res, 200, { ok: true, ...result, csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });
    } catch (error) {
      const reason = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'setup_unavailable';
      return send(res, reason === 'sign_in_required' ? 401 : ['access_required', 'manager_required'].includes(reason) ? 403 : 409, { ok: false, reason }, { vary: 'Cookie' });
    }
  };
}
export default createProductSetupApi();
