import { createBlueAuthHandler } from './_lib/blue-auth.js';
import { deadlineFor, withDeadline } from './_lib/deadline.js';

export const RATE_IP_PER_MIN = 5;
export const RATE_GLOBAL_PER_DAY = 300;

async function handler(req, res) {
  return createBlueAuthHandler()(req, res, 'code');
}

// vercel.json maxDuration is 30 s; answer before the platform stops this function.
export const DEADLINE_MS = deadlineFor(30);
export default withDeadline(handler, { ms: DEADLINE_MS, label: 'auth-code' });
