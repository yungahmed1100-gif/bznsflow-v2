import { PilotError } from './_lib/layla/config.js';
import { safeEqual } from './_lib/cookies.js';
import { send, sendPilotError } from './_lib/http.js';
import { rawBody, signatureValid } from './_lib/layla/webhook.js';
import { ingestBlueEnvelope, ingestInstagramEnvelope, messagingStore } from './_lib/layla/blue-messaging.js';
import { instagramConfig } from './_lib/layla/instagram.js';
import { greenDataReady, instagramMessagingEnabled, isGreenConvexConfigured } from './_lib/green-config.js';

export const config = { api: { bodyParser: false } };

// One URL serves both channels; the payload's own `object` decides the route.
// WhatsApp payloads must carry the parent app's signature. Instagram Login webhooks
// are signed with the Instagram app's secret (or the parent's, depending on where
// Meta saved the subscription), never with anything else.
function secretsFor(env) {
  let instagram = [];
  try { instagram = [instagramConfig(env, false).secret]; } catch { /* Instagram not configured: WhatsApp only */ }
  return { whatsapp: [env.LAYLA_META_APP_SECRET].filter(Boolean), instagram: [...instagram, env.LAYLA_META_APP_SECRET].filter(Boolean) };
}

export function createHandler({ env = process.env, fetcher = fetch, messaging = messagingStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (req.method === 'GET') {
        const q = new URL(req.url, 'https://callback.invalid').searchParams;
        const challenge = q.get('hub.challenge'), given = q.get('hub.verify_token') || '';
        const tokens = [env.GREEN_WHATSAPP_VERIFY_TOKEN, env.GREEN_INSTAGRAM_VERIFY_TOKEN].filter(Boolean);
        if (!isGreenConvexConfigured(env) || !tokens.length) throw new PilotError('webhook_configuration_missing', 503);
        if (q.get('hub.mode') !== 'subscribe' || !tokens.some(token => safeEqual(given, token)) || !challenge || challenge.length > 200) {
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
      const secrets = secretsFor(env);
      if (!secrets.whatsapp.length) throw new PilotError('webhook_secret_missing', 503);
      const signedBy = channel => secrets[channel].some(secret => signatureValid(raw, req.headers['x-hub-signature-256'], secret));
      if (!signedBy('whatsapp') && !signedBy('instagram')) throw new PilotError('signature', 403);
      let envelope;
      try { envelope = JSON.parse(raw.toString('utf8')); } catch { throw new PilotError('invalid_json'); }
      // Ingress is durable even when outbound sending is paused. The worker and
      // Convex send gates control sending independently of webhook acceptance.
      if (envelope?.object === 'instagram') {
        if (!signedBy('instagram')) throw new PilotError('signature', 403);
        await ingestInstagramEnvelope(envelope, { store: messaging, app: instagramConfig(env, false).app, env, fetcher, suppressAutomation: !instagramMessagingEnabled(env) });
        return send(res, 200, { ok: true, accepted: true });
      }
      if (!signedBy('whatsapp')) throw new PilotError('signature', 403);
      if (envelope?.object !== 'whatsapp_business_account' || !Array.isArray(envelope.entry)) throw new PilotError('invalid_envelope');
      await ingestBlueEnvelope(envelope, { store: messaging, sendingEnabled: env.GREEN_WHATSAPP_ENABLED === 'true' });
      return send(res, 200, { ok: true, accepted: true });
    } catch (error) {
      return sendPilotError(res, error, { fallback: 'unavailable' });
    }
  };
}
export default createHandler();
