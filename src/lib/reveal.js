/**
 * The site's single scroll-reveal primitive.
 *
 * Elements opt in with `data-reveal`; CSS hides them only under
 * `html.js-reveal` (set by the pre-paint gate script in index.html),
 * so prerendered HTML and no-JS visitors always see full content.
 * Directional variants are pure CSS via `data-reveal-dir`.
 */

const STAGGER_MS = 60;
const VIEWPORT = { rootMargin: '0px 0px -10% 0px', threshold: 0.1 };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function show(el) {
  el.classList.add('is-visible');
}

/**
 * Observe all `[data-reveal]` elements and reveal them on first
 * viewport entry, staggering siblings that enter together.
 * @returns {() => void} cleanup
 */
export function initReveals(root = document) {
  const els = Array.from(root.querySelectorAll('[data-reveal]:not(.is-visible)'));
  if (els.length === 0) return () => {};

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach(show);
    return () => {};
  }

  const io = new IntersectionObserver((entries) => {
    const entering = entries.filter((e) => e.isIntersecting);
    entering.forEach(({ target }, i) => {
      target.style.transitionDelay = `${i * STAGGER_MS}ms`;
      target.addEventListener(
        'transitionend',
        () => { target.style.transitionDelay = ''; },
        { once: true }
      );
      show(target);
      io.unobserve(target);
    });
  }, VIEWPORT);

  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Run `cb` once, the first time `el` enters the viewport.
 * Fires immediately under reduced motion or without IO support.
 * @returns {() => void} cleanup
 */
export function onEnterOnce(el, cb) {
  if (!el) return () => {};

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    cb();
    return () => {};
  }

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      cb();
    }
  }, VIEWPORT);

  io.observe(el);
  return () => io.disconnect();
}
