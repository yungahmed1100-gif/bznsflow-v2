import { createBlueWorker } from './_lib/layla/blue-messaging.js';
import { send } from './_lib/http.js';
import { greenDataReady } from './_lib/green-config.js';
import { deadlineFor, withDeadline } from './_lib/deadline.js';

// vercel.json maxDuration is 60 s.
export const DEADLINE_MS = deadlineFor(60);

export function createHandler({ env = process.env, ...options } = {}) {
  const worker = createBlueWorker({ env, ...options });
  return withDeadline((req, res) => {
    if (!greenDataReady(env)) return send(res, 503, { ok: false, reason: 'green_cutover_not_ready' });
    return worker(req, res);
  }, { ms: DEADLINE_MS, label: 'layla-meta-worker' });
}
export default createHandler();
