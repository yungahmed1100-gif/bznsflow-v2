// Ascend website brief: /api/layla-meta?surface=website-brief
// GET returns the saved (or prefilled) brief. POST { action } uploads, registers, submits or resends.
// Each submitted version is emailed once to Ahmed; a failed email keeps the brief and can be resent.
import { createHash } from 'node:crypto';
import { websiteBriefStore } from './convex.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';
import { sendEmail } from './resend.js';
import { briefEmail } from './website-brief-email.js';

const MAX_BODY = 14000;
const ACTIONS = ['upload_url', 'file_register', 'submit', 'resend'];
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);

export function createWebsiteBriefApi({ env = process.env, fetcher = fetch, store = websiteBriefStore({ env, fetcher }) } = {}) {
  const email = async (sessionHash, brief) => {
    const emailId = await sendEmail({ env, fetcher, failure: 'brief_email_failed', idempotencyKey: `website-brief/${brief.account.email}/${brief.version}`, message: briefEmail(brief) });
    await store('emailed', { sessionHash, version: brief.version, emailId });
  };
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method === 'POST' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      const token = parseCookies(req).bf_session;
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new PilotError('sign_in_required', 401);
      const sessionHash = createHash('sha256').update(token).digest('hex');
      if (req.method === 'GET') return send(res, 200, { ok: true, brief: await store('get', { sessionHash }), csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });

      if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
      const body = readBody(req);
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > MAX_BODY) throw new PilotError('invalid_body', 400);
      if (!ACTIONS.includes(body.action)) throw new PilotError('invalid_action', 400);
      if (body.action === 'upload_url') return send(res, 200, { ok: true, ...(await store('upload_url', { sessionHash })) }, { vary: 'Cookie' });
      if (body.action === 'file_register') {
        if (!id(body.storageId) || !['logo', 'photo'].includes(body.kind)) throw new PilotError('invalid_file', 400);
        return send(res, 200, { ok: true, ...(await store('file_register', { sessionHash, storageId: body.storageId, kind: body.kind })) }, { vary: 'Cookie' });
      }
      if (body.action === 'resend') {
        const brief = await store('get', { sessionHash });
        if (!brief.version || brief.emailedAt) return send(res, 200, { ok: true, version: brief.version, emailed: !!brief.emailedAt }, { vary: 'Cookie' });
        await email(sessionHash, { ...brief, update: brief.version > 1 });
        return send(res, 200, { ok: true, version: brief.version, emailed: true }, { vary: 'Cookie' });
      }
      const photoIds = body.photoIds ?? [];
      if (!Number.isInteger(body.version) || body.version < 0 || !Array.isArray(photoIds) || !photoIds.every(id)
        || (body.logoId !== undefined && body.logoId !== null && !id(body.logoId))) throw new PilotError('invalid_brief', 400);
      const brief = await store('submit', { sessionHash, version: body.version, fields: body.fields, photoIds, ...(body.logoId ? { logoId: body.logoId } : {}) });
      // Saved first: if the email fails the owner keeps their brief and the page offers to resend it.
      try { await email(sessionHash, brief); } catch {
        return send(res, 502, { ok: false, reason: 'brief_email_failed', version: brief.version }, { vary: 'Cookie' });
      }
      return send(res, 200, { ok: true, version: brief.version, emailed: true }, { vary: 'Cookie' });
    } catch (error) { return sendPilotError(res, error, { fallback: 'brief_unavailable', vary: 'Cookie' }); }
  };
}
