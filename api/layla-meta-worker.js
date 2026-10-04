import { createBlueWorker } from './_lib/layla/blue-messaging.js';
import { send } from './_lib/http.js';
import { greenDataReady } from './_lib/green-config.js';

export function createHandler({ env = process.env, ...options } = {}) {
  const worker = createBlueWorker({ env, ...options });
  return (req, res) => {
    if (!greenDataReady(env)) return send(res, 503, { ok: false, reason: 'green_cutover_not_ready' });
    return worker(req, res);
  };
}
export default createHandler();
