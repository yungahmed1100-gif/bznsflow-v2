// One event funnel, two destinations.
//
// Every CTA on the site calls trackEvent(). It fans out to Plausible (as it
// always has) and to the Meta pixel, so conversion optimisation has something
// real to bid on. Keep the fan-out HERE — scattering fbq() calls through
// components is how the two destinations drift out of sync.
//
// Both destinations are optional at runtime: no-op during SSG (no window) and
// no-op when a script is blocked or absent.

const PIXEL_ID = '4379647862316554';

/** trackEvent name → Meta event. `custom` events go through trackCustom, which
 *  is what Meta requires for anything outside its standard vocabulary. */
const META_EVENTS = {
  // Primary conversion — the playbook form is the only place we capture an email.
  PlaybookSubmit:  { name: 'Lead' },
  // Handing off to a human. WhatsApp is the main route; email and the chat
  // handoff are the same intent arriving by a different door.
  WhatsAppClick:   { name: 'Contact' },
  EmailClick:      { name: 'Contact' },
  ChatHandoff:     { name: 'Contact' },
  // Booking a call on the Google calendar.
  HeroCallClick:   { name: 'Schedule' },
  AboutCallClick:  { name: 'Schedule' },
  FinalCallClick:  { name: 'Schedule' },
  // Engagement signal, not a conversion — kept custom so it can never be
  // mistaken for one in Ads Manager.
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

  if (typeof window.plausible === 'function') {
    window.plausible(name, props ? { props } : undefined);
  }

  if (typeof window.fbq === 'function') {
    const meta = metaEventFor(name, props);
    if (meta) {
      window.fbq(
        meta.custom ? 'trackCustom' : 'track',
        meta.name,
        props || {},
        { eventID: eventId() },
      );
    }
  }
};

export { PIXEL_ID };
