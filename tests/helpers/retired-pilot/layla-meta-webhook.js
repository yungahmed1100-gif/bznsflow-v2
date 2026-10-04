// Historical injected-store regression harness; never deployed.
import { settings, PilotError } from '../../../api/_lib/layla/config.js';
import { safeEqual } from '../../../api/_lib/cookies.js';
import { send, sendPilotError } from '../../../api/_lib/http.js';
import { createStore, transact } from '../../../api/_lib/layla/store.js';
import { accept } from '../../../api/_lib/layla/domain.js';
import { rawBody, signatureValid, parseEvents } from '../../../api/_lib/layla/webhook.js';
import { acceptOpen, runOpen } from '../../../api/_lib/layla/open-test.js';
import { waitUntil } from '@vercel/functions';
import { customerStore } from '../../../api/_lib/layla/customer-store.js';
import { routeCustomerEnvelope, persistCustomerEvents } from '../../../api/_lib/layla/customer-webhook.js';
import { ingestBlueEnvelope, messagingStore } from '../../../api/_lib/layla/blue-messaging.js';
import { convexConfigured } from '../../../api/_lib/convex.js';
import { isGreenConvexConfigured, isGreenRuntime } from '../../../api/_lib/green-config.js';
export const config = { api: { bodyParser: false } };
export function createHandler({ store = createStore(), configuration = settings, now = Date.now, env = process.env, fetcher = fetch, background = waitUntil, registry = customerStore({ env }), messaging = messagingStore({ env, fetcher }) } = {}) {
  return async (req, res) => {
    try {
      if (isGreenRuntime(env) || env.GREEN_CONVEX_CUTOVER === 'true') {
        const greenReady = env.GREEN_CONVEX_CUTOVER === 'true' && env.GREEN_DATA_MIGRATION_VERIFIED === 'true'
          && env.GREEN_STATE_PATHS_CONVEX === 'true' && isGreenConvexConfigured(env) && convexConfigured(env);
        if (req.method === 'GET') {
          const q = new URL(req.url, 'https://callback.invalid').searchParams;
          const challenge = q.get('hub.challenge'), verify = env.GREEN_WHATSAPP_VERIFY_TOKEN || '';
          if (!isGreenConvexConfigured(env) || !verify) throw new PilotError('webhook_configuration_missing',503);
          if (q.get('hub.mode') !== 'subscribe' || !safeEqual(q.get('hub.verify_token') || '', verify) || !challenge || challenge.length > 200) {
            throw new PilotError('verification_failed', 403);
          }
          res.status(200); res.setHeader('Content-Type','text/plain'); res.setHeader('Cache-Control','no-store');
          return res.end(challenge);
        }
        if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); throw new PilotError('method',405); }
        if (!greenReady) throw new PilotError('green_cutover_not_ready',503);
        const raw = await rawBody(req);
        if (!env.LAYLA_META_APP_SECRET) throw new PilotError('webhook_secret_missing',503);
        if (!signatureValid(raw, req.headers['x-hub-signature-256'], env.LAYLA_META_APP_SECRET)) throw new PilotError('signature',403);
        let envelope;
        try { envelope = JSON.parse(raw.toString('utf8')); } catch { throw new PilotError('invalid_json'); }
        if (envelope?.object !== 'whatsapp_business_account' || !Array.isArray(envelope.entry)) throw new PilotError('invalid_envelope');
        if (env.GREEN_WHATSAPP_ENABLED !== 'true') return send(res,200,{ok:true,ignored:true,messagingEnabled:false});
        await ingestBlueEnvelope(envelope,{store:messaging});
        return send(res,200,{ok:true,accepted:true});
      }
      // This legacy endpoint persists Supabase state. Stop before reading or
      // acknowledging events once Green cutover is requested, until the
      // Convex webhook adapter is installed and verified.
      if (env.GREEN_CONVEX_CUTOVER === 'true' || (env.VERCEL_ENV === 'production' && env.GREEN_CONVEX_CLOUD_URL)) return send(res,503,{ok:false,reason:'green_webhook_migration_required'});
      const c = configuration();
      if (req.method === 'GET') {
        const q = new URL(req.url, 'https://callback.invalid').searchParams;
        if (!c.verify || q.get('hub.mode') !== 'subscribe' || !safeEqual(q.get('hub.verify_token') || '', c.verify) || !q.get('hub.challenge')) throw new PilotError('verification_failed', 403);
        res.status(200); res.setHeader('Content-Type','text/plain'); res.setHeader('Cache-Control','no-store');
        return res.end(q.get('hub.challenge'));
      }
      if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); throw new PilotError('method', 405); }
      const raw = await rawBody(req);
      if (!c.secret) throw new PilotError('webhook_secret_missing', 503);
      if (!signatureValid(raw, req.headers['x-hub-signature-256'], c.secret)) throw new PilotError('signature', 403);
      if (!c.owner || !c.app) throw new PilotError('owner_or_app_configuration_missing', 503);
      const groups = env.LAYLA_CUSTOMER_ONBOARDING_ENABLED === 'true' ? await routeCustomerEnvelope(raw, c, registry, now()) : [{ integration: null, events: parseEvents(raw, c, now()) }];
      for (const group of groups.filter(g => g.integration)) await persistCustomerEvents(registry, group.integration, group.events);
      const events = groups.filter(g => !g.integration).flatMap(g => g.events);
      const open = await transact(store, c, s => {
        if (s.openTest) { acceptOpen(s, events, now()); return true; }
        accept(s, events, now()); return false;
      });
      send(res, 200, { ok: true, accepted: true });
      // Durable acceptance is complete. A bounded kick reduces latency; the
      // authenticated scheduler recovers pending work if this invocation dies.
      if (open) {
        try { background(runOpen({ store, configuration, env, now, fetcher }).catch(() => { console.warn('layla_open_worker_unavailable'); })); }
        catch { console.warn('layla_open_background_unavailable'); }
      }
      return;
    } catch (error) {
      return send(res, error instanceof PilotError ? error.status : 503, { ok: false, reason: error instanceof PilotError ? error.code : 'unavailable' });
    }
  };
}
export default createHandler();
