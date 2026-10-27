// PostHog product analytics (Ahmed, 2026-10-27): public pages only, on the live site only.
// Owner, dashboard, setup, AI-connection and sign-in pages show customers' messages or account
// details, so nothing is captured there. Events go through the /ingest proxy in vercel.json.
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

let client = null;
let starting = false;
let replayPaused = false;

function start() {
  starting = true;
  const load = () => import('posthog-js').then(({ default: posthog }) => {
    posthog.init(PROJECT_KEY, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      person_profiles: 'identified_only',
      session_recording: { maskAllInputs: true },
      disable_surveys: true,
      // Anything raised while a private page is open is dropped, whatever raised it.
      before_send: event => (isPrivatePath(window.location.pathname) ? null : event),
    });
    client = posthog;
    followPage(window.location.pathname);
  }).catch(() => { starting = false; });
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS }) : load()), START_DELAY_MS);
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
