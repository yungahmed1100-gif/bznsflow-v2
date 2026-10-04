import { createHash } from 'node:crypto';
import { accessStore } from './_lib/convex.js';
import { parseCookies, verifyCsrf } from './_lib/cookies.js';
import { isAllowedOrigin } from './_lib/guard.js';
import { readBody, send } from './_lib/http.js';

import { isLivePack } from '../config/hasib-packs.js';

const hash = value => createHash('sha256').update(value).digest('hex');

export function createAccessAdmin({ store = accessStore() } = {}) {
return async function handler(req, res) {
  const method = String(req.method || '').toUpperCase();
  if (!['GET', 'POST', 'DELETE'].includes(method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return send(res, 405, { ok: false, reason: 'method' }, { vary: 'Cookie' });
  }
  if (!isAllowedOrigin(req)) return send(res, 403, { ok: false, reason: 'origin' }, { vary: 'Cookie' });
  const token = parseCookies(req).bf_session;
  if (!/^[a-f0-9]{64}$/.test(token || '')) return send(res, 401, { ok: false, reason: 'sign_in_required' }, { vary: 'Cookie' });
  if (method !== 'GET' && !verifyCsrf(req)) return send(res, 403, { ok: false, reason: 'csrf' }, { vary: 'Cookie' });
  try {
    const body = method === 'GET' ? {} : readBody(req);
    if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' });
    if (method === 'POST' && body.packId !== undefined && (body.plan !== 'ascend' || !isLivePack(body.packId))) return send(res, 400, { ok: false, reason: 'invalid_pack' });
    const operation = method === 'GET' ? 'list' : method === 'POST' ? 'grant' : 'revoke';
    const value = await store(operation, {
      sessionHash: hash(token),
      ...(typeof body.email === 'string' ? { email: body.email } : {}),
      ...(body.plan === 'catalyst' || body.plan === 'ascend' ? { plan: body.plan } : {}),
      ...(typeof body.packId === 'string' ? { packId: body.packId } : {}),
      ...(typeof body.note === 'string' ? { note: body.note } : {}),
    });
    return send(res, 200, { ok: true, ...value }, { vary: 'Cookie' });
  } catch (error) {
    const reason = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'access_unavailable';
    const status = reason === 'sign_in_required' ? 401 : reason === 'admin_required' ? 403 : ['invalid_email', 'invalid_plan', 'invalid_pack'].includes(reason) ? 400 : 503;
    return send(res, status, { ok: false, reason }, { vary: 'Cookie' });
  }
}

}
export default createAccessAdmin();
