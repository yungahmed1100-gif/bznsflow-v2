// Signed links and webhook checks for Rasil. Server only.
//
// Unsubscribe and confirmation links carry a subscriber id and an HMAC, so they work with
// no sign-in and cannot be forged or pointed at another subscriber. The key is derived from
// CONVEX_SERVICE_SECRET, which every Green deployment already has, so the links keep working
// without a new secret to provision or lose.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { convexServiceSecret } from './green-config.js';

const SUBSCRIBER_ID = /^[A-Za-z0-9_-]{8,64}$/;
const KINDS = new Set(['unsubscribe', 'confirm']);

function linkKey(env) {
  const secret = convexServiceSecret(env);
  if (!secret) return null;
  return createHmac('sha256', secret).update('rasil-links-v1').digest();
}
const mac = (key, kind, id) => createHmac('sha256', key).update(`${kind}:${id}`).digest('base64url').slice(0, 32);

/** `<id>.<mac>`, or null when the deployment has no service secret. */
export function signLink(env, kind, id) {
  const key = linkKey(env);
  if (!key || !KINDS.has(kind) || !SUBSCRIBER_ID.test(id || '')) return null;
  return `${id}.${mac(key, kind, id)}`;
}

/** The subscriber id a token names, or null. */
export function verifyLink(env, kind, token) {
  const key = linkKey(env);
  const m = typeof token === 'string' && token.match(/^([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{32})$/);
  if (!key || !KINDS.has(kind) || !m) return null;
  const expected = Buffer.from(mac(key, kind, m[1]));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? m[1] : null;
}

const TOLERANCE_S = 300;

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over `id.timestamp.body`, keyed by the
 * base64 part of `whsec_…`, sent as space-separated `v1,<base64>` signatures.
 * @param {string} secret `RESEND_WEBHOOK_SECRET`
 * @param {Record<string, string|string[]|undefined>} headers
 * @param {string} raw the exact request body
 */
export function verifyWebhook(secret, headers, raw, now = Date.now()) {
  const header = name => { const v = headers?.[name]; return Array.isArray(v) ? v[0] : v; };
  const id = header('svix-id'), timestamp = header('svix-timestamp'), signatures = header('svix-signature');
  if (typeof secret !== 'string' || !secret.startsWith('whsec_') || !id || !/^\d{1,12}$/.test(timestamp || '') || !signatures || typeof raw !== 'string') return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_S) return false;
  let key;
  try { key = Buffer.from(secret.slice(6), 'base64'); } catch { return false; }
  if (!key.length) return false;
  const expected = Buffer.from(createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64'));
  return signatures.split(' ').some(part => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
