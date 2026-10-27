// /api/lead?op=apex — the public Apex request (config/apex.js, convex/apexState.js). POST stores the
// company's request and emails Ahmed. No session and no CSRF: like the lead form it grants nothing, so the
// origin check, a honeypot, per-IP metering and a per-email daily limit bound abuse.
import { apexStore } from './convex.js';
import { checkRate } from './db.js';
import { clientIp, isAllowedOrigin } from './guard.js';
import { readBody, send } from './http.js';
import { sendEmail } from './resend.js';
import { apexEmail } from './apex-email.js';

const REQUESTS_PER_MIN = 5;
const buckets = (ip, now) => ({ ip: `apex:ip:${ip}:${new Date(now).toISOString().slice(0, 16)}`, global: `apex:global:${new Date(now).toISOString().slice(0, 10)}` });

export function createApexApi({ env = process.env, fetcher = fetch, store = apexStore({ env, fetcher }), rate = checkRate, email = sendEmail, now = Date.now } = {}) {
  return async function apexApi(req, res) {
    if (String(req.method || '').toUpperCase() !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, reason: 'method' }); }
    if (!isAllowedOrigin(req)) return send(res, 403, { ok: false, reason: 'origin' });
    try {
      const at = now(), { ip, global } = buckets(clientIp(req), at);
      try {
        const hits = await rate(ip, global);
        if (Number(hits?.ip_hits || 0) > REQUESTS_PER_MIN) return send(res, 429, { ok: false, reason: 'rate_ip' });
      } catch (error) { console.error('[apex] rate limit check failed, allowing:', error.message); }
      const body = readBody(req);
      if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' });
      // A filled honeypot is a bot: answer as if received, store nothing.
      if (typeof body.website === 'string' && body.website.trim()) return send(res, 200, { ok: true, received: true });
      const pick = (key, n = 300) => (typeof body[key] === 'string' ? body[key].slice(0, n) : undefined);
      const { request } = await store('request', { request: {
        company: pick('company'), name: pick('name'), email: pick('email'), phone: pick('phone'), branches: pick('branches', 10), staff: pick('staff', 10),
        system: pick('system', 20), systemNote: pick('systemNote'), need: pick('need', 2500), lang: body.lang === 'ar' ? 'ar' : 'en',
        functions: Array.isArray(body.functions) ? body.functions.slice(0, 10).filter(f => typeof f === 'string').map(f => f.slice(0, 20)) : [] } });
      // The request stands even if the email fails: it is in Ahmed's /owner/apex queue either way.
      let emailed = true;
      try { await email({ env, fetcher, idempotencyKey: `apex-${request.id}`, failure: 'apex_email_failed', message: apexEmail(request) }); }
      catch (error) { emailed = false; console.error('[apex] request saved but email failed:', error.code || error.message); }
      return send(res, 200, { ok: true, received: true, emailed });
    } catch (error) {
      const reason = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'apex_unavailable';
      return send(res, error?.status && error.status < 600 ? error.status : 503, { ok: false, reason });
    }
  };
}
