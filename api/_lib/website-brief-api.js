// Ascend website brief: /api/layla-meta?surface=website-brief
// GET returns the saved (or prefilled) brief, the draft in progress and the website's delivery. POST
// { action } saves a wizard step, looks up domain names, uploads, registers, submits or resends.
// Each submitted version is emailed once to Ahmed; a failed email keeps the brief and can be resent.
// GET ?form=application|vat downloads Paymob's blank forms for an owner asking for online payments (2026-10-31);
// they are bundled with this function (vercel.json includeFiles), never a public file.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { websiteBriefStore } from './convex.js';
import { parseCookies, verifyCsrf, ensureCsrfToken } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';
import { sendEmail } from './resend.js';
import { briefEmail } from './website-brief-email.js';
import { PAYMENT_DOCS_MAX, PAYMENT_DOC_KINDS, WEBSITE_DOMAIN_MAX_USD, domainCandidates } from '../../config/website-brief.js';

const MAX_BODY = 17000;
const ACTIONS = ['upload_url', 'file_register', 'save_draft', 'domain_check', 'submit', 'resend'];
const REGISTRAR = 'https://api.vercel.com/v1/registrar/domains/search';
const FILE_KINDS = ['logo', 'photo', ...PAYMENT_DOC_KINDS];
/** Paymob's blank forms: [file in api/_assets/paymob, the name the owner saves it as]. */
export const PAYMOB_FORMS = Object.freeze({
  application: ['merchant-application.pdf', 'Paymob-merchant-application.pdf'],
  vat: ['vat-declaration.pdf', 'Paymob-VAT-declaration.pdf'],
});
const readForm = file => readFile(join(process.cwd(), 'api', '_assets', 'paymob', file));

/**
 * Availability and yearly price for each candidate, from Vercel's registrar search (no account needed).
 * A name is offered only when it is free, not premium, and within the price BznsFlow pays for it.
 */
export async function searchDomains(names, { env = process.env, fetcher = fetch } = {}) {
  const cap = Number(env.WEBSITE_DOMAIN_MAX_USD) > 0 ? Number(env.WEBSITE_DOMAIN_MAX_USD) : WEBSITE_DOMAIN_MAX_USD;
  let body;
  try {
    const response = await fetcher(REGISTRAR, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: names }) });
    if (!response.ok) throw new Error(String(response.status));
    body = await response.json();
  } catch { throw new PilotError('domain_check_unavailable', 502); }
  const results = new Map((Array.isArray(body?.results) ? body.results : []).map(r => [String(r?.domain || '').toLowerCase(), r]));
  return names.map(domain => {
    const r = results.get(domain);
    const free = r?.available === true || r?.available === 'true';
    const explicitPrice = typeof r?.price === 'number' || (typeof r?.price === 'string' && r.price.trim() !== '');
    const price = explicitPrice ? Number(r.price) : NaN;
    const status = !r ? 'unknown' : !free ? 'taken' : r.premium || !Number.isFinite(price) || price < 0 || price > cap ? 'unavailable' : 'available';
    return { domain, status };
  });
}
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);
const docIdsValid = docIds => Array.isArray(docIds) && docIds.length <= PAYMENT_DOCS_MAX
  && docIds.every(d => d && typeof d === 'object' && PAYMENT_DOC_KINDS.includes(d.kind) && id(d.id));
const docIdsOf = docIds => docIds.map(d => ({ kind: d.kind, id: d.id }));

export function createWebsiteBriefApi({ env = process.env, fetcher = fetch, store = websiteBriefStore({ env, fetcher }), form = readForm } = {}) {
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
      if (req.method === 'GET') {
        const formName = new URL(req.url || '/', 'https://x.invalid').searchParams.get('form');
        if (formName !== null) {
          const known = Object.hasOwn(PAYMOB_FORMS, formName) ? PAYMOB_FORMS[formName] : null;
          if (!known) throw new PilotError('form_not_found', 404);
          // The same check as the brief itself: only an Ascend (or Apex) manager may download the forms.
          await store('get', { sessionHash });
          const pdf = await form(known[0]);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${known[1]}"`);
          res.setHeader('Cache-Control', 'private, no-store');
          res.setHeader('Vary', 'Cookie');
          res.status(200);
          return res.end(pdf);
        }
        return send(res, 200, { ok: true, brief: await store('get', { sessionHash }), csrfToken: ensureCsrfToken(req, res) }, { vary: 'Cookie' });
      }

      if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
      const body = readBody(req);
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > MAX_BODY) throw new PilotError('invalid_body', 400);
      if (!ACTIONS.includes(body.action)) throw new PilotError('invalid_action', 400);
      if (body.action === 'upload_url') return send(res, 200, { ok: true, ...(await store('upload_url', { sessionHash })) }, { vary: 'Cookie' });
      if (body.action === 'file_register') {
        if (!id(body.storageId) || !FILE_KINDS.includes(body.kind)) throw new PilotError('invalid_file', 400);
        const name = PAYMENT_DOC_KINDS.includes(body.kind) && typeof body.name === 'string' ? { name: body.name.slice(0, 120) } : {};
        return send(res, 200, { ok: true, ...(await store('file_register', { sessionHash, storageId: body.storageId, kind: body.kind, ...name })) }, { vary: 'Cookie' });
      }
      if (body.action === 'save_draft') {
        const photoIds = body.photoIds ?? [], docIds = body.docIds ?? [];
        if (!Number.isInteger(body.step) || !Array.isArray(photoIds) || !photoIds.every(id) || (body.logoId !== undefined && body.logoId !== null && !id(body.logoId))
          || !docIdsValid(docIds)) throw new PilotError('invalid_brief', 400);
        return send(res, 200, { ok: true, ...(await store('save_draft', { sessionHash, step: body.step, fields: body.fields, photoIds, docIds: docIdsOf(docIds),
          ...(body.logoId ? { logoId: body.logoId } : {}) })) }, { vary: 'Cookie' });
      }
      if (body.action === 'domain_check') {
        const names = domainCandidates(typeof body.query === 'string' ? body.query.slice(0, 80) : '');
        if (!names.length) return send(res, 200, { ok: true, results: [] }, { vary: 'Cookie' });
        await store('domain_rate', { sessionHash });
        return send(res, 200, { ok: true, results: await searchDomains(names, { env, fetcher }) }, { vary: 'Cookie' });
      }
      if (body.action === 'resend') {
        const brief = await store('get', { sessionHash, submittedOnly: true });
        if (!brief.version || brief.emailedAt) return send(res, 200, { ok: true, version: brief.version, emailed: !!brief.emailedAt }, { vary: 'Cookie' });
        await email(sessionHash, { ...brief, update: brief.version > 1 });
        return send(res, 200, { ok: true, version: brief.version, emailed: true }, { vary: 'Cookie' });
      }
      const photoIds = body.photoIds ?? [], docIds = body.docIds ?? [];
      if (!Number.isInteger(body.version) || body.version < 0 || !Array.isArray(photoIds) || !photoIds.every(id)
        || (body.logoId !== undefined && body.logoId !== null && !id(body.logoId)) || !docIdsValid(docIds)) throw new PilotError('invalid_brief', 400);
      const brief = await store('submit', { sessionHash, version: body.version, fields: body.fields, photoIds, docIds: docIdsOf(docIds), ...(body.logoId ? { logoId: body.logoId } : {}) });
      // Saved first: if the email fails the owner keeps their brief and the page offers to resend it.
      try { await email(sessionHash, brief); } catch {
        return send(res, 502, { ok: false, reason: 'brief_email_failed', version: brief.version }, { vary: 'Cookie' });
      }
      return send(res, 200, { ok: true, version: brief.version, emailed: true }, { vary: 'Cookie' });
    } catch (error) { return sendPilotError(res, error, { fallback: 'brief_unavailable', vary: 'Cookie' }); }
  };
}
