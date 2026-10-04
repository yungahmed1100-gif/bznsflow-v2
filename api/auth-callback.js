// /api/auth-callback — finish a social sign-in.
//
// The provider sends the browser here with ?code and ?state. This handler
// checks the state, redeems the code, verifies the ID token, resolves it to an
// account, sets bf_session, and redirects back to /signin.
//
// WHY IT REDIRECTS RATHER THAN RENDERS: SignIn.jsx already asks
// GET /api/auth-session on mount and routes to `profile` or `done` from the
// answer. Landing back on that page means a social sign-in reaches the exact
// same two outcomes as an emailed code, through the same code, and the CRM push
// in auth-session's PATCH still fires unchanged. There is no second copy of the
// "where does this person go next" decision.
//
// Order of operations mirrors api/auth-code.js: cheap local checks first, then
// the rate limit (fail closed), then anything that costs a network round trip.

import { createHmac } from 'node:crypto';
import { clientIp } from './_lib/guard.js';
import {
  readOauthCookie, clearOauthCookie, safeEqual, randomToken,
  setSessionCookie, SESSION_MAX_AGE,
} from './_lib/cookies.js';
import {
  providerFor, isProviderEnabled, exchangeCode, verifyIdToken,
  resolveIdentity, redirectUriFor, signinPath,
} from './_lib/oidc.js';
import { hashToken } from './_lib/auth.js';
import { blueAuthStore } from './_lib/blue-auth.js';
import { convexServiceSecret } from './_lib/green-config.js';
import { send, redirect } from './_lib/http.js';

// A completed round trip costs the visitor a consent screen, so the per-IP
// allowance is looser than sending codes — but still bounded, because this is
// the endpoint that mints sessions. Matches VERIFY_IP_MULTIPLIER in
// api/auth-session.js, and for the same reason.
export default async function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false, reason: 'method' });
  }

  const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);

  // Read the stash and drop it immediately. Single-use: whatever happens below,
  // this attempt is spent, and a cookie left behind is a replayable one.
  const stash = readOauthCookie(req);
  clearOauthCookie(res);

  const lang = stash?.l === 'en' ? 'en' : 'ar';
  const back = (reason) => redirect(
    res,
    reason ? `${signinPath(lang)}?e=${encodeURIComponent(reason)}` : signinPath(lang),
  );

  // The provider refused or the visitor pressed Cancel. `access_denied` is the
  // ordinary "changed my mind" case and is not worth a log line.
  const providerError = url.searchParams.get('error');
  if (providerError) {
    if (providerError !== 'access_denied') {
      console.warn('[auth-callback] provider returned %s: %s',
        providerError, url.searchParams.get('error_description') || '');
    }
    return back(providerError === 'access_denied' ? 'cancelled' : 'provider');
  }

  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  // No stash means the cookie expired, the visitor took longer than ten
  // minutes, or they opened the callback directly. All the same to them:
  // start again.
  if (!stash || !code || !state) return back('expired');

  // The login-CSRF check. Constant-time because it is a secret comparison, and
  // because there is exactly one safeEqual in this codebase for a reason.
  if (!safeEqual(state, stash.s || '')) return back('state');

  const provider = providerFor(stash.p);
  if (!provider || !isProviderEnabled(provider)) return back('provider');

  const ipHash = createHmac('sha256', convexServiceSecret()).update(`oauth:${clientIp(req)}`).digest('hex');
  try {
    await blueAuthStore()('oauth_rate', { ipHash });
  } catch (err) {
    // Fail closed, as in auth-code.js and auth-session.js. This endpoint issues
    // sessions; running it with no ceiling is not a degraded mode worth having.
    console.error('[auth-callback] rate limit check failed, refusing:', err.message);
    return back('unavailable');
  }

  let identity;
  try {
    const tokens = await exchangeCode({
      provider,
      code,
      verifier: stash.v,
      redirectUri: redirectUriFor(req),
    });
    const claims = await verifyIdToken({
      provider,
      idToken: tokens?.id_token,
      nonce: stash.n,
    });
    // Falls back to the provider's userinfo endpoint only when the verified
    // token is missing the email or name. LinkedIn always needs this; Google
    // and Microsoft never do.
    identity = await resolveIdentity({
      provider,
      claims,
      accessToken: tokens?.access_token,
    });
  } catch (err) {
    // Covers a reused code, a failed signature, a clock too far out, and a
    // provider outage alike. The visitor can only do one thing about any of
    // them, so they all read the same.
    console.error('[auth-callback] %s sign-in failed: %s', provider.id, err.message);
    return back('provider');
  }

  if (!identity.subject) {
    console.error('[auth-callback] %s returned no subject claim', provider.id);
    return back('provider');
  }
  // LinkedIn can omit the email when the member never granted the scope, and a
  // sign-in with no address is useless to a product whose lead IS the address.
  if (!identity.email) return back('no_email');

  // The account-linking gate. An unverified address must never reach the
  // find-by-email branch — see the nOAuth note in _lib/oidc.js. Checked here as
  // well as in SQL because two cheap checks are worth one silent hijack.
  if (!identity.emailVerified) return back('email_unverified');

  // Minted here, never accepted from anywhere else. Only its hash is stored.
  const token = randomToken();

  let result;
  try {
    result = await blueAuthStore()('oauth_login', {
      provider: provider.id,
      subject: identity.subject,
      email: identity.email,
      emailVerified: identity.emailVerified,
      name: identity.name,
      tokenHash: hashToken(token),
    });
  } catch (err) {
    console.error('[auth-callback] oauthLogin failed:', err.message);
    return back('unavailable');
  }

  setSessionCookie(res, token, SESSION_MAX_AGE);

  // No ?e= — the page's mount request reads the cookie and takes it from here.
  return back();
}
