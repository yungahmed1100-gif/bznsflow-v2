import { PilotError } from './_lib/layla/config.js';
import { safeEqual } from './_lib/cookies.js';
import { send, sendPilotError } from './_lib/http.js';
import { rawBody, signatureValid } from './_lib/layla/webhook.js';
import { ingestBlueEnvelope, messagingStore } from './_lib/layla/blue-messaging.js';
import { greenDataReady, isGreenConvexConfigured } from './_lib/green-config.js';

export const config = { api: { bodyParser: false } };
export function createHandler({ env = process.env, fetcher = fetch, messaging = messagingStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (req.method === 'GET') {
        const q = new URL(req.url, 'https://callback.invalid').searchParams;
        const challenge = q.get('hub.challenge'), verify = env.GREEN_WHATSAPP_VERIFY_TOKEN || '';
        if (!isGreenConvexConfigured(env) || !verify) throw new PilotError('webhook_configuration_missing', 503);
        if (q.get('hub.mode') !== 'subscribe' || !safeEqual(q.get('hub.verify_token') || '', verify) || !challenge || challenge.length > 200) {
          throw new PilotError('verification_failed', 403);
        }
        res.status(200);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        return res.end(challenge);
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw new PilotError('method', 405); }
      if (!greenDataReady(env)) throw new PilotError('green_cutover_not_ready', 503);
      const raw = await rawBody(req);
      if (!env.LAYLA_META_APP_SECRET) throw new PilotError('webhook_secret_missing', 503);
      if (!signatureValid(raw, req.headers['x-hub-signature-256'], env.LAYLA_META_APP_SECRET)) throw new PilotError('signature', 403);
      let envelope;
      try { envelope = JSON.parse(raw.toString('utf8')); } catch { throw new PilotError('invalid_json'); }
      if (envelope?.object !== 'whatsapp_business_account' || !Array.isArray(envelope.entry)) throw new PilotError('invalid_envelope');
      // Ingress is durable even when outbound sending is paused. The worker and
      // Convex send gates control sending independently of webhook acceptance.
      await ingestBlueEnvelope(envelope, { store: messaging, sendingEnabled: env.GREEN_WHATSAPP_ENABLED === 'true' });
      return send(res, 200, { ok: true, accepted: true });
    } catch (error) {
      return sendPilotError(res, error, { fallback: 'unavailable' });
    }
  };
}
export default createHandler();
