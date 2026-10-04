import { send } from './_lib/http.js';

export default function handler(_req, res) {
  return send(res, 410, { ok: false, reason: 'keepalive_retired' });
}
