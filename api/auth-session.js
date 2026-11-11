import { createBlueAuthHandler } from './_lib/blue-auth.js';
import { deadlineFor, withDeadline } from './_lib/deadline.js';

async function handler(req, res) {
  return createBlueAuthHandler()(req, res, 'session');
}

// vercel.json maxDuration is 30 s; answer before the platform stops this function.
export const DEADLINE_MS = deadlineFor(30);
export default withDeadline(handler, { ms: DEADLINE_MS, label: 'auth-session' });
