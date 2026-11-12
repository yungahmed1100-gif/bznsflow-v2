// Social sign-in reason codes (?e= after a redirect from api/auth-oauth.js or
// api/auth-callback.js) mapped to translation keys in src/i18n/{ar,en}.js.
// Kept apart from SignIn's messageFor(): those are JSON reason codes from a fetch,
// these arrive in the URL after a full page navigation, and the two vocabularies
// only look alike — `expired` means a stale OAuth attempt here and a stale OTP there.
export const OAUTH_ERRORS = Object.freeze({
  cancelled: 'auth_err_cancelled',
  provider: 'auth_err_provider',
  state: 'auth_err_state',
  expired: 'auth_err_expired_oauth',
  no_email: 'auth_err_no_email',
  email_unverified: 'auth_err_email_unverified',
  rate: 'auth_err_rate',
  unavailable: 'auth_err_unavailable',
});
