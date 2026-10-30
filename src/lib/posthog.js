// PostHog product analytics (Ahmed, 2026-10-27): public pages only, on the live site only.
// Owner, dashboard, setup, AI-connection and sign-in pages show customers' messages or account
// details, so nothing is captured there. Events go through the /ingest proxy in vercel.json.
// The one exception (2026-10-31): the website brief's anonymous funnel events (WIZARD_EVENTS), so the
// Paymob onboarding can be measured. On a private page PostHog then starts in a private mode with no
// page views, clicks, replays or storage, and anything outside the allowlist is still dropped.
//
// The project key is PostHog's public write-only key: it ships in every visitor's page by design.
const PROJECT_KEY = 'phc_Bu9sDwJmZshPaJopDmevk5zcTBfT8XeEa64aTUEXCb3Y';
const PUBLIC_HOSTS = new Set(['www.bznsflowai.com', 'bznsflowai.com']);
const PRIVATE_PATH = /^\/(?:en\/)?(?:owner|layla|catalyst|reviewer|mcp|signin)(?:\/|$)/;
// Same deferral as the Meta pixel: let rendering and hydration finish first.
const START_DELAY_MS = 3000;
const IDLE_TIMEOUT_MS = 2500;

export const isPrivatePath = pathname => PRIVATE_PATH.test(pathname);
export const isAnalyticsHost = hostname => PUBLIC_HOSTS.has(hostname);

/** The website brief's funnel: the only events a private page may send, with only these properties. */
export const WIZARD_EVENTS = Object.freeze(['website_brief_step', 'website_brief_payments_answer', 'website_brief_form_downloaded',
  'website_brief_document_added', 'website_brief_document_refused', 'website_brief_sent', 'website_brief_error']);
export const WIZARD_PROPS = Object.freeze(['step', 'index', 'answer', 'form', 'slot', 'reason', 'field', 'payments', 'documents', 'update']);
// Properties PostHog adds that could carry where someone came from or who they are.
const PRIVATE_DROP = ['$referrer', '$referring_domain', '$initial_referrer', '$initial_referring_domain', '$set', '$set_once', '$el_text', '$elements', '$elements_chain'];
const KEEP = new Set(['token', 'distinct_id']);
/** Any URL PostHog attaches ($current_url, $session_entry_url, …) loses its query and fragment: ids live there. */
const withoutQuery = value => {
  if (!/^https?:\/\//i.test(value)) return value;
  try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return ''; }
};

/**
 * What may leave a private page: an allowlisted wizard event with short plain values, the URL cut to its
 * path, and nothing that could identify the visitor. Anything else returns null and is not sent.
 */
export function privateEvent(event, location) {
  if (!event || !WIZARD_EVENTS.includes(event.event)) return null;
  const properties = {};
  for (const [key, value] of Object.entries(event.properties || {})) {
    if (PRIVATE_DROP.includes(key)) continue;
    if (key.startsWith('$') || KEEP.has(key)) { properties[key] = typeof value === 'string' ? withoutQuery(value) : value; continue; }
    const plain = typeof value === 'number' || typeof value === 'boolean' || (typeof value === 'string' && value.length <= 40);
    if (WIZARD_PROPS.includes(key) && plain) properties[key] = value;
  }
  properties.$current_url = `${location.origin}${location.pathname}`;
  if ('$pathname' in properties) properties.$pathname = location.pathname;
  const { $set, $set_once, ...rest } = event;
  return { ...rest, properties };
}

let client = null;
let starting = false;
let replayPaused = false;
const pending = [];

/**
 * Load PostHog after the page settles. Started from a private page (only ever for a wizard event), it runs
 * in private mode: memory-only, so no cookie or storage is set, and no page views, clicks or replays.
 */
function start({ privateMode = false } = {}) {
  starting = true;
  const load = () => import('posthog-js').then(({ default: posthog }) => {
    posthog.init(PROJECT_KEY, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: privateMode ? false : 'history_change',
      capture_pageleave: !privateMode,
      autocapture: !privateMode,
      person_profiles: 'identified_only',
      session_recording: { maskAllInputs: true },
      disable_surveys: true,
      ...(privateMode ? { persistence: 'memory', disable_session_recording: true } : {}),
      // On a private page only the wizard's allowlisted events leave, whatever raised them.
      before_send: event => (isPrivatePath(window.location.pathname) ? privateEvent(event, window.location) : event),
    });
    client = posthog;
    followPage(window.location.pathname);
    for (const [name, props] of pending.splice(0)) client.capture(name, props);
  }).catch(() => { starting = false; });
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS }) : load()), privateMode ? 0 : START_DELAY_MS);
}

/** Called on every route change: starts PostHog on the first public page and pauses replay on private ones. */
export function followPage(pathname) {
  if (typeof window === 'undefined' || !isAnalyticsHost(window.location.hostname)) return;
  const hidden = isPrivatePath(pathname);
  if (!client) {
    if (!starting && !hidden) start();
    return;
  }
  if (hidden && !replayPaused) { client.stopSessionRecording(); replayPaused = true; }
  else if (!hidden && replayPaused) { client.startSessionRecording(); replayPaused = false; }
}

/** A named site event (CTA clicks, chat, playbook). Dropped until PostHog has started. */
export function captureEvent(name, props) {
  client?.capture(name, props);
}

/**
 * One step of the website brief's funnel (WIZARD_EVENTS). Unlike captureEvent it may start PostHog, in
 * private mode on the dashboard, and is held until PostHog has loaded. Never pass names, numbers or files.
 */
export function captureWizardEvent(name, props = {}) {
  if (typeof window === 'undefined' || !isAnalyticsHost(window.location.hostname) || !WIZARD_EVENTS.includes(name)) return;
  if (client) { client.capture(name, props); return; }
  if (pending.length < 50) pending.push([name, props]);
  if (!starting) start({ privateMode: isPrivatePath(window.location.pathname) });
}
