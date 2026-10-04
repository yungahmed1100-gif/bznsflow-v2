import { send } from './_lib/http.js';

// Connection proof is returned by the authenticated Convex customer surface.
export default function handler(_req, res) {
  return send(res, 410, { ok: false, reason: 'pilot_retired' });
}
