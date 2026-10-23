// Paymob (Oman) Intention API and callback verification.
//
// One intention per checkout: the server names the amount from config/billing-plans.js, Paymob
// hosts the card page, and the only thing that changes access is the processed callback,
// after its HMAC verifies here and Convex matches it against the pending payment.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PilotError } from './layla/config.js';

/** @returns {{ base: string, secretKey: string, publicKey: string, hmacSecret: string, integrationIds: number[] }} */
export function paymobConfig(env = process.env) {
  let base;
  try { base = new URL(env.PAYMOB_BASE_URL || 'https://oman.paymob.com'); } catch { throw new PilotError('payment_unavailable', 503); }
  const integrationIds = String(env.PAYMOB_INTEGRATION_IDS || '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.paymob.com') || base.pathname !== '/'
    || !env.PAYMOB_SECRET_KEY || !env.PAYMOB_PUBLIC_KEY || !env.PAYMOB_HMAC_SECRET
    || !integrationIds.length || !integrationIds.every(Number.isSafeInteger)) throw new PilotError('payment_unavailable', 503);
  return { base: base.origin, secretKey: env.PAYMOB_SECRET_KEY, publicKey: env.PAYMOB_PUBLIC_KEY, hmacSecret: env.PAYMOB_HMAC_SECRET, integrationIds };
}

/**
 * Whether this account may pay online. Live keys open checkout to everyone; test keys (omn_sk_test_…)
 * only to the addresses in PAYMOB_TEST_EMAILS, so production can be tested end to end with Paymob's
 * test cards without letting the public "pay" with them. Unconfigured means closed.
 */
export function paymentsOpen(env = process.env, email = '') {
  try { paymobConfig(env); } catch { return false; }
  if (!/_test_/.test(env.PAYMOB_SECRET_KEY)) return true;
  const testers = String(env.PAYMOB_TEST_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return testers.includes(String(email).trim().toLowerCase());
}

/**
 * Create a payment intention and return where to send the customer.
 * `redirect: 'error'` keeps the secret key from following a redirect off Paymob.
 */
export async function createIntention(config, { amount, currency, reference, billing, item, notificationUrl, redirectionUrl }, fetcher = fetch) {
  let response, body;
  try {
    response = await fetcher(`${config.base}/v1/intention/`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Token ${config.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount, currency, payment_methods: config.integrationIds,
        items: [{ name: item, amount, quantity: 1 }],
        billing_data: billing,
        special_reference: reference,
        notification_url: notificationUrl,
        redirection_url: redirectionUrl,
      }),
    });
    body = /** @type {{ client_secret?: string, intention_order_id?: number }} */ (await response.json());
  } catch { throw new PilotError('payment_unavailable', 502); }
  if (!response.ok || typeof body?.client_secret !== 'string' || !body.client_secret) throw new PilotError('payment_unavailable', 502);
  const url = new URL('/unifiedcheckout/', config.base);
  url.searchParams.set('publicKey', config.publicKey);
  url.searchParams.set('clientSecret', body.client_secret);
  return { url: url.toString(), orderId: Number.isSafeInteger(body.intention_order_id) ? body.intention_order_id : null };
}

// The processed-callback fields Paymob signs, in Paymob's order (developers.paymob.com, HMAC Transaction Callback).
const SIGNED_FIELDS = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
  'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];

const field = (obj, path) => path.split('.').reduce((value, key) => value?.[key], obj);

/** The signed string for one transaction object: values concatenated, booleans as true/false, missing as empty. */
export function transactionString(obj) {
  return SIGNED_FIELDS.map(path => field(obj, path) ?? '').map(String).join('');
}

export function transactionHmacValid(obj, hmac, secret) {
  if (!secret || !obj || typeof obj !== 'object' || typeof hmac !== 'string' || !/^[a-f0-9]{128}$/i.test(hmac)) return false;
  return timingSafeEqual(createHmac('sha512', secret).update(transactionString(obj)).digest(), Buffer.from(hmac, 'hex'));
}
