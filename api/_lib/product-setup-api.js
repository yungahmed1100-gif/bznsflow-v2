// Authenticated Catalyst/Ascend setup API: /api/layla-meta?surface=product-setup
import { createHash, randomBytes } from 'node:crypto';
import { productSetupStore } from './convex.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';

const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const validVat = v => v && typeof v === 'object' && typeof v.registered === 'boolean' && int(v.rateBps, 0, 10000) && typeof v.pricesIncludeVat === 'boolean'
  && (v.vatin === undefined || (typeof v.vatin === 'string' && /^[A-Z0-9]{0,20}$/.test(v.vatin)));

function validSave(body) {
  return int(body.step, 0, 3) && int(body.version, 0, Number.MAX_SAFE_INTEGER)
    && typeof body.requestId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.requestId)
    && (body.completed === undefined || typeof body.completed === 'boolean')
    && (body.packId === undefined || (typeof body.packId === 'string' && body.packId.length <= 40))
    && (body.stockPolicy === undefined || ['warn', 'block'].includes(body.stockPolicy))
    && (body.vat === undefined || validVat(body.vat));
}

export function createProductSetupApi({ env = process.env, fetcher = fetch, store = productSetupStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method === 'POST' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      const body = req.method === 'POST' ? readBody(req) : {};
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > 4000) throw new PilotError('invalid_body', 400);
      const product = req.method === 'GET' ? (req.query?.product ?? new URL(req.url || '/', 'https://local.invalid').searchParams.get('product')) : body.product;
      if (!['catalyst', 'ascend'].includes(product)) throw new PilotError('invalid_product', 400);
      if (req.method === 'POST' && !validSave(body)) throw new PilotError('invalid_setup', 400);
      const token = parseCookies(req).bf_session;
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new PilotError('sign_in_required', 401);
      if (req.method === 'POST' && !verifyCsrf(req)) throw new PilotError('csrf', 403);
      const args = { sessionHash: createHash('sha256').update(token).digest('hex'), product };
      if (req.method === 'POST') {
        for (const key of ['step', 'version', 'requestId', 'completed', 'packId', 'stockPolicy', 'vat']) if (body[key] !== undefined) args[key] = body[key];
        args.draftHash = randomBytes(32).toString('hex');
      }
      const result = await store(req.method === 'GET' ? 'get' : 'save', args);
      return send(res, 200, { ok: true, ...result, csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });
    } catch (error) { return sendPilotError(res, error, { fallback: 'setup_unavailable', vary: 'Cookie' }); }
  };
}
