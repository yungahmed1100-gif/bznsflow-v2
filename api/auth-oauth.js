// /api/auth-oauth — start a social sign-in.
//
//   GET /api/auth-oauth?provider=google&lang=ar
//
// Generates the one-time values, stashes them in the bf_oauth cookie, and sends
// the browser to the provider. Everything interesting happens on the way back,
// in api/auth-callback.js.
//
// Reached by a plain link in the page, so it must work as a top-level GET
// navigation with no JavaScript — which is also why there is no CSRF check
// here. There is no Origin header on a link click, and there is nothing to
// protect: this endpoint writes one short-lived cookie and redirects. The
// forgery defence is the `state` value it mints, checked on return.
//
// Every failure path redirects back to the sign-in page with ?e=<reason>
// instead of rendering an error. The visitor came from that page and there is
// nothing useful to show them anywhere else.

import {
  providerFor, isConfigured, buildAuthorizeUrl, pkceChallenge,
  redirectUriFor, signinPath,
} from './_lib/oidc.js';
import { randomToken, setOauthCookie } from './_lib/cookies.js';
import { send, redirect } from './_lib/http.js';

export default async function handler(req, res) {
  if (String(req.method || '').toUpperCase() !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false, reason: 'method' });
  }

  const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const provider = providerFor(url.searchParams.get('provider'));

  // Unknown provider, or one whose secrets were never set. The page only
  // renders buttons for configured providers, so reaching this means a
  // hand-typed URL or a half-finished deployment.
  if (!provider || !isConfigured(provider)) {
    return redirect(res, `${signinPath(lang)}?e=provider`);
  }

  // Three independent 256-bit values, each doing a different job:
  //   state    — ties the callback to this browser (login-CSRF defence)
  //   nonce    — ties the ID token to this request (replay defence)
  //   verifier — PKCE; proves the code is being redeemed by whoever asked for it
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();

  let target;
  try {
    target = buildAuthorizeUrl({
      provider,
      state,
      nonce,
      challenge: pkceChallenge(verifier),
      redirectUri: redirectUriFor(req),
    });
  } catch (err) {
    // Missing SITE_URL or credentials. Configuration, not visitor error.
    console.error('[auth-oauth] cannot build authorize URL:', err.message);
    return redirect(res, `${signinPath(lang)}?e=unavailable`);
  }

  setOauthCookie(res, { p: provider.id, s: state, n: nonce, v: verifier, l: lang });
  return redirect(res, target);
}
