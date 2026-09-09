// GET /api/keepalive — daily cron that keeps the Supabase project from pausing.
//
// Supabase pauses FREE-TIER projects after 7 days of inactivity, where activity
// means real requests against the project. Until this existed, the only traffic
// to this database was Layla's chat — so a single quiet week would pause the
// project and break the chat silently, with no deploy and no code change to
// point at. That is a bad failure: it looks like the backend died again.
//
// This is a MITIGATION, not a guarantee. Supabase can change how inactivity is
// measured, and the free tier also has no backups — which matters more as real
// conversations accumulate. The actual fix is Supabase Pro; this buys time.
//
// Scheduled from vercel.json `crons`. Vercel runs cron only against Production
// deployments and, on Hobby, at most once a day — ample for a 7-day window.

import { fetchWithTimeout, httpError } from './_lib/fetch.js';
import { send } from './_lib/http.js';

const TIMEOUT_MS = 5000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false, reason: 'method' });
  }

  // Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
  // Without this the endpoint is an open door to a database round trip.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return send(res, 401, { ok: false, reason: 'unauthorized' });
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return send(res, 500, { ok: false, reason: 'not_configured' });
  }

  try {
    // A real query, not a health-check ping: the point is to touch the database
    // itself, since that is what "activity" has to mean to count.
    const r = await fetchWithTimeout(
      `${url.replace(/\/+$/, '')}/rest/v1/web_conversations?select=id&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      { label: 'Supabase keepalive', timeoutMs: TIMEOUT_MS },
    );
    if (!r.ok) {
      console.error('[keepalive]', (await httpError('Supabase keepalive', r)).message);
      return send(res, 502, { ok: false, reason: 'query_failed', status: r.status });
    }
    await r.json();
    console.log('[keepalive] ok');
    return send(res, 200, { ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error('[keepalive] error:', err?.message || err);
    return send(res, 502, { ok: false, reason: 'query_failed' });
  }
}
