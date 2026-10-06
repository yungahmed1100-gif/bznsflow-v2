import { knowledgeStore } from './_lib/convex.js';
import { hashAccountToken, BLUE_ACCOUNT_COOKIE } from './_lib/blue-auth.js';
import { parseCookies, ensureCsrfToken, verifyCsrf } from './_lib/cookies.js';
import { readBody, send, sendPilotError } from './_lib/http.js';
import { PilotError } from './_lib/layla/config.js';
export function createKnowledgeApi({ env = process.env, store = knowledgeStore({ env }) } = {}) {
  return async (req, res) => {
    try {
      const origin = new URL(env.PUBLIC_SITE_ORIGIN || 'https://www.bznsflowai.com');
      if (req.headers.host !== origin.host || (req.method !== 'GET' && req.headers.origin !== origin.origin)) throw new PilotError('origin', 403);
      if (!['GET','POST'].includes(req.method)) throw new PilotError('method',405);
      const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
      if (!token) throw new PilotError('sign_in_required',401);
      if (req.method === 'POST' && !verifyCsrf(req)) throw new PilotError('csrf',403);
      const body = req.method === 'GET' ? { operation:'list' } : readBody(req);
      if (JSON.stringify(body).length > 450000) throw new PilotError('invalid_import',413);
      const args = {};
      for (const field of ['requestId','sourceKey','title','kind','text','references','partial','version','expectedRevision','confirmed','acceptPartial']) if (body[field] !== undefined) args[field] = body[field];
      const result = await store(body.operation, { ...args, tokenHash:hashAccountToken(token) });
      return send(res,200,{ok:true,...result,csrfToken:ensureCsrfToken(req,res)},{vary:'Cookie'});
    } catch (error) { return sendPilotError(res,error); }
  };
}
export default createKnowledgeApi();
