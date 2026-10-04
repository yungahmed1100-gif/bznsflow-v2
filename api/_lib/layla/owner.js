import { hashToken } from '../auth.js';
import { parseCookies, SESSION_COOKIE, verifyCsrf } from '../cookies.js';
import { getSession } from '../db.js';
import { blueAuthStore, hashAccountToken, BLUE_ACCOUNT_COOKIE } from '../blue-auth.js';
import { convexConfigured } from '../convex.js';
import { PilotError } from './config.js';
export async function owner(req, c, sessionLookup) {
  const convexAuth = !sessionLookup && convexConfigured();
  const token = parseCookies(req)[convexAuth ? BLUE_ACCOUNT_COOKIE : SESSION_COOKIE];
  if (!token) throw new PilotError('sign_in_required', 401);
  if (!c.owner) throw new PilotError('owner_configuration_missing', 503);
  let session;
  try {
    session = convexAuth
      ? await blueAuthStore()('session', { tokenHash: hashAccountToken(token) })
      : await (sessionLookup || getSession)(hashToken(token));
  } catch { throw new PilotError('session_unavailable', 503); }
  if (convexAuth ? !session : !session?.ok) throw new PilotError('sign_in_required', 401);
  if (convexAuth ? session.email?.toLowerCase() !== 'ahmed@bznsflowai.com' : session.account?.id !== c.owner) throw new PilotError('owner_only', 403);
  if (req.method !== 'GET') {
    // Strict same-origin for this privileged surface; shared public-chat allowlists do not apply.
    let origin;
    try { origin = new URL(req.headers?.origin); } catch { throw new PilotError('origin', 403); }
    if (origin.host !== req.headers?.host || !['https:','http:'].includes(origin.protocol)) throw new PilotError('origin', 403);
    if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new PilotError('origin', 403);
    if (!verifyCsrf(req)) throw new PilotError('csrf', 403);
  }
  return convexAuth ? { id: session.id, email: session.email } : session.account;
}
