import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 50;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * State for the AI-team orbit carousel: which card is active, the 5s autoplay
 * timer, and drag-to-advance.
 *
 * Autoplay is deliberately easy to stop — WCAG 2.2.2 requires moving content to
 * be pausable, so the timer suspends whenever the visitor is plausibly reading:
 * pointer over the section, focus inside it, section scrolled out of view, tab
 * hidden, or the OS asking for reduced motion (in which case it never starts).
 *
 * @param {number} count  number of cards in the ring
 * @param {{ interval?: number, isRtl?: boolean }} options
 */
export function useOrbitCarousel(count, { interval = AUTOPLAY_MS, isRtl = false } = {}) {
  const [active, setActive] = useState(0);
  // Autoplay only ever *starts* after mount, so the prerendered HTML and the
  // first client render agree on `active = 0`.
  const [isPlaying, setIsPlaying] = useState(false);
  // Becomes true on the first manual input; the live region stays quiet until
  // then so autoplay doesn't narrate a card every 5 seconds.
  const [hasInteracted, setHasInteracted] = useState(false);

  const sectionRef = useRef(null);
  // Drag surface: the `.orbit` wrapper, not the stage. Cards sit at negative Z
  // inside the 3D context, so the flat stage would otherwise swallow every
  // pointer before it reached a card.
  const dragRef = useRef(null);
  // Each reason autoplay might be suspended, tracked separately so one
  // resuming (say, the pointer leaving) can't override another still holding.
  const blockers = useRef({ hover: false, focus: false, offscreen: true, hidden: false });

  const step = useCallback(
    (delta) => {
      if (count <= 0) return;
      setActive((i) => (i + delta + count) % count);
    },
    [count],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const goTo = useCallback(
    (i) => {
      if (count <= 0) return;
      setActive(((i % count) + count) % count);
    },
    [count],
  );

  const syncPlaying = useCallback(() => {
    const { hover, focus, offscreen, hidden } = blockers.current;
    setIsPlaying(!(hover || focus || offscreen || hidden) && !prefersReducedMotion());
  }, []);

  // Any manual input re-evaluates playback rather than forcing it back on — a
  // visitor clicking a card is usually still hovering it, and resuming the
  // timer under their cursor is the exact thing the blockers exist to stop.
  // The timer itself restarts because `active` is a dependency of its effect.
  const markInteraction = useCallback(() => {
    setHasInteracted(true);
    syncPlaying();
  }, [syncPlaying]);

  // Pause triggers: pointer, focus, viewport, tab visibility.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const set = (key, value) => {
      blockers.current[key] = value;
      syncPlaying();
    };

    const onEnter = () => set('hover', true);
    const onLeave = () => set('hover', false);
    const onFocusIn = () => set('focus', true);
    const onFocusOut = () => set('focus', false);
    const onVisibility = () => set('hidden', document.hidden);

    section.addEventListener('pointerenter', onEnter);
    section.addEventListener('pointerleave', onLeave);
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);

    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => set('offscreen', !entry.isIntersecting),
        { threshold: 0.2 },
      );
      io.observe(section);
    } else {
      set('offscreen', false);
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', syncPlaying);

    return () => {
      section.removeEventListener('pointerenter', onEnter);
      section.removeEventListener('pointerleave', onLeave);
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', syncPlaying);
      io?.disconnect();
    };
  }, [syncPlaying]);

  // The timer itself. Re-created on every `active` change so a manual jump
  // gives the new card a full interval before it advances.
  useEffect(() => {
    if (!isPlaying || count <= 1) return undefined;
    const id = setInterval(() => step(1), interval);
    return () => clearInterval(id);
  }, [isPlaying, interval, count, step, active]);

  // Drag / swipe to advance.
  useEffect(() => {
    const stage = dragRef.current;
    if (!stage || count <= 1) return undefined;

    let startX = null;
    let didDrag = false;

    const onDown = (e) => {
      startX = e.clientX;
    };

    // Release is watched on the window rather than captured on the element:
    // `setPointerCapture` would retarget the follow-up click to the drag
    // surface, so clicking a card would never reach that card's handler.
    const onUp = (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      didDrag = true;
      // Dragging left advances in LTR; the orbit is mirrored in RTL, so the
      // gesture mirrors with it.
      const forward = isRtl ? dx > 0 : dx < 0;
      step(forward ? 1 : -1);
      markInteraction();
    };

    const onCancel = () => { startX = null; };

    // A drag that ends over a card would otherwise also fire that card's
    // click and fight the swipe for control of the index.
    const onClickCapture = (e) => {
      if (!didDrag) return;
      didDrag = false;
      e.stopPropagation();
      e.preventDefault();
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    stage.addEventListener('click', onClickCapture, true);

    return () => {
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      stage.removeEventListener('click', onClickCapture, true);
    };
  }, [count, isRtl, step, markInteraction]);

  return { active, goTo, next, prev, isPlaying, hasInteracted, markInteraction, sectionRef, dragRef };
}

/**
 * Signed shortest distance from `index` to `active` around a ring of `count`,
 * so a card two places "before" the active one reads as -2 rather than count-2.
 */
export function ringOffset(index, active, count) {
  const raw = index - active;
  const half = Math.floor(count / 2);
  if (raw > half) return raw - count;
  if (raw < -half) return raw + count;
  return raw;
}
