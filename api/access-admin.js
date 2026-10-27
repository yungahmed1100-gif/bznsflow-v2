import { createHash } from 'node:crypto';
import { accessStore, apexAdminStore, auditAdminStore, websiteAdminStore } from './_lib/convex.js';
import { parseCookies, verifyCsrf } from './_lib/cookies.js';
import { isAllowedOrigin } from './_lib/guard.js';
import { readBody, send } from './_lib/http.js';

import { isLivePack } from '../config/hasib-packs.js';

const hash = value => createHash('sha256').update(value).digest('hex');

// ?op=websites: Ahmed's free-website queue (convex/websiteProjectsState.js). GET lists it; POST moves one.
async function websites(req, res, method, sessionHash, store) {
  if (method === 'DELETE') return send(res, 405, { ok: false, reason: 'method' }, { vary: 'Cookie' });
  if (method === 'GET') return send(res, 200, { ok: true, ...(await store('projects', { sessionHash })) }, { vary: 'Cookie' });
  const body = readBody(req);
  if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' }, { vary: 'Cookie' });
  const text = key => (typeof body[key] === 'string' ? { [key]: body[key].slice(0, 600) } : {});
  const value = await store('project_update', { sessionHash, ...text('projectId'), ...text('action'), ...text('liveUrl'), ...text('reason'), ...text('note'),
    ...(Number.isSafeInteger(body.dueAt) ? { dueAt: body.dueAt } : {}) });
  return send(res, 200, { ok: true, ...value }, { vary: 'Cookie' });
}

// ?op=audits: Ahmed's free-audit calendar (convex/auditState.js). GET lists a range; POST marks one booking.
async function audits(req, res, method, sessionHash, store) {
  if (method === 'DELETE') return send(res, 405, { ok: false, reason: 'method' }, { vary: 'Cookie' });
  if (method === 'GET') {
    const params = new URL(req.url || '/', 'https://x.invalid').searchParams;
    return send(res, 200, { ok: true, ...(await store('list', { sessionHash, from: Number(params.get('from')), to: Number(params.get('to')) })) }, { vary: 'Cookie' });
  }
  const body = readBody(req);
  if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' }, { vary: 'Cookie' });
  const text = key => (typeof body[key] === 'string' ? { [key]: body[key].slice(0, 600) } : {});
  const value = await store('update', { sessionHash, ...text('bookingId'), ...text('status'), ...text('adminNote') });
  return send(res, 200, { ok: true, ...value }, { vary: 'Cookie' });
}

// ?op=apex: Ahmed's Apex request queue (convex/apexState.js). GET lists it; POST moves one request along.
async function apexRequests(req, res, method, sessionHash, store) {
  if (method === 'DELETE') return send(res, 405, { ok: false, reason: 'method' }, { vary: 'Cookie' });
  if (method === 'GET') return send(res, 200, { ok: true, ...(await store('list', { sessionHash })) }, { vary: 'Cookie' });
  const body = readBody(req);
  if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' }, { vary: 'Cookie' });
  const text = (key, n = 600) => (typeof body[key] === 'string' ? { [key]: body[key].slice(0, n) } : {});
  const value = await store('update', { sessionHash, ...text('requestId'), ...text('status'), ...text('adminNote', 1200) });
  return send(res, 200, { ok: true, ...value }, { vary: 'Cookie' });
}

export function createAccessAdmin({ store = accessStore(), websiteStore = websiteAdminStore(), auditStore = auditAdminStore(), apexStore = apexAdminStore() } = {}) {
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
    const op = new URL(req.url || '/', 'https://x.invalid').searchParams.get('op');
    if (op === 'websites') return await websites(req, res, method, hash(token), websiteStore);
    if (op === 'audits') return await audits(req, res, method, hash(token), auditStore);
    if (op === 'apex') return await apexRequests(req, res, method, hash(token), apexStore);
    const body = method === 'GET' ? {} : readBody(req);
    if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' });
    if (method === 'POST' && body.packId !== undefined && (!['ascend', 'apex'].includes(body.plan) || !isLivePack(body.packId))) return send(res, 400, { ok: false, reason: 'invalid_pack' });
    const operation = method === 'GET' ? 'list' : method === 'POST' ? 'grant' : 'revoke';
    const value = await store(operation, {
      sessionHash: hash(token),
      ...(typeof body.email === 'string' ? { email: body.email } : {}),
      ...(['catalyst', 'ascend', 'apex'].includes(body.plan) ? { plan: body.plan } : {}),
      ...(typeof body.packId === 'string' ? { packId: body.packId } : {}),
      ...(typeof body.note === 'string' ? { note: body.note } : {}),
    });
    return send(res, 200, { ok: true, ...value }, { vary: 'Cookie' });
  } catch (error) {
    const reason = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'access_unavailable';
    const status = reason === 'sign_in_required' ? 401 : reason === 'admin_required' ? 403 : ['project_not_found', 'booking_not_found', 'request_not_found'].includes(reason) ? 404
      : reason === 'slot_taken' ? 409
      : ['invalid_email', 'invalid_plan', 'invalid_pack', 'live_url_required', 'invalid_due', 'reason_required', 'invalid_action', 'invalid_state', 'invalid_range', 'invalid_status'].includes(reason) ? 400 : 503;
    return send(res, status, { ok: false, reason }, { vary: 'Cookie' });
  }
}

}
export default createAccessAdmin();
