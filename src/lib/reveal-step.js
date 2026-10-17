// Brings the step the owner just moved to into view and gives it focus, so every click in sign-up
// and setup visibly lands somewhere. Smooth scrolling is skipped for reduced motion: CSS
// scroll-behavior cannot override an explicit behavior passed here.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** @param {HTMLElement | null | undefined} el */
export function revealStep(el) {
  if (!el) return;
  el.scrollIntoView?.({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  el.focus?.({ preventScroll: true });
}
