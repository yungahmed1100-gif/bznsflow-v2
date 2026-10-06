// Authenticated "Add information" API: /api/layla-meta?surface=knowledge
import { knowledgeStore } from './convex.js';
import { hashAccountToken, BLUE_ACCOUNT_COOKIE } from './blue-auth.js';
import { parseCookies, ensureCsrfToken, verifyCsrf } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';

const OPERATIONS = ['list', 'open', 'open_draft', 'save', 'publish', 'cancel', 'archive'];
const FIELDS = ['requestId', 'sourceKey', 'title', 'kind', 'text', 'references', 'partial', 'version', 'expectedRevision', 'confirmed', 'acceptPartial'];

export function createKnowledgeApi({ env = process.env, fetcher = fetch, store = knowledgeStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method === 'POST' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      const body = req.method === 'GET' ? { operation: 'list' } : readBody(req);
      if (JSON.stringify(body).length > 450000) throw new PilotError('invalid_import', 413);
      if (!OPERATIONS.includes(body.operation)) throw new PilotError('invalid_operation', 400);
      const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new PilotError('sign_in_required', 401);
      if (req.method === 'POST' && !verifyCsrf(req)) throw new PilotError('csrf', 403);
      const args = {};
      for (const field of FIELDS) if (body[field] !== undefined) args[field] = body[field];
      const result = await store(body.operation, { ...args, tokenHash: hashAccountToken(token) });
      return send(res, 200, { ok: true, ...result, csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });
    } catch (error) { return sendPilotError(res, error, { fallback: 'knowledge_unavailable', vary: 'Cookie' }); }
  };
}
