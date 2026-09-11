// One event funnel.
//
// Every CTA on the site calls trackEvent(), which forwards to the Meta pixel so
// conversion optimisation has something real to bid on. Keep the mapping HERE —
// scattering fbq() calls through components is how event names drift.
//
// A Plausible branch used to sit alongside it. No Plausible script is loaded
// anywhere in this project, so it never fired; it has been removed rather than
// left looking like a live second destination.
//
// The pixel id is NOT duplicated here. It lives in index.html, which is where
// fbq('init') runs and is the only place that can own it — a copy in this module
// could only ever disagree.
//
// No-ops during SSG (no window) and when the script is blocked or absent.

/** trackEvent name → Meta event. `custom` events go through trackCustom, which
 *  is what Meta requires for anything outside its standard vocabulary. */
const META_EVENTS = {
  // Primary conversion — the playbook form is the only place we capture an
  // email. It now renders in two places, the exit-intent popup and /playbook,
  // but it is one component firing one event; which surface it came from is
  // carried by `sourceCta` into the CRM sheet, not by a second event name.
  PlaybookSubmit:  { name: 'Lead' },
  // Handing off to a human. WhatsApp is the main route; email and the chat
  // handoff are the same intent arriving by a different door.
  WhatsAppClick:   { name: 'Contact' },
  EmailClick:      { name: 'Contact' },
  ChatHandoff:     { name: 'Contact' },
  // Booking a call on the Google calendar.
  HeroCallClick:   { name: 'Schedule' },
  AboutCallClick:  { name: 'Schedule' },
  // Engagement signals, not conversions — kept custom so they can never be
  // mistaken for one in Ads Manager.
  ChatOpen:        { name: 'ChatOpened', custom: true },
  ChatMessageSent: { name: 'ChatEngaged', custom: true },
};

function metaEventFor(name, props) {
  // The sticky bar may grow other actions; only the booking one is a Schedule.
  if (name === 'StickyCTAClick') {
    return props?.action === 'book-call' ? { name: 'Schedule' } : null;
  }
  return META_EVENTS[name] || null;
}

/** Per-event id so a future Conversions API feed can dedup against the browser
 *  pixel without re-instrumenting anything. */
function eventId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const trackEvent = (name, props) => {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;

  const meta = metaEventFor(name, props);
  if (!meta) return;

  window.fbq(
    meta.custom ? 'trackCustom' : 'track',
    meta.name,
    props || {},
    { eventID: eventId() },
  );
};
