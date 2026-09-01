import { useEffect, useState, useCallback } from 'react';

// Decides WHEN the playbook prompt appears. Two different signals, because
// "about to leave" is not one behaviour:
//
//   Desktop — the cursor exits through the top of the viewport, toward the tab
//             bar or the URL. This is real exit intent.
//   Touch   — there is no such signal: no hover, no mouseleave. Waiting for one
//             would mean the prompt never appears on mobile, and the ads run on
//             Stories and Reels, which is effectively all mobile. So engagement
//             stands in for intent: scrolled far enough AND stayed long enough.
//
// Visitors arriving from an ad (fbclid) already declared intent by clicking, so
// they clear a lower bar. Making them earn the prompt the way a cold organic
// visitor does is the most likely way this design quietly loses conversions.

const SEEN_KEY = 'bf_playbook_seen';

const ORGANIC = { scroll: 0.55, dwellMs: 20000 };
const FROM_AD = { scroll: 0.30, dwellMs: 8000 };

/** localStorage throws outright in some privacy modes — never let that break the page. */
function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* nothing to do — the prompt simply re-arms next visit */
  }
}

function scrolledFraction() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 1; // short page: treat as fully read
  return window.scrollY / scrollable;
}

/**
 * @param {{ suppressed?: boolean }} options
 *   suppressed — another surface owns the screen (chat panel, mobile menu).
 *   Arming behind it would stack two dialogs on top of each other.
 * @returns {{ armed: boolean, dismiss: () => void }}
 */
export function useExitIntent({ suppressed = false } = {}) {
  const [armed, setArmed] = useState(false);

  const dismiss = useCallback(() => {
    setArmed(false);
    markSeen();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined; // SSG
    if (alreadySeen()) return undefined;

    const fromAd = /[?&]fbclid=/.test(window.location.search);
    const { scroll: scrollGate, dwellMs } = fromAd ? FROM_AD : ORGANIC;

    const startedAt = Date.now();
    let done = false;

    const fire = () => {
      if (done) return;
      done = true;
      window.clearInterval(poll);
      setArmed(true);
    };

    // Desktop: leaving through the top edge.
    const onMouseOut = (e) => {
      if (e.clientY <= 0 && !e.relatedTarget) fire();
    };

    // Touch: engagement stands in for intent — scrolled far enough AND stayed
    // long enough.
    const qualifies = () =>
      Date.now() - startedAt >= dwellMs && scrolledFraction() >= scrollGate;

    const check = () => { if (qualifies()) fire(); };

    // Deliberately BOTH a scroll listener and a poll. The listener responds
    // immediately; the poll is the safety net, because "dwell elapsed while
    // already scrolled down" produces no further scroll event to react to, and
    // browsers suppress scroll events entirely in a backgrounded tab. Relying on
    // the event alone silently loses that visitor — and this prompt is the only
    // thing on the site that fires the Lead event the ad campaign bids against.
    const poll = window.setInterval(check, 1000);

    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', check, { passive: true });

    return () => {
      window.clearInterval(poll);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', check);
    };
  }, []);

  return { armed: armed && !suppressed, dismiss };
}
