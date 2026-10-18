import { billingStore } from './_lib/convex.js';
import { send, sendPilotError } from './_lib/http.js';
import { PilotError } from './_lib/layla/config.js';
import { rawBody } from './_lib/layla/webhook.js';
import { paymobConfig, transactionHmacValid } from './_lib/paymob.js';

export const config = { api: { bodyParser: false } };

// Paymob's processed callback. Access changes only after the HMAC verifies and Convex matches the
// transaction to a pending payment of the same amount and currency.
const int = x => Number.isSafeInteger(x) ? x : undefined;
// Refusals Paymob cannot fix by retrying: acknowledge so it stops, and log for Ahmed to reconcile.
const SETTLED_REFUSALS = ['unknown_payment', 'already_paid', 'amount_mismatch', 'invalid_state'];

export function transactionArgs(obj) {
  const args = {
    reference: typeof obj.order?.merchant_order_id === 'string' ? obj.order.merchant_order_id : undefined,
    orderId: int(obj.order?.id), transactionId: int(obj.id),
    success: obj.success === true, pending: obj.pending === true,
    // A refund or void arrives as its own transaction pointing at the original payment.
    child: obj.has_parent_transaction === true || obj.is_refunded === true || obj.is_voided === true,
    amount: int(obj.amount_cents), currency: typeof obj.currency === 'string' ? obj.currency : undefined,
  };
  return Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
}

export function createPaymobWebhook({ env = process.env, fetcher = fetch, store = billingStore({ env, fetcher }) } = {}) {
  return async function handler(req, res) {
    let obj = null;
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new PilotError('method', 405); }
      const settings = paymobConfig(env);
      const raw = await rawBody(req);
      let body;
      try { body = JSON.parse(raw.toString('utf8')); } catch { throw new PilotError('invalid_json', 400); }
      // Saved-card token callbacks share this URL; they grant nothing.
      if (body?.type !== 'TRANSACTION') return send(res, 200, { ok: true, applied: false });
      obj = body.obj;
      const hmac = new URL(req.url, 'https://callback.invalid').searchParams.get('hmac') || '';
      if (!transactionHmacValid(obj, hmac, settings.hmacSecret)) throw new PilotError('signature', 401);
      const result = await store('transaction', transactionArgs(obj));
      return send(res, 200, { ok: true, applied: !!result?.applied });
    } catch (error) {
      if (error instanceof PilotError && SETTLED_REFUSALS.includes(error.code)) {
        console.error('[paymob-webhook] transaction %s not applied: %s', int(obj?.id) ?? 'unknown', error.code);
        return send(res, 200, { ok: true, applied: false, reason: error.code });
      }
      return sendPilotError(res, error, { fallback: 'payment_unavailable' });
    }
  };
}

export default createPaymobWebhook();
