import { createHash, randomUUID } from 'node:crypto';
import { billingStore } from './_lib/convex.js';
import { parseCookies, verifyCsrf } from './_lib/cookies.js';
import { appUrl } from './_lib/green-config.js';
import { isAllowedOrigin } from './_lib/guard.js';
import { readBody, send, sendPilotError } from './_lib/http.js';
import { PilotError } from './_lib/layla/config.js';
import { createIntention, paymentsOpen, paymobConfig } from './_lib/paymob.js';
import { billingPrice } from '../config/billing-plans.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const ITEM = { catalyst: 'BznsFlow Catalyst', ascend: 'BznsFlow Ascend' };
const TERM = { monthly: '1 month', yearly: '12 months' };

// POST { plan: 'catalyst' | 'ascend', interval: 'monthly' | 'yearly', packId?, lang } → { url } on Paymob's hosted checkout.
// Ascend names one live industry pack; Convex checks it.
// The amount comes from config/billing-plans.js through Convex, never from the request.
export function createCheckout({ env = process.env, fetcher = fetch, store = billingStore({ env, fetcher }) } = {}) {
  return async function handler(req, res) {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new PilotError('method', 405); }
      if (!isAllowedOrigin(req)) throw new PilotError('origin', 403);
      const token = parseCookies(req).bf_session;
      if (!/^[a-f0-9]{64}$/.test(token || '')) throw new PilotError('sign_in_required', 401);
      if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
      const body = readBody(req);
      const plan = body.plan === undefined ? 'catalyst' : body.plan;
      if (!billingPrice(plan, body.interval)) throw new PilotError('invalid_interval', 400);
      if (body.packId !== undefined && (typeof body.packId !== 'string' || body.packId.length > 40)) throw new PilotError('invalid_pack', 400);
      const config = paymobConfig(env);
      const reference = randomUUID();
      const payment = await store('checkout', { tokenHash: hash(token), reference, plan, interval: body.interval, ...(body.packId !== undefined ? { packId: body.packId } : {}) });
      // Test keys take test cards: only the listed testers may use them. The pending row stays unpaid.
      if (!paymentsOpen(env, payment.email)) throw new PilotError('payments_closed', 403);
      const [first, ...rest] = String(payment.name || '').trim().split(/\s+/);
      const { url, orderId } = await createIntention(config, {
        amount: payment.amount, currency: payment.currency, reference, item: `${ITEM[plan]}, ${TERM[body.interval]}`,
        billing: { first_name: first || 'Customer', last_name: rest.join(' ') || 'NA', email: payment.email, phone_number: payment.phone || 'NA' },
        notificationUrl: appUrl('/api/paymob-webhook', env),
        // No fragment: Paymob appends its result as query parameters.
        redirectionUrl: appUrl(`${body.lang === 'en' ? '/en' : '/'}?payment=return&plan=${plan}`, env),
      }, fetcher);
      // The order id is only a second way to match the callback, which carries our reference;
      // failing to store it must not cost the customer a checkout they can already complete.
      if (orderId) await store('opened', { reference, orderId }).catch(() => null);
      return send(res, 200, { ok: true, url }, { vary: 'Cookie' });
    } catch (error) {
      return sendPilotError(res, error, { fallback: 'payment_unavailable', vary: 'Cookie' });
    }
  };
}

export default createCheckout();
