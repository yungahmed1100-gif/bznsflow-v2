// /api/lead?op=audit — the public free-audit booking (config/audit.js, convex/auditState.js).
// GET lists open times; POST books one and emails Ahmed. No session and no CSRF: like the lead form it
// grants nothing, so the origin check, a honeypot and per-IP metering bound abuse.
import { auditStore } from './convex.js';
import { checkRate } from './db.js';
import { clientIp, isAllowedOrigin } from './guard.js';
import { readBody, send } from './http.js';
import { sendEmail } from './resend.js';
import { auditEmail } from './audit-email.js';

const BOOKINGS_PER_MIN = 5;
const buckets = (ip, now) => ({ ip: `audit:ip:${ip}:${new Date(now).toISOString().slice(0, 16)}`, global: `audit:global:${new Date(now).toISOString().slice(0, 10)}` });

export function createAuditApi({ env = process.env, fetcher = fetch, store = auditStore({ env, fetcher }), rate = checkRate, email = sendEmail, now = Date.now } = {}) {
  return async function auditApi(req, res) {
    const method = String(req.method || '').toUpperCase();
    if (!['GET', 'POST'].includes(method)) { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { ok: false, reason: 'method' }); }
    if (!isAllowedOrigin(req)) return send(res, 403, { ok: false, reason: 'origin' });
    try {
      if (method === 'GET') return send(res, 200, { ok: true, ...(await store('slots')) });
      const at = now(), { ip, global } = buckets(clientIp(req), at);
      try {
        const hits = await rate(ip, global);
        if (Number(hits?.ip_hits || 0) > BOOKINGS_PER_MIN) return send(res, 429, { ok: false, reason: 'rate_ip' });
      } catch (error) { console.error('[audit] rate limit check failed, allowing:', error.message); }
      const body = readBody(req);
      if (!body || Array.isArray(body) || typeof body !== 'object') return send(res, 400, { ok: false, reason: 'invalid_body' });
      // A filled honeypot is a bot: answer as if booked, store nothing.
      if (typeof body.website === 'string' && body.website.trim()) return send(res, 200, { ok: true, booking: null });
      const pick = key => (typeof body[key] === 'string' ? body[key].slice(0, 600) : undefined);
      const { booking } = await store('book', { startAt: Number(body.startAt),
        booking: { name: pick('name'), email: pick('email'), phone: pick('phone'), business: pick('business'), industry: pick('industry'), note: pick('note'), lang: body.lang === 'ar' ? 'ar' : 'en' } });
      // The booking stands even if the email fails: it is in Ahmed's Audits tab either way.
      let emailed = true;
      try { await email({ env, fetcher, idempotencyKey: `audit-${booking.id}`, failure: 'audit_email_failed', message: auditEmail(booking, at) }); }
      catch (error) { emailed = false; console.error('[audit] booking saved but email failed:', error.code || error.message); }
      return send(res, 200, { ok: true, booking: { startAt: booking.startAt }, emailed });
    } catch (error) {
      const reason = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'audit_unavailable';
      return send(res, error?.status && error.status < 600 ? error.status : 503, { ok: false, reason });
    }
  };
}
