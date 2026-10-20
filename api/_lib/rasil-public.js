// Rasil's server-side work that no owner session is present for: sending each campaign email,
// Resend's delivery events, and the links a subscriber clicks (unsubscribe, confirm, sign up).
// Unsubscribe and confirm work whatever switch is set: a person can always leave a list.
import { randomUUID } from 'node:crypto';
import { rasilWorkerStore } from './convex.js';
import { readBody, send } from './http.js';
import { PilotError } from './layla/config.js';
import { signLink, verifyLink, verifyWebhook } from './rasil-sign.js';
import { sendCampaignEmail } from './rasil-resend.js';
import { renderEmail, validEmail } from '../../config/rasil.js';

const origin = env => env.PUBLIC_SITE_ORIGIN || 'https://www.bznsflowai.com';
export const unsubscribeUrl = (env, token) => `${origin(env)}/email/unsubscribe?t=${encodeURIComponent(token)}`;
const confirmUrl = (env, token) => `${origin(env)}/email/confirm?t=${encodeURIComponent(token)}`;
const from = sender => `"${sender.fromName}" <${sender.fromLocal}@${sender.domain}>`;

/** One campaign email: claim, render, send with a per-recipient idempotency key, record the outcome. */
export async function runRasilSend({ jobId, env, fetcher = fetch, store = rasilWorkerStore({ env, fetcher }) }) {
  const job = await store('claim', { jobId, intent: randomUUID() });
  if (!job) return { processed: false };
  const token = signLink(env, 'unsubscribe', job.subscriberId);
  let outcome;
  if (!token) outcome = { status: 'failed', reason: 'email_unavailable', campaignBlock: 'email_unavailable' };
  else {
    const link = unsubscribeUrl(env, token);
    const email = renderEmail({ subject: job.subject, body: job.body, name: job.name, business: job.business.name, address: job.business.address, unsubscribeUrl: link, lang: job.lang });
    outcome = await sendCampaignEmail({ env, fetcher, idempotencyKey: `rasil/${job.jobId}`, message: {
      from: from(job.sender), to: [job.to], subject: email.subject, html: email.html, text: email.text, ...(job.sender.replyTo ? { reply_to: job.sender.replyTo } : {}),
      headers: { 'List-Unsubscribe': `<${link}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }, tags: [{ name: 'source', value: 'rasil' }] } });
  }
  await store('result', { jobId: job.jobId, intent: job.intent, ...outcome });
  return { processed: true, status: outcome.status };
}

const EVENTS = new Set(['email.delivered', 'email.bounced', 'email.complained', 'email.opened', 'email.clicked']);
/** Resend's webhook. Every event for the account arrives here; ones that are not Rasil's match nothing. */
export function createRasilWebhook({ env = process.env, fetcher = fetch, store = rasilWorkerStore({ env, fetcher }), raw: readRaw }) {
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, reason: 'method' }); }
    const raw = (await readRaw(req)).toString('utf8');
    if (!verifyWebhook(env.RESEND_WEBHOOK_SECRET, req.headers, raw)) return send(res, 401, { ok: false, reason: 'signature' });
    let event;
    try { event = JSON.parse(raw); } catch { return send(res, 400, { ok: false, reason: 'invalid_json' }); }
    const providerId = event?.data?.email_id;
    if (!EVENTS.has(event?.type) || typeof providerId !== 'string' || providerId.length > 80) return send(res, 200, { ok: true, applied: false });
    try {
      await store('event', { type: event.type, providerId, ...(typeof event.data.bounce?.type === 'string' ? { bounceType: event.data.bounce.type.slice(0, 20) } : {}) });
    } catch { return send(res, 503, { ok: false, reason: 'email_unavailable' }); } // Resend retries
    return send(res, 200, { ok: true, applied: true });
  };
}

// --- Pages a subscriber sees -------------------------------------------------------------
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function page(res, status, { title, body, action, button }) {
  const html = `<!doctype html><html lang="ar" dir="auto"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">`
    + `<title>${escape(title)}</title></head><body style="margin:0;background:#f6efdf;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">`
    + `<main style="max-width:520px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #d9d0bb;border-radius:6px"><h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>`
    + body.map(p => `<p style="margin:0 0 12px;line-height:1.6">${escape(p)}</p>`).join('')
    + (action ? `<form method="post" action="${escape(action)}"><button type="submit" style="font:inherit;font-weight:700;padding:10px 18px;background:#1a1a1a;color:#f6efdf;border:0;border-radius:4px;cursor:pointer">${escape(button)}</button></form>` : '')
    + '</main></body></html>';
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.end(html);
}
const tokenOf = req => new URL(req.url || '/', 'https://x.invalid').searchParams.get('t') || '';
const both = (en, ar) => [ar, en];

/** /email/unsubscribe?t=…: GET asks (link scanners must not unsubscribe anyone); POST, including one-click from the mail app, does it. */
export function createUnsubscribe({ env = process.env, fetcher = fetch, store = rasilWorkerStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    const token = tokenOf(req);
    const subscriberId = verifyLink(env, 'unsubscribe', token);
    if (!subscriberId) return page(res, 400, { title: 'الرابط غير صالح · Link not valid', body: both('This unsubscribe link is not valid. Use the link in the latest email you received.', 'رابط إلغاء الاشتراك هذا غير صالح. استخدم الرابط في آخر رسالة وصلتك.') });
    const action = `/email/unsubscribe?t=${encodeURIComponent(token)}`;
    if (req.method === 'GET') return page(res, 200, { title: 'إلغاء الاشتراك · Unsubscribe', body: both('Stop receiving these emails?', 'هل تريد التوقف عن استلام هذه الرسائل؟'), action, button: 'إلغاء الاشتراك · Unsubscribe' });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return page(res, 405, { title: 'Method not allowed', body: [] }); }
    let business = '';
    try { business = (await store('unsubscribe', { subscriberId }))?.business || ''; } catch (e) {
      if (!(e instanceof PilotError && e.code === 'subscriber_not_found')) return page(res, 503, { title: 'حاول مجدداً · Try again', body: both('We could not record that right now. Please try again in a minute.', 'تعذّر تسجيل ذلك الآن. حاول مجدداً بعد دقيقة.'), action, button: 'إلغاء الاشتراك · Unsubscribe' });
    }
    return page(res, 200, { title: 'تم إلغاء اشتراكك · You are unsubscribed', body: both(`You will not receive marketing emails${business ? ` from ${business}` : ''} again.`, `لن تصلك رسائل تسويقية${business ? ` من ${business}` : ''} بعد الآن.`) });
  };
}

/** /email/confirm?t=…: the second step of the website sign-up. */
export function createConfirm({ env = process.env, fetcher = fetch, store = rasilWorkerStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    const token = tokenOf(req);
    const subscriberId = verifyLink(env, 'confirm', token);
    if (!subscriberId) return page(res, 400, { title: 'الرابط غير صالح · Link not valid', body: both('This confirmation link is not valid.', 'رابط التأكيد هذا غير صالح.') });
    const action = `/email/confirm?t=${encodeURIComponent(token)}`;
    if (req.method === 'GET') return page(res, 200, { title: 'تأكيد الاشتراك · Confirm your subscription', body: both('Confirm that you want to receive emails.', 'أكّد رغبتك في استلام الرسائل.'), action, button: 'تأكيد · Confirm' });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return page(res, 405, { title: 'Method not allowed', body: [] }); }
    let result;
    try { result = await store('subscribe_confirm', { subscriberId }); } catch {
      return page(res, 503, { title: 'حاول مجدداً · Try again', body: both('We could not confirm that right now. Please try again in a minute.', 'تعذّر التأكيد الآن. حاول مجدداً بعد دقيقة.'), action, button: 'تأكيد · Confirm' });
    }
    if (result?.status !== 'subscribed') return page(res, 200, { title: 'لم يُفعَّل الاشتراك · Not subscribed', body: both('This address has left the list. Sign up again on the website to rejoin.', 'غادر هذا العنوان القائمة. اشترك مجدداً من الموقع للعودة.') });
    return page(res, 200, { title: 'تم الاشتراك · You are subscribed', body: both(`You will receive emails from ${result.business}. Every email has a link to unsubscribe.`, `ستصلك رسائل ${result.business}. في كل رسالة رابط لإلغاء الاشتراك.`) });
  };
}

const CONFIRM_TEXT = {
  en: (b, url) => ({ subject: `Confirm your subscription to ${b}`, body: `Hello {{name}},\n\nSomeone asked to receive emails from ${b} at this address. If it was you, confirm here:\n${url}\n\nIf it was not you, ignore this email and nothing will be sent.` }),
  ar: (b, url) => ({ subject: `أكّد اشتراكك في رسائل ${b}`, body: `أهلاً {{name}}،\n\nطلب أحدهم استلام رسائل ${b} على هذا العنوان. إن كنت أنت، فأكّد من هنا:\n${url}\n\nإن لم تكن أنت، فتجاهل هذه الرسالة ولن يُرسل إليك شيء.` }),
};

/**
 * /email/subscribe: the sign-up form on the owner's website (the free Ascend site or their own).
 * A plain HTML form or a fetch; the answer is the same whether the address was known or not.
 */
export function createSubscribe({ env = process.env, fetcher = fetch, store = rasilWorkerStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.status(204); return res.end(); }
    const body = readBody(req);
    const html = !String(req.headers?.['content-type'] || '').includes('application/json');
    const lang = body?.lang === 'en' ? 'en' : 'ar';
    const done = () => html
      ? page(res, 200, { title: lang === 'en' ? 'Check your inbox' : 'تحقّق من بريدك', body: lang === 'en' ? ['If the address is right, a confirmation email is on its way. You are subscribed once you confirm.'] : ['إن كان العنوان صحيحاً فرسالة التأكيد في طريقها إليك. يبدأ اشتراكك بعد التأكيد.'] })
      : send(res, 200, { ok: true });
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return send(res, 405, { ok: false, reason: 'method' }); }
    // A filled hidden field is a bot. It gets the normal answer and nothing else.
    if (typeof body?.website === 'string' && body.website) return done();
    if (!validEmail(body?.email) || !/^[A-Za-z0-9_-]{16,40}$/.test(body?.k || '')) return html ? page(res, 400, { title: lang === 'en' ? 'Check the address' : 'تحقّق من العنوان', body: [lang === 'en' ? 'Enter a valid email address.' : 'أدخل بريداً إلكترونياً صحيحاً.'] }) : send(res, 400, { ok: false, reason: 'invalid_email' });
    let request;
    try { request = await store('subscribe_request', { formKey: body.k, email: body.email, name: typeof body.name === 'string' ? body.name.slice(0, 80) : '', lang }); }
    catch (e) {
      if (e instanceof PilotError && e.code === 'too_many') return send(res, 429, { ok: false, reason: 'too_many' });
      if (e instanceof PilotError && e.code === 'invalid_email') return send(res, 400, { ok: false, reason: 'invalid_email' });
      return send(res, 503, { ok: false, reason: 'email_unavailable' });
    }
    const token = request?.send && signLink(env, 'confirm', request.subscriberId);
    if (token) {
      const text = CONFIRM_TEXT[request.lang](request.business.name, confirmUrl(env, token));
      const email = renderEmail({ ...text, name: request.name, business: request.business.name, address: request.business.address, unsubscribeUrl: unsubscribeUrl(env, signLink(env, 'unsubscribe', request.subscriberId)), lang: request.lang });
      // A failed confirmation email leaves the address pending; the person can submit the form again.
      await sendCampaignEmail({ env, fetcher, idempotencyKey: `rasil-confirm/${request.subscriberId}/${randomUUID()}`,
        message: { from: from(request.sender), to: [request.email], subject: email.subject, html: email.html, text: email.text, ...(request.sender.replyTo ? { reply_to: request.sender.replyTo } : {}), tags: [{ name: 'source', value: 'rasil-confirm' }] } });
    }
    return done();
  };
}
