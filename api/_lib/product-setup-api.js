// Authenticated Catalyst setup API: /api/layla-meta?surface=product-setup
import { createHash, randomBytes } from 'node:crypto';
import { productSetupStore } from './convex.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';

const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function validSave(body) {
  return int(body.step, 0, 3) && int(body.version, 0, Number.MAX_SAFE_INTEGER)
    && typeof body.requestId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.requestId)
    && (body.completed === undefined || typeof body.completed === 'boolean')
    // Sector, stock policy and VAT are Ascend settings, saved from its dashboard, not here.
    && body.packId === undefined && body.stockPolicy === undefined && body.vat === undefined;
}

export function createProductSetupApi({ env = process.env, fetcher = fetch, store = productSetupStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method === 'POST' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      const body = req.method === 'POST' ? readBody(req) : {};
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > 4000) throw new PilotError('invalid_body', 400);
      const product = req.method === 'GET' ? (req.query?.product ?? new URL(req.url || '/', 'https://local.invalid').searchParams.get('product')) : body.product;
      // Ascend is set up inside its dashboard; only Catalyst has a setup page.
      if (product !== 'catalyst') throw new PilotError('invalid_product', 400);
      if (req.method === 'POST' && !validSave(body)) throw new PilotError('invalid_setup', 400);
      const token = parseCookies(req).bf_session;
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new PilotError('sign_in_required', 401);
      if (req.method === 'POST' && !verifyCsrf(req)) throw new PilotError('csrf', 403);
      const args = { sessionHash: createHash('sha256').update(token).digest('hex'), product };
      if (req.method === 'POST') {
        for (const key of ['step', 'version', 'requestId', 'completed']) if (body[key] !== undefined) args[key] = body[key];
        args.draftHash = randomBytes(32).toString('hex');
      }
      const result = await store(req.method === 'GET' ? 'get' : 'save', args);
      return send(res, 200, { ok: true, ...result, csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });
    } catch (error) { return sendPilotError(res, error, { fallback: 'setup_unavailable', vary: 'Cookie' }); }
  };
}
