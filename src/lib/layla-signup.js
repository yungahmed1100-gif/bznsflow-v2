// Meta's SDK can default to FedCM through app configuration. That path does
// not support Login for Business config_id/code responses (verified 2026-09-12).
export function signupInit(prepared) {
  return {appId:prepared.appId,autoLogAppEvents:false,xfbml:false,version:prepared.version,fedCM:false};
}

// Embedded Signup v4 takes its version and products from the Facebook Login for
// Business configuration; Meta documents `extras` as purposely empty. Sending
// `version: 'v4'` (not a valid extras value) or v2/v3-era keys made Meta reject
// the flow as an invalid WhatsApp feature (diagnosed 2026-10-01).
export function signupOptions(prepared) {
  const setup = signupSetup(prepared);
  const extras = {
    ...(Object.keys(setup).length ? { setup } : {}),
    ...(prepared.path === 'coexistence' ? { featureType: 'whatsapp_business_app_onboarding' } : {}),
    ...legacyVersion(prepared),
  };
  return { config_id: prepared.configId, response_type: 'code', override_default_response_type: true, extras };
}

// Only an explicit server-side fallback (BLUE_SIGNUP_VERSION_EXISTING) opts the
// existing-API path back into a retiring v2/v3 flow; everything else follows v4.
const LEGACY_VERSIONS = ['v2', 'v3'];
function legacyVersion({ path, esVersion }) {
  return path === 'existing_cloud' && LEGACY_VERSIONS.includes(esVersion) ? { version: esVersion, sessionInfoVersion: '3' } : {};
}

// Pre-filling the owner's portfolio and WABA opens the flow on the right assets.
// Coexistence keeps Meta's own WhatsApp Business app screens.
function signupSetup({ path, preselect }) {
  if (path === 'coexistence' || !preselect) return {};
  return { ...(preselect.business ? { business: { id: preselect.business } } : {}), ...(preselect.waba ? { whatsAppBusinessAccount: { ids: [preselect.waba] } } : {}) };
}

function facebookOrigin(origin) {
  try { const u = new URL(origin); return u.protocol === 'https:' && !u.port && (u.hostname === 'facebook.com' || u.hostname.endsWith('.facebook.com')); }
  catch { return false; }
}

export function signupEvent(event, path) {
  // Meta's sample accepts any facebook.com origin: flows such as Business App onboarding
  // finish on Meta subdomains. HTTPS only; the caller also requires the captured popup.
  if (!facebookOrigin(event.origin)) return null;
  let payload;
  try { payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return null; }
  if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return null;
  if (['CANCEL', 'ERROR'].includes(payload.event)) return { cancelled: true, ...signupFailure(payload.data) };
  // Any finish counts (FINISH, FINISH_ONLY_WABA, FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING, …): Meta's event name
  // varies with what the owner picked, and dropping one left the page waiting forever (2026-10-24). The server
  // decides whether the number fits the path (is_on_biz_app) and lists numbers when no phone is given.
  if (typeof payload.event !== 'string' || !payload.event.startsWith('FINISH') || !/^\d{1,30}$/.test(payload.data?.waba_id || '')
    || (payload.data?.phone_number_id && !/^\d{1,30}$/.test(payload.data.phone_number_id))) return null;
  // The event name goes to the server only as evidence for the record; it never decides the path.
  const finish = /^FINISH[A-Z_]{0,60}$/.test(payload.event) ? payload.event : 'FINISH';
  return { event: finish, assets: { waba: payload.data.waba_id, ...(payload.data.phone_number_id ? { phone: payload.data.phone_number_id } : {}) } };
}

// Session logging reports Meta errors on CANCEL/ERROR with error_message and
// error_id; an abandoned flow reports only current_step. The raw message stays
// in the browser: only a known reason and a numeric reference are surfaced.
function signupFailure(data) {
  const message = typeof data?.error_message === 'string' ? data.error_message : '';
  const reference = [data?.error_id, data?.error_code].map(v => String(v ?? '')).find(v => /^\d{1,30}$/.test(v));
  if (!message) return { reason: 'meta_cancelled' };
  const reason = /feature/i.test(message) && /invalid|not (?:available|supported)/i.test(message) ? 'meta_feature_invalid'
    : /version|update/i.test(message) && /app/i.test(message) ? 'whatsapp_app_update_required'
      : /personal|messenger|not.*business app|consumer/i.test(message) ? 'whatsapp_not_business_app' : 'meta_error';
  return { reason, ...(reference ? { reference } : {}) };
}

// One coordinator belongs to one popup attempt. Both SDK callback orders are supported. Meta's message
// may come from another facebook.com window (a phone-only flow finishes in a new tab), so the origin, the
// one pending attempt and the server's state hash guard it, not the popup handle. If the code arrives and
// the message never does, the code goes alone after a short wait; the server reads the WABA from the token.
export const ASSETS_WAIT_MS = 4000;
export function createSignupAttempt({ prepared, complete, failed, onCode, now = Date.now, wait = setTimeout, clear = clearTimeout }) {
  let popup, code, assets, finishEvent, settled = false, timer;
  const fail = (reason, reference) => { if (settled) return; settled = true; clear(timer); code = undefined; assets = undefined; failed(reason, reference); };
  const send = () => {
    settled = true; clear(timer);
    const body = {action:'finish',attempt:prepared.attempt,state:prepared.state,code,...(assets || {}),...(finishEvent ? {event:finishEvent} : {})};
    code = undefined; assets = undefined;
    Promise.resolve().then(() => complete(body)).catch(() => failed('review_backend_unavailable')).finally(() => { delete body.code; });
  };
  const finish = () => {
    if (settled) return;
    if (now() >= prepared.expiresAt) return fail('attempt_expired');
    if (!code) return;
    if (assets) return send();
    clear(timer);
    timer = wait(() => { if (!settled && code) send(); }, ASSETS_WAIT_MS);
  };
  return {
    capture(value) { popup = value; if (!popup) fail('popup_blocked'); },
    callback(response) {
      if (settled) return;
      if (typeof response?.authResponse?.code !== 'string' || !response.authResponse.code) return fail(response?.status === 'not_authorized' ? 'permission_rejected' : 'missing_code');
      code = response.authResponse.code; onCode?.(); finish();
    },
    message(event) {
      if (settled || !popup) return;
      const result = signupEvent(event,prepared.path);
      if (!result) return;
      if (result.cancelled) return fail(result.reason || 'meta_cancelled', result.reference);
      assets = result.assets; finishEvent = result.event; finish();
    },
    cancel: fail,
    dispose() { settled = true; clear(timer); code = undefined; assets = undefined; popup = undefined; },
  };
}
