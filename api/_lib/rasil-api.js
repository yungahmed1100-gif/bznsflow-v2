// Rasil, the owner's side: /api/layla-meta?surface=rasil
// GET returns the email state; POST { action } connects the sending domain, manages subscribers,
// drafts with Adiba, and creates or cancels campaigns. Convex re-checks the plan and the role.
//
// Open to every Ascend account when RASIL_ENABLED is true; before that, only to the addresses in
// RASIL_TEST_EMAILS, so a real domain can be tested end to end without opening it to customers.
import { randomBytes } from 'node:crypto';
import { blueAuthStore, rasilStore } from './convex.js';
import { blueAccount } from './blue-auth.js';
import { ensureCsrfToken, verifyCsrf } from './cookies.js';
import { isSameSite } from './guard.js';
import { readBody, send, sendPilotError } from './http.js';
import { PilotError } from './layla/config.js';
import { validTimezone, zonedLocalToUtc } from './layla/timezone.js';
import { createDomain, checkDomain } from './rasil-resend.js';
import { qwenGenerator, QwenError } from '../../config/qwen-client.js';
import { untracedAmount } from '../../config/layla-prices.js';
import { IMPORT_MAX, campaignContent, normalizeDomain, validDomain } from '../../config/rasil.js';

const MAX_BODY = 90000;
const id = value => (typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined);
const uuid = value => (typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value) ? value : undefined);
const text = (value, n) => (typeof value === 'string' ? value.slice(0, n) : '');

export function rasilOpen(env, email) {
  if (env.RASIL_ENABLED === 'true') return true;
  const testers = String(env.RASIL_TEST_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return !!email && testers.includes(String(email).toLowerCase());
}

/** Adiba writes a first draft from the published bzns.md; the owner edits and approves it. Prices only from the catalog. */
export async function draftEmail({ context, brief, lang, generate }) {
  const language = lang === 'en' ? 'English' : 'Gulf Arabic (natural, warm, not formal Fusha)';
  const messages = [
    { role: 'system', content: `You write one marketing email for ${context.business.name}, a business in Oman, to people who subscribed to its emails. Write in ${language}.
Use only facts from the business document and catalog below. Never invent prices, discounts, dates, guarantees or results; mention a price only if the catalog states it.
Plain text only, no HTML or markdown. Start the body with a greeting that uses {{name}}. Keep it under 180 words with one clear next step.
Reply as JSON: {"subject": "...", "body": "..."}.` },
    { role: 'user', content: `What the owner wants this email to say: ${brief || 'a short update about what we offer'}\n\nBusiness document (bzns.md):\n${context.bzns || '(none)'}\n\nCatalog:\n${JSON.stringify(context.catalog).slice(0, 6000)}` },
  ];
  let draft;
  try { draft = JSON.parse((await generate(messages)).text); } catch (e) { throw new PilotError(e instanceof QwenError ? 'draft_unavailable' : 'draft_failed', 503); }
  const content = campaignContent({ subject: draft?.subject, body: draft?.body });
  if (!content.ok) throw new PilotError('draft_failed', 503);
  const price = untracedAmount(`${content.subject}\n${content.body}`, { catalog: context.catalog });
  return { subject: content.subject, body: content.body, untracedPrice: price || null };
}

export function createRasilApi({ env = process.env, fetcher = fetch, now = Date.now, accounts = blueAuthStore({ env, fetcher }), store = rasilStore({ env, fetcher }),
  generate = qwenGenerator(env, fetcher, { maxTokens: 900, timeoutMs: 30000 }) } = {}) {
  return async (req, res) => {
    try {
      if (!isSameSite(req, env, { write: req.method !== 'GET' })) throw new PilotError('origin', 403);
      if (!['GET', 'POST'].includes(req.method)) throw new PilotError('method', 405);
      const account = await blueAccount(req, accounts);
      if (!account) throw new PilotError('sign_in_required', 401);
      if (!rasilOpen(env, account.email)) throw new PilotError('email_unavailable', 503);
      const sessionHash = account.workspaceDraftHash || account.draftHash;
      if (!sessionHash) throw new PilotError('setup_required', 409);
      const csrfToken = ensureCsrfToken(req, res);
      const call = (operation, args = {}) => store(operation, { sessionHash, actorAccountId: account.id, ...args });
      const reply = value => send(res, 200, { ok: true, ...value, csrfToken }, { vary: 'Cookie' });
      if (req.method === 'GET') return reply(await call('state'));

      if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
      const body = readBody(req);
      if (!body || typeof body !== 'object' || JSON.stringify(body).length > MAX_BODY) throw new PilotError('body_too_large', 413);
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'domain_connect') {
        const domain = normalizeDomain(body.domain);
        if (!validDomain(domain)) throw new PilotError('invalid_domain');
        const created = await createDomain({ env, fetcher, domain });
        return reply(await call('domain_save', { domain, ...created, formKey: randomBytes(18).toString('base64url') }));
      }
      if (action === 'domain_check') {
        const context = await call('domain_context');
        return reply(await call('domain_status', await checkDomain({ env, fetcher, resendDomainId: context.resendDomainId })));
      }
      if (action === 'sender_save') return reply(await call('sender_save', { fromName: text(body.fromName, 80), fromLocal: text(body.fromLocal, 64), replyTo: text(body.replyTo, 254) }));
      if (action === 'subscribers') return reply(await call('subscribers', { ...(typeof body.cursor === 'string' ? { cursor: text(body.cursor, 100) } : {}), ...(body.status ? { status: text(body.status, 20) } : {}) }));
      if (action === 'subscribers_import') {
        if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > IMPORT_MAX) throw new PilotError('invalid_import');
        const c = body.consent && typeof body.consent === 'object' ? body.consent : {};
        return reply(await call('subscribers_import', { origin: body.origin === 'manual' ? 'manual' : 'import',
          rows: body.rows.map(r => ({ email: text(r?.email, 254), ...(typeof r?.name === 'string' && r.name.trim() ? { name: r.name.slice(0, 80) } : {}) })),
          consent: { source: text(c.source, 120), date: text(c.date, 10), purpose: text(c.purpose, 200), attested: c.attested === true } }));
      }
      if (action === 'subscriber_unsubscribe') return reply(await call('subscriber_unsubscribe', { subscriberId: id(body.subscriberId) || '' }));
      if (action === 'draft') {
        const context = await call('draft_context');
        return reply({ draft: await draftEmail({ context, brief: text(body.brief, 600), lang: body.lang, generate }) });
      }
      if (action === 'campaigns') return reply(await call('campaigns', body.cursor ? { cursor: text(body.cursor, 100) } : {}));
      if (action === 'campaign_detail' || action === 'campaign_cancel') return reply(await call(action, { campaignId: id(body.campaignId) || '' }));
      if (action === 'campaign_preview') return reply(await call('campaign_preview', { subject: text(body.subject, 400), body: text(body.body, 21000), lang: body.lang === 'en' ? 'en' : 'ar' }));
      if (action === 'campaign_create') {
        const timezone = body.schedule?.timezone;
        if (!validTimezone(timezone)) throw new PilotError('invalid_timezone');
        let scheduledAt = now();
        if (body.schedule?.mode === 'later') {
          try { scheduledAt = zonedLocalToUtc(body.schedule.local, timezone); } catch { throw new PilotError('invalid_schedule'); }
        } else if (body.schedule?.mode !== 'now') throw new PilotError('invalid_schedule');
        return reply(await call('campaign_create', { requestId: uuid(body.requestId) || '', confirm: body.confirm === true, name: text(body.name, 80), subject: text(body.subject, 400),
          body: text(body.body, 21000), lang: body.lang === 'en' ? 'en' : 'ar', scheduledAt, timezone }));
      }
      throw new PilotError('invalid_action');
    } catch (e) {
      return sendPilotError(res, e, { fallback: 'email_unavailable', vary: 'Cookie' });
    }
  };
}
